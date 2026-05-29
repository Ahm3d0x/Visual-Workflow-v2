/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Shield, Trash2, Loader2, ChevronDown, Check, 
  Copy, Link2, UserPlus, Palette, Plus
} from 'lucide-react';
import { 
  updateWorkspaceCustomization, 
  createWorkspaceShareLink, 
  revokeWorkspaceShareLink 
} from '@/actions/workspace.actions';
import { createClient } from '@/lib/supabase/client';

interface Member {
  role: 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';
  joined_at: string;
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface WorkspaceSettingsProps {
  initialWorkspace: {
    id: string;
    name: string;
    owner_id: string;
    color: string | null;
    icon: string | null;
    banner: string | null;
    settings: any;
  };
  initialMembers: Member[];
  initialShareLinks: any[];
  currentUserRole: string;
  currentUserId: string;
  locale: string;
}

const COLOR_PRESETS = [
  { name: 'Sky Cyan', hex: '#0284c7', bg: 'bg-sky-500' },
  { name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Sunset Orange', hex: '#f97316', bg: 'bg-orange-500' },
  { name: 'Indigo Dream', hex: '#6366f1', bg: 'bg-indigo-500' },
  { name: 'Rose Red', hex: '#f43f5e', bg: 'bg-rose-500' },
  { name: 'Royal Gold', hex: '#eab308', bg: 'bg-yellow-500' },
];

const EMOJI_PRESETS = ['💼', '🚀', '🎨', '🤖', '📈', '🛠️', '🌐', '🔒', '👥', '⚡'];

const BANNER_PRESETS = [
  { name: 'Midnight Space', class: 'bg-gradient-to-r from-indigo-950 via-purple-950 to-zinc-950' },
  { name: 'Emerald Aurora', class: 'bg-gradient-to-r from-emerald-950 via-teal-950 to-zinc-950' },
  { name: 'Crimson Solar', class: 'bg-gradient-to-r from-rose-950 via-orange-950 to-zinc-950' },
  { name: 'Deep Sea Blue', class: 'bg-gradient-to-r from-blue-950 via-sky-950 to-zinc-950' },
  { name: 'Cyberpunk Neon', class: 'bg-gradient-to-r from-purple-950 via-rose-950 to-zinc-950' },
];

export function WorkspaceSettings({
  initialWorkspace,
  initialMembers,
  initialShareLinks,
  currentUserRole,
  currentUserId,
  locale,
}: WorkspaceSettingsProps) {
  const router = useRouter();
  const supabase = createClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<'customization' | 'people'>('customization');

  // Customization States
  const [wsName, setWsName] = useState(initialWorkspace.name);
  const [selectedColor, setSelectedColor] = useState(initialWorkspace.color || '#0284c7');
  const [selectedIcon, setSelectedIcon] = useState(initialWorkspace.icon || '💼');
  const [selectedBanner, setSelectedBanner] = useState(
    initialWorkspace.banner || 'bg-gradient-to-r from-indigo-950 via-purple-950 to-zinc-950'
  );
  const [customizationLoading, setCustomizationLoading] = useState(false);

  // Invite Link States
  const [linkTitle, setLinkTitle] = useState('');
  const [linkRole, setLinkRole] = useState<'admin' | 'editor' | 'commenter' | 'viewer'>('editor');
  const [links, setLinks] = useState<any[]>(initialShareLinks);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Members Management States
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [memberLoading, setMemberLoading] = useState<string | null>(null);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  // ─── Actions handlers ────────────────────────────────────────────────────────

  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;

    setCustomizationLoading(true);
    const res = await updateWorkspaceCustomization(
      initialWorkspace.id,
      wsName.trim(),
      selectedColor,
      selectedIcon,
      selectedBanner
    );
    setCustomizationLoading(false);

    if (res.error) {
      alert('Failed to update customization: ' + res.error);
    } else {
      alert('Workspace customization successfully updated!');
      router.refresh();
    }
  };

  const handleCreateInviteLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim()) return;

    setLinkLoading(true);
    const res = await createWorkspaceShareLink(
      initialWorkspace.id,
      linkTitle.trim(),
      linkRole
    );
    setLinkLoading(false);

    if (res.error) {
      if (res.error === 'PLAN_LIMIT_REACHED') {
        alert('Plan Limit Reached! Upgrade your plan to activate more invite links.');
      } else {
        alert('Failed to create invitation link: ' + res.error);
      }
    } else {
      alert('Workspace invitation link generated successfully!');
      setLinkTitle('');
      // Refetch links
      router.refresh();
      // Reload page data to get the updated share links array
      window.location.reload();
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Revoke this link? Anyone who tries to join using this token will be blocked.')) return;

    const res = await revokeWorkspaceShareLink(linkId, initialWorkspace.id);
    if (res.error) {
      alert('Failed to revoke: ' + res.error);
    } else {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      alert('Invitation link revoked.');
    }
  };

  const handleCopyLink = async (linkId: string, token: string) => {
    const url = `${window.location.origin}/${locale}/join/workspace/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleChangeRole = async (targetUserId: string, nextRole: any) => {
    setMemberLoading(targetUserId);
    const { error } = await (supabase
      .from('workspace_members') as any)
      .update({ role: nextRole })
      .eq('workspace_id', initialWorkspace.id)
      .eq('user_id', targetUserId);

    if (error) {
      alert('Failed to update role: ' + error.message);
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.profiles?.id === targetUserId ? { ...m, role: nextRole } : m))
      );
    }
    setMemberLoading(null);
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return;

    setMemberLoading(targetUserId);
    const { error } = await (supabase
      .from('workspace_members') as any)
      .delete()
      .eq('workspace_id', initialWorkspace.id)
      .eq('user_id', targetUserId);

    if (error) {
      alert('Failed to remove member: ' + error.message);
    } else {
      setMembers((prev) => prev.filter((m) => m.profiles?.id !== targetUserId));
      alert('Member removed successfully.');
    }
    setMemberLoading(null);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-primary/10 text-primary border-primary/20',
      admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      editor: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      commenter: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      viewer: 'bg-zinc-500/10 text-zinc-400 border-white/10',
    };
    return (
      <Badge variant="outline" className={`capitalize font-semibold text-xs rounded-md ${colors[role] || colors.viewer}`}>
        {role}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl">
      {/* ─── Premium Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold font-sans tracking-tight bg-clip-text bg-linear-to-r from-foreground to-foreground/80">
            Workspace Customization & Settings
          </h1>
          <p className="text-sm text-muted-foreground font-light mt-1">
            Configure visual descriptors, generate invite codes, and manage collaborator roles.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="bg-muted/80 p-1.5 rounded-2xl flex items-center border border-border shrink-0 self-start md:self-auto shadow-sm">
          <button
            onClick={() => setActiveTab('customization')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'customization'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Visual Branding</span>
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'people'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Members & Sharing</span>
          </button>
        </div>
      </div>

      {/* ─── Premium Live Preview Card ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 shadow-md">
        {/* Banner */}
        <div className={`h-36 ${selectedBanner} transition-all duration-500`} />
        
        {/* Gradient Blur Background Overlay */}
        <div className="absolute inset-0 bg-background/30 backdrop-blur-xs pointer-events-none" />

        {/* Card Content Overlay */}
        <div className="relative p-6 -mt-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4 min-w-0">
            {/* Custom Icon */}
            <div 
              className="w-20 h-20 rounded-3xl bg-background border-4 border-background flex items-center justify-center text-4xl shadow-xl transition-all duration-300 transform hover:scale-105"
              style={{ borderColor: selectedColor }}
            >
              {selectedIcon}
            </div>
            
            {/* Workspace Label */}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-accent/20 text-accent-foreground font-sans inline-block mb-1 border border-accent/15">
                Active Workspace
              </span>
              <h2 className="text-2xl font-black truncate text-foreground leading-none">
                {wsName || 'Unnamed Workspace'}
              </h2>
            </div>
          </div>

          {/* Settings Indicator */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1 bg-background/55 px-3 py-1.5 rounded-full border border-border backdrop-blur-md">
              <Shield className="w-3.5 h-3.5" style={{ color: selectedColor }} />
              Role: <span className="font-semibold text-foreground capitalize">{currentUserRole}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: Customization Settings ─── */}
      {activeTab === 'customization' && (
        <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
              <Palette className="w-5 h-5 text-accent" />
              <span>Workspace Profile Customization</span>
            </CardTitle>
            <CardDescription className="font-light">
              Fine-tune the profile settings and theme of this visual environment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveCustomization} className="space-y-6">
              {/* Workspace name */}
              <div className="space-y-2 max-w-lg">
                <Label htmlFor="wsName" className="font-semibold text-sm">
                  Workspace Name
                </Label>
                <Input
                  id="wsName"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  disabled={!canManage}
                  placeholder="My Creative Space"
                  className="rounded-xl border-border focus:ring-accent py-5"
                />
              </div>

              {/* Accent Color presets */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">Accent Brand Color</Label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      disabled={!canManage}
                      onClick={() => setSelectedColor(preset.hex)}
                      className={`h-11 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border cursor-pointer select-none transition-all duration-200 ${
                        selectedColor === preset.hex
                          ? 'border-foreground text-foreground shadow-sm scale-102 bg-white/5'
                          : 'border-border text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${preset.bg}`} />
                      <span>{preset.name}</span>
                      {selectedColor === preset.hex && <Check className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji Icon picker */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">Workspace Icon Emoji</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={!canManage}
                      onClick={() => setSelectedIcon(emoji)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center border cursor-pointer select-none transition-all duration-200 ${
                        selectedIcon === emoji
                          ? 'border-foreground bg-white/5 shadow-md scale-105'
                          : 'border-border hover:bg-white/5 hover:scale-102'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  {canManage && (
                    <Input
                      value={selectedIcon}
                      onChange={(e) => setSelectedIcon(e.target.value.slice(0, 4))}
                      placeholder="Or paste custom emoji..."
                      className="w-48 h-12 rounded-xl border-border focus:ring-accent ml-2 text-center"
                    />
                  )}
                </div>
              </div>

              {/* Banner presets */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">Banner Gradient Style</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {BANNER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={!canManage}
                      onClick={() => setSelectedBanner(preset.class)}
                      className={`h-16 rounded-2xl overflow-hidden border cursor-pointer select-none text-left flex flex-col justify-end p-3 relative group transition-all duration-300 ${
                        selectedBanner === preset.class
                          ? 'border-foreground ring-2 ring-foreground/20 scale-[1.01]'
                          : 'border-border hover:border-foreground/50'
                      }`}
                    >
                      <div className={`absolute inset-0 ${preset.class} transition-all duration-300`} />
                      <div className="absolute inset-0 bg-black/40" />
                      <span className="relative font-bold text-[10px] text-white tracking-wide uppercase select-none flex items-center justify-between w-full">
                        <span>{preset.name}</span>
                        {selectedBanner === preset.class && <Check className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit actions */}
              {canManage && (
                <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    disabled={customizationLoading}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-5 rounded-xl cursor-pointer"
                  >
                    {customizationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save Branding Settings'
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 2: Members & Sharing Links ─── */}
      {activeTab === 'people' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section A: Workspace Share Links Generator */}
          <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                <Link2 className="w-5 h-5 text-accent" />
                <span>Multi-Link Workspace Invitations</span>
              </CardTitle>
              <CardDescription className="font-light">
                Generate multiple dynamic workspace invitation links. Each link can assign specific roles automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Link creation form (for admins/owners only) */}
              {canManage && (
                <form onSubmit={handleCreateInviteLink} className="grid grid-cols-1 md:grid-cols-3 items-end gap-4 border border-border/60 bg-background/30 rounded-2xl p-4.5">
                  <div className="space-y-2">
                    <Label htmlFor="linkTitle" className="font-semibold text-xs">Invite Link Label</Label>
                    <Input
                      id="linkTitle"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="e.g. Creator Join Link, Designer Code"
                      className="rounded-xl border-border focus:ring-accent"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">Auto-Assigned Joining Role</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full inline-flex items-center justify-between gap-1.5 rounded-xl border border-border bg-background hover:bg-muted px-4 py-2.5 text-xs text-foreground transition-colors focus:outline-hidden font-semibold">
                        <span className="capitalize">{linkRole}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg w-44 p-1">
                        {(['admin', 'editor', 'commenter', 'viewer'] as const).map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => setLinkRole(r)}
                            className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer capitalize flex items-center justify-between"
                          >
                            <span>{r}</span>
                            {linkRole === r && <Check className="w-4 h-4 text-accent" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Button
                    type="submit"
                    disabled={linkLoading || !linkTitle.trim()}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl h-10 px-5 cursor-pointer flex items-center justify-center gap-1.5 w-full"
                  >
                    {linkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Generate Share Link</span>
                  </Button>
                </form>
              )}

              {/* Links list */}
              <div className="space-y-3">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Active Invite Links</Label>
                {links.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border/80 rounded-2xl bg-background/25">
                    <p className="text-xs text-muted-foreground font-light">No workspace invite links created yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-background/30 shadow-xs">
                    {links.map((link) => {
                      const joinUrl = `${window.location.origin}/${locale}/join/workspace/${link.share_token}`;
                      const isCopied = copiedLinkId === link.id;

                      return (
                        <div key={link.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-foreground truncate">{link.label}</h4>
                              <Badge variant="secondary" className="capitalize text-[10px] bg-accent/15 text-accent border border-accent/20">
                                {link.role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-1.5 max-w-lg min-w-0 shadow-xs">
                              <Link2 className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span className="text-xs text-muted-foreground font-mono truncate select-all">{joinUrl}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                            {/* Copy button */}
                            <Button
                              onClick={() => handleCopyLink(link.id, link.share_token)}
                              size="sm"
                              className={`rounded-xl px-4 font-bold text-xs cursor-pointer gap-1 transition-all h-9 ${
                                isCopied ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-background hover:bg-muted text-foreground border border-border'
                              }`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-accent" />}
                              <span>{isCopied ? 'Copied' : 'Copy'}</span>
                            </Button>

                            {/* Revoke button */}
                            {canManage && (
                              <Button
                                onClick={() => handleRevokeLink(link.id)}
                                variant="ghost"
                                size="icon"
                                className="w-9 h-9 rounded-xl border border-border text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section B: Workspace Members List */}
          <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <span>Workspace Members & Roles</span>
              </CardTitle>
              <CardDescription className="font-light">
                Monitor and adjust roles or access rights for collaborators inside this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-2xl overflow-hidden shadow-xs bg-background/30">
                <div className="divide-y divide-border">
                  {members.map((member) => {
                    if (!member.profiles) return null;
                    const isTargetOwner = member.role === 'owner';
                    const isCurrentUser = member.profiles.id === currentUserId;

                    return (
                      <div key={member.profiles.id} className="p-4.5 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center uppercase text-sm shrink-0 border-2 border-primary/20">
                            {member.profiles.full_name?.charAt(0) || member.profiles.email.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold font-sans text-sm truncate flex items-center gap-1.5">
                              <span>{member.profiles.full_name || 'User'}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </h4>
                            <p className="text-xs font-light text-muted-foreground truncate">{member.profiles.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {getRoleBadge(member.role)}

                          {/* Manage member actions */}
                          {canManage && !isTargetOwner && !isCurrentUser && (
                            <div className="flex items-center gap-2">
                              {/* Change Role dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  disabled={memberLoading === member.profiles.id}
                                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted px-3 h-9 gap-1 cursor-pointer font-bold text-xs transition-colors focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none shadow-xs"
                                >
                                  <span>Change Role</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-md w-40 p-1">
                                  {['admin', 'editor', 'commenter', 'viewer'].map((roleOption) => (
                                    <DropdownMenuItem
                                      key={roleOption}
                                      onClick={() => handleChangeRole(member.profiles!.id, roleOption)}
                                      className="cursor-pointer capitalize rounded-lg m-1 font-semibold text-xs flex items-center justify-between"
                                    >
                                      <span>{roleOption}</span>
                                      {member.role === roleOption && <Check className="w-4 h-4 text-accent" />}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* Delete Member */}
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={memberLoading === member.profiles.id}
                                onClick={() => handleRemoveMember(member.profiles!.id)}
                                className="w-9 h-9 rounded-xl border border-border text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                {memberLoading === member.profiles.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
