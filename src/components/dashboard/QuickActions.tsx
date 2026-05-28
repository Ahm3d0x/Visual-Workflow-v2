'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, UserPlus, FileJson, Layout, Loader2 } from 'lucide-react';

interface QuickActionsProps {
  workspaceId: string;
  locale: string;
}

export function QuickActions({ workspaceId }: QuickActionsProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const supabase = createClient();

  // Modals state
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Workflow Form State
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfTemplate, setWfTemplate] = useState('blank');
  const [wfLoading, setWfLoading] = useState(false);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'commenter' | 'viewer'>('editor');
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfName.trim()) return;

    setWfLoading(true);
    const { data: userData } = await supabase.auth.getUser();

    // Insert new workflow record in public.workflows
    const { data, error } = await (supabase
      .from('workflows')
      .insert({
        workspace_id: workspaceId,
        name: wfName.trim(),
        description: wfDesc.trim() || null,
        status: 'draft',
        node_count: wfTemplate === 'blank' ? 0 : 3,
        created_by: userData.user?.id || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select('id')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as any);

    if (error) {
      alert('Failed to create workflow: ' + error.message);
      setWfLoading(false);
    } else if (data) {
      // Insert mock preset nodes
      if (wfTemplate !== 'blank') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('workflow_nodes') as any).insert([
          { workflow_id: data.id, type: 'start', position: { x: 100, y: 150 }, data: { label: 'Start Trigger' } },
          { workflow_id: data.id, type: 'process', position: { x: 300, y: 150 }, data: { label: 'Process Action' } },
          { workflow_id: data.id, type: 'end', position: { x: 500, y: 150 }, data: { label: 'End Step' } },
        ]);
      }

      setWorkflowOpen(false);
      setWfLoading(false);
      setWfName('');
      setWfDesc('');
      router.push(`/workflows/${data.id}`);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    const { data: authData } = await supabase.auth.getUser();

    // 1. Search if the email profile exists in public.profiles
    const { data: profile } = await (supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail.trim())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .maybeSingle() as any);

    if (!profile) {
      alert('Invite sent! (Simulated mail invitation: ' + inviteEmail + ')');
      setInviteOpen(false);
      setInviteLoading(false);
      setInviteEmail('');
      return;
    }

    // 2. Add member to public.workspace_members
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('workspace_members') as any).insert({
      workspace_id: workspaceId,
      user_id: profile.id,
      role: inviteRole,
      invited_by: authData.user?.id || null,
    });

    if (error) {
      alert('Could not add member: ' + error.message);
    } else {
      alert('Member successfully added to workspace!');
      setInviteOpen(false);
      setInviteEmail('');
    }
    setInviteLoading(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-background/40 border border-border backdrop-blur-md p-4 rounded-2xl shadow-sm">
      {/* 1. Create Workflow Trigger Dialog */}
      <Dialog open={workflowOpen} onOpenChange={setWorkflowOpen}>
        <DialogTrigger className="inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer gap-2 focus:outline-hidden text-sm">
          <Plus className="w-5 h-5" />
          <span>{t('new_workflow')}</span>
        </DialogTrigger>
        <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-sans">Create Workflow</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWorkflow} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wfName" className="font-semibold text-sm">
                Name
              </Label>
              <Input
                id="wfName"
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                placeholder="Workflow name"
                required
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wfDesc" className="font-semibold text-sm">
                Description
              </Label>
              <Textarea
                id="wfDesc"
                value={wfDesc}
                onChange={(e) => setWfDesc(e.target.value)}
                placeholder="Description of workflow steps (optional)"
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Starting Template</Label>
              <Select value={wfTemplate} onValueChange={(val) => setWfTemplate(val || 'blank')}>
                <SelectTrigger className="rounded-xl border-border">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border rounded-xl">
                  <SelectItem value="blank" className="cursor-pointer">Blank Canvas (empty)</SelectItem>
                  <SelectItem value="basic" className="cursor-pointer">Basic Pipeline (3 nodes)</SelectItem>
                  <SelectItem value="ai" className="cursor-pointer">AI Agent Route (Presets)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setWorkflowOpen(false)} className="rounded-xl border-border cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={wfLoading || !wfName.trim()} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 cursor-pointer">
                {wfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Invite Member Trigger Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogTrigger className="inline-flex items-center justify-center border border-border hover:bg-muted font-semibold px-5 py-2.5 rounded-xl cursor-pointer gap-2 focus:outline-hidden text-sm">
          <UserPlus className="w-5 h-5 text-accent" />
          <span>Invite Member</span>
        </DialogTrigger>
        <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-sans">Invite to Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteMember} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail" className="font-semibold text-sm">
                Email Address
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Access Role</Label>
              <Select value={inviteRole} onValueChange={(val: string | null) => setInviteRole((val || 'editor') as 'editor' | 'commenter' | 'viewer')}>
                <SelectTrigger className="rounded-xl border-border">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border rounded-xl">
                  <SelectItem value="editor" className="cursor-pointer">Editor (Full edit rights)</SelectItem>
                  <SelectItem value="commenter" className="cursor-pointer">Commenter (View + Comment)</SelectItem>
                  <SelectItem value="viewer" className="cursor-pointer">Viewer (Read-only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} className="rounded-xl border-border cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={inviteLoading || !inviteEmail.trim()} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 cursor-pointer">
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Demo placeholders */}
      <Button variant="ghost" disabled className="text-muted-foreground opacity-60 font-medium rounded-xl flex items-center gap-2">
        <FileJson className="w-4 h-4" />
        <span>Import JSON</span>
      </Button>
      <Button variant="ghost" disabled className="text-muted-foreground opacity-60 font-medium rounded-xl flex items-center gap-2">
        <Layout className="w-4 h-4" />
        <span>Browse Gallery</span>
      </Button>
    </div>
  );
}
