'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';
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
import { Shield, Building, Trash2, Edit2, Loader2, ChevronDown, Check } from 'lucide-react';

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
  };
  initialMembers: Member[];
  currentUserRole: string;
  currentUserId: string;
  locale: string;
}

export function WorkspaceSettings({
  initialWorkspace,
  initialMembers,
  currentUserRole,
  currentUserId,
  locale,
}: WorkspaceSettingsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [wsName, setWsName] = useState(initialWorkspace.name);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [memberLoading, setMemberLoading] = useState<string | null>(null);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || wsName.trim() === initialWorkspace.name) return;

    setLoading(true);
    const { error } = await (supabase
      .from('workspaces') as any)
      .update({ name: wsName.trim() })
      .eq('id', initialWorkspace.id);

    if (error) {
      alert('Failed to rename: ' + error.message);
    } else {
      alert('Workspace successfully renamed!');
      router.refresh();
    }
    setLoading(false);
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
      alert('Member removed.');
    }
    setMemberLoading(null);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-primary/10 text-primary border-primary/20',
      admin: 'bg-destructive/10 text-destructive border-destructive/20',
      editor: 'bg-accent/10 text-accent border-accent/20',
      commenter: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      viewer: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    };
    return (
      <Badge variant="outline" className={`capitalize font-semibold text-xs rounded-md ${colors[role] || colors.viewer}`}>
        {role}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold font-sans tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground font-light">
          Manage workspace descriptors and active role permissions.
        </p>
      </div>

      {/* 1. Rename Workspace */}
      <Card className="bg-background/60 border border-border backdrop-blur-md shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
            <Building className="w-5 h-5 text-accent" />
            <span>Workspace Profile</span>
          </CardTitle>
          <CardDescription className="font-light">
            Update your primary workspace name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRenameWorkspace} className="flex flex-col sm:flex-row items-end gap-4 max-w-lg">
            <div className="flex-1 space-y-2 w-full">
              <Label htmlFor="wsName" className="font-semibold text-sm">
                Workspace Name
              </Label>
              <Input
                id="wsName"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                disabled={!canManage}
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !canManage || wsName.trim() === initialWorkspace.name}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 rounded-xl cursor-pointer w-full sm:w-auto py-5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2. Members Management */}
      <Card className="bg-background/60 border border-border backdrop-blur-md shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            <span>Workspace Members</span>
          </CardTitle>
          <CardDescription className="font-light">
            Verify who has permissions inside your workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-background/30">
            <div className="divide-y divide-border">
              {members.map((member) => {
                if (!member.profiles) return null;
                const isTargetOwner = member.role === 'owner';
                const isCurrentUser = member.profiles.id === currentUserId;

                return (
                  <div key={member.profiles.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center uppercase text-sm shrink-0 border-2 border-primary/15">
                        {member.profiles.full_name?.charAt(0) || member.profiles.email.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold font-sans text-sm truncate flex items-center gap-1.5">
                          <span>{member.profiles.full_name || 'User'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-accent/15 text-accent font-semibold px-1.5 py-0.5 rounded-full">
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
                              className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted px-3 gap-1 cursor-pointer font-medium text-xs h-9 transition-colors focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none"
                            >
                              <span>Change Role</span>
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-md w-40">
                              {['admin', 'editor', 'commenter', 'viewer'].map((roleOption) => (
                                <DropdownMenuItem
                                  key={roleOption}
                                  onClick={() => handleChangeRole(member.profiles!.id, roleOption)}
                                  className="cursor-pointer capitalize rounded-lg m-1 font-medium flex items-center justify-between"
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
  );
}
