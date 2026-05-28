'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Share2, X, Copy, Check, Mail, ChevronDown, Loader2,
  Link2, Trash2, UserPlus, Globe, Clock, Crown, AlertCircle,
  Eye, MessageSquare, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  getWorkflowShares,
  inviteToWorkflow,
  updateShareRole,
  removeShare,
  createShareLink,
  revokeShareLink,
  type WorkflowShareRecord,
  type ShareRole,
} from '@/actions/sharing.actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: ShareRole; label: string; icon: typeof Eye; description: string }[] = [
  { value: 'editor', label: 'Editor', icon: Pencil, description: 'Can view and edit the workflow' },
  { value: 'commenter', label: 'Commenter', icon: MessageSquare, description: 'Can view and add comments' },
  { value: 'viewer', label: 'Viewer', icon: Eye, description: 'Can view the workflow only' },
];

const EXPIRY_OPTIONS = [
  { label: 'Never expires', days: undefined },
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

function RolePicker({
  value,
  onChange,
  disabled,
  size = 'default',
}: {
  value: ShareRole;
  onChange: (r: ShareRole) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}) {
  const current = ROLE_OPTIONS.find((o) => o.value === value) || ROLE_OPTIONS[2];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-white/8',
          'bg-white/4 hover:bg-white/8 text-zinc-300 transition-colors',
          'focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="font-medium">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-zinc-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border border-white/8 rounded-xl shadow-2xl w-52 p-1">
        {ROLE_OPTIONS.map((opt) => {
          const OptIcon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 cursor-pointer',
                value === opt.value ? 'bg-accent/10 text-accent' : 'hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-2">
                <OptIcon className="w-3.5 h-3.5" />
                <span className="font-semibold text-xs">{opt.label}</span>
              </div>
              <span className="text-[10px] text-zinc-500 pl-5">{opt.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : email[0].toUpperCase();

  const colors = [
    'bg-purple-500', 'bg-sky-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-indigo-500',
  ];
  const colorIdx = email.charCodeAt(0) % colors.length;

  return (
    <div className={cn(
      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
      'text-white text-xs font-bold shadow-sm',
      colors[colorIdx]
    )}>
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ShareDialogProps {
  workflowId: string;
  workspaceId: string;
  workflowName: string;
  userRole: string;
  canShareLinks: boolean;
  onClose: () => void;
}

export function ShareDialog({
  workflowId,
  workspaceId,
  workflowName,
  userRole,
  canShareLinks,
  onClose,
}: ShareDialogProps) {
  const canManage = ['owner', 'admin'].includes(userRole);

  const [shares, setShares] = useState<WorkflowShareRecord[]>([]);
  const [loadingShares, setLoadingShares] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ShareRole>('editor');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [publicLink, setPublicLink] = useState<WorkflowShareRecord | null>(null);
  const [linkRole, setLinkRole] = useState<'commenter' | 'viewer'>('viewer');
  const [linkExpiry, setLinkExpiry] = useState<number | undefined>(undefined);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getWorkflowShares(workflowId).then((result) => {
      if (cancelled) return;
      setShares(result.filter((s) => s.user_id !== null));
      const link = result.find((s) => s.user_id === null && s.share_token);
      setPublicLink(link || null);
      setLoadingShares(false);
    });
    return () => { cancelled = true; };
  }, [workflowId]);

  // Reload helper (non-effect calls)
  const loadShares = useCallback(async () => {
    setLoadingShares(true);
    const result = await getWorkflowShares(workflowId);
    setShares(result.filter((s) => s.user_id !== null));
    const link = result.find((s) => s.user_id === null && s.share_token);
    setPublicLink(link || null);
    setLoadingShares(false);
  }, [workflowId]);

  // Invite handler
  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviteError('');
    setInviteSuccess('');

    startTransition(async () => {
      const result = await inviteToWorkflow(workflowId, workspaceId, inviteEmail.trim(), inviteRole);
      if (result.error) {
        setInviteError(result.error);
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
        setInviteEmail('');
        await loadShares();
        setTimeout(() => setInviteSuccess(''), 3000);
      }
    });
  }, [inviteEmail, inviteRole, workflowId, workspaceId, loadShares]);

  // Update role
  const handleRoleChange = useCallback(async (shareId: string, newRole: ShareRole) => {
    startTransition(async () => {
      await updateShareRole(shareId, workspaceId, newRole);
      await loadShares();
    });
  }, [workspaceId, loadShares]);

  // Remove share
  const handleRemove = useCallback(async (shareId: string) => {
    startTransition(async () => {
      await removeShare(shareId, workspaceId);
      await loadShares();
    });
  }, [workspaceId, loadShares]);

  // Generate public link
  const handleGenerateLink = useCallback(async () => {
    setGeneratingLink(true);
    setLinkError('');
    const result = await createShareLink(workflowId, workspaceId, linkRole, linkExpiry);
    if (result.error === 'PLAN_REQUIRED') {
      setLinkError('Share links require the Warrior plan or higher. Upgrade to enable.');
    } else if (result.error) {
      setLinkError(result.error);
    } else {
      await loadShares();
    }
    setGeneratingLink(false);
  }, [workflowId, workspaceId, linkRole, linkExpiry, loadShares]);

  // Copy link
  const handleCopyLink = useCallback(async () => {
    if (!publicLink?.share_token) return;
    const url = `${window.location.origin}/en/share/${publicLink.share_token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicLink]);

  // Revoke link
  const handleRevokeLink = useCallback(async () => {
    if (!publicLink) return;
    const confirmed = window.confirm('Revoke the public share link? Anyone with the current link will lose access.');
    if (!confirmed) return;
    startTransition(async () => {
      await revokeShareLink(publicLink.id, workspaceId);
      setPublicLink(null);
      await loadShares();
    });
  }, [publicLink, workspaceId, loadShares]);

  const publicLinkUrl = publicLink?.share_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/en/share/${publicLink.share_token}`
    : '';

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-zinc-950 border border-white/8 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/6 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-zinc-100">Share Workflow</h2>
            <p className="text-xs text-zinc-500 truncate">{workflowName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Invite Section ── */}
          {canManage && (
            <div className="px-6 py-4 border-b border-white/6">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5" />
                Invite People
              </label>

              <div className="flex gap-2 mt-2">
                <Input
                  type="email"
                  placeholder="Enter email address..."
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  disabled={isPending}
                  className="flex-1 h-9 text-sm bg-white/4 border-white/8 rounded-xl text-zinc-300 placeholder:text-zinc-600 focus:ring-1 focus:ring-sky-500/40"
                />
                <RolePicker value={inviteRole} onChange={setInviteRole} disabled={isPending} size="sm" />
                <Button
                  size="sm"
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || isPending}
                  className="h-9 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold text-xs cursor-pointer shrink-0 gap-1.5"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Send
                </Button>
              </div>

              {inviteError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  {inviteSuccess}
                </p>
              )}
            </div>
          )}

          {/* ── Current Collaborators ── */}
          <div className="px-6 py-4 border-b border-white/6">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5" />
              Shared With
              {shares.length > 0 && (
                <span className="ml-auto bg-white/8 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  {shares.length}
                </span>
              )}
            </label>

            {loadingShares ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-xs text-zinc-600 py-2 text-center">No collaborators yet — invite someone above.</p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center gap-3 py-1.5">
                    <Avatar
                      name={share.profiles?.full_name || null}
                      email={share.profiles?.email || 'U'}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">
                        {share.profiles?.full_name || share.profiles?.email || 'Unknown'}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{share.profiles?.email}</p>
                    </div>
                    {canManage ? (
                      <>
                        <RolePicker
                          value={share.role as ShareRole}
                          onChange={(newRole) => handleRoleChange(share.id, newRole)}
                          disabled={isPending}
                          size="sm"
                        />
                        <button
                          onClick={() => handleRemove(share.id)}
                          disabled={isPending}
                          className="w-7 h-7 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-500 capitalize">{share.role}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Public Link Section ── */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Share Link
              </label>
              {!canShareLinks && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" />
                  Warrior+
                </span>
              )}
            </div>

            {!canShareLinks ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-center">
                <Crown className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-amber-300 mb-1">Upgrade to Share</p>
                <p className="text-[11px] text-zinc-500">Public share links are available on the Warrior plan and above.</p>
                <Link href="/billing" className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
                  View Plans →
                </Link>
              </div>
            ) : publicLink ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2 min-w-0">
                    <Link2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-xs text-zinc-400 truncate font-mono">{publicLinkUrl}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCopyLink}
                    className={cn(
                      'h-9 px-3 rounded-xl font-semibold text-xs cursor-pointer gap-1.5 shrink-0 transition-all',
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/8 hover:bg-white/12 text-zinc-300'
                    )}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-600">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Role: <span className="text-zinc-400 font-semibold capitalize ml-1">{publicLink.role}</span>
                  </span>
                  {publicLink.expires_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires: <span className="text-zinc-400 font-semibold ml-1">
                        {new Date(publicLink.expires_at).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                  {canManage && (
                    <button
                      onClick={handleRevokeLink}
                      disabled={isPending}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ) : canManage ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {/* Link role */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex-1 inline-flex items-center justify-between gap-1.5 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 px-3 py-2 text-xs text-zinc-300 transition-colors focus:outline-none">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="capitalize font-medium">{linkRole}</span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-zinc-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-zinc-900 border border-white/8 rounded-xl shadow-2xl w-40 p-1">
                      {(['viewer', 'commenter'] as const).map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onClick={() => setLinkRole(r)}
                          className={cn('rounded-lg px-3 py-1.5 text-xs cursor-pointer capitalize', linkRole === r ? 'bg-white/8 text-zinc-100' : 'hover:bg-white/5 text-zinc-400')}
                        >
                          {r}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Expiry */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex-1 inline-flex items-center justify-between gap-1.5 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 px-3 py-2 text-xs text-zinc-300 transition-colors focus:outline-none">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {EXPIRY_OPTIONS.find((o) => o.days === linkExpiry)?.label ?? 'Never expires'}
                        </span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-zinc-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border border-white/8 rounded-xl shadow-2xl w-44 p-1">
                      {EXPIRY_OPTIONS.map((opt) => (
                        <DropdownMenuItem
                          key={opt.label}
                          onClick={() => setLinkExpiry(opt.days)}
                          className={cn('rounded-lg px-3 py-1.5 text-xs cursor-pointer', linkExpiry === opt.days ? 'bg-white/8 text-zinc-100' : 'hover:bg-white/5 text-zinc-400')}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="sm"
                    onClick={handleGenerateLink}
                    disabled={generatingLink}
                    className="h-9 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold text-xs cursor-pointer shrink-0 gap-1.5"
                  >
                    {generatingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Generate
                  </Button>
                </div>
                {linkError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {linkError}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 py-2">No public link created yet.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/6 shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-zinc-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Links give access to all workflow content
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 px-4 rounded-xl text-xs border border-white/8 hover:bg-white/5 cursor-pointer"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
