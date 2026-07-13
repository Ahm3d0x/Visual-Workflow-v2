/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { joinWorkspaceByShareToken } from '@/actions/workspace.actions';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChevronRight, AlertCircle, Check } from 'lucide-react';
import Link from 'next/link';

interface JoinPageProps {
  params: Promise<{ locale: string; token: string }>;
}

export default async function WorkspaceJoinPage({ params }: JoinPageProps) {
  const { locale, token } = await params;
  const supabase = await createClient();
  const nowTime = new Date().getTime();

  // Cached getUser() — React.cache() deduplicates with the layout's call.
  const { user } = await getUser();
  if (!user) {
    redirect(`/${locale}/auth/sign-in?redirectUrl=/join/workspace/${token}`);
  }

  // 2. Fetch the invitation link details on the server side
  const { data: link, error: linkError } = await (supabase
    .from('workspace_share_links') as any)
    .select('*, workspaces(id, name, icon, color, banner)')
    .eq('share_token', token)
    .maybeSingle();

  const activeLink = link as any;

  // 3. Handle invalid link or error
  if (linkError || !activeLink) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-background/60 border border-border backdrop-blur-md shadow-2xl rounded-3xl p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold font-sans">Invalid Invitation Link</CardTitle>
            <CardDescription className="font-light">
              This invitation link is invalid, revoked, or does not exist. Please check with your workspace administrator.
            </CardDescription>
          </div>
          <Link href={`/${locale}/dashboard`} passHref>
            <Button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl py-5 cursor-pointer">
              Go to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // 4. Handle expired link
  if (activeLink.expires_at && new Date(activeLink.expires_at).getTime() < nowTime) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-background/60 border border-border backdrop-blur-md shadow-2xl rounded-3xl p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold font-sans">Invitation Expired</CardTitle>
            <CardDescription className="font-light">
              This invitation code has expired. Please ask the owner to generate a new invitation link.
            </CardDescription>
          </div>
          <Link href={`/${locale}/dashboard`} passHref>
            <Button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl py-5 cursor-pointer">
              Go to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const workspace = activeLink.workspaces;
  const workspaceColor = workspace?.color || '#0284c7';
  const workspaceIcon = workspace?.icon || '💼';
  const workspaceBanner = workspace?.banner || 'bg-gradient-to-r from-indigo-950 via-purple-950 to-zinc-950';

  // 5. Check if user is already a member
  const { data: existingMember } = await (supabase
    .from('workspace_members') as any)
    .select('role')
    .eq('workspace_id', activeLink.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  // Server Action to trigger when user clicks "Join"
  const handleJoin = async () => {
    'use server';
    const res = await joinWorkspaceByShareToken(token);
    if (res.success && res.data?.workspaceId) {
      redirect(`/${locale}/dashboard?w=${res.data.workspaceId}`);
    } else {
      // Graceful redirection fallback
      redirect(`/${locale}/dashboard`);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full bg-background/40 border border-border/80 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden relative flex flex-col justify-between transition-all duration-300">
        
        {/* Workspace Custom Banner */}
        <div className={`h-28 w-full ${workspaceBanner} relative`}>
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <CardContent className="p-6 relative -mt-10 flex flex-col items-center text-center space-y-6">
          {/* Workspace Custom Icon */}
          <div 
            className="w-20 h-20 rounded-3xl bg-background border-4 border-background flex items-center justify-center text-4xl shadow-xl transform transition-transform hover:scale-105"
            style={{ borderColor: workspaceColor }}
          >
            {workspaceIcon}
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-accent/25 text-accent-foreground font-sans inline-block border border-accent/15">
              Workspace Invitation
            </span>
            <h2 className="text-2xl font-black text-foreground font-sans">
              You&apos;ve been invited to join {workspace?.name || 'the workspace'}
            </h2>
            <p className="text-sm font-light text-muted-foreground max-w-sm mx-auto">
              Accepting this invitation will add you as a team member with the <span className="font-semibold text-foreground capitalize">{activeLink.role}</span> role.
            </p>
          </div>

          {existingMember ? (
            <div className="w-full space-y-3 pt-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold">
                <Check className="w-4 h-4 shrink-0" />
                <span>You are already a member of this workspace!</span>
              </div>
              <Link href={`/${locale}/dashboard?w=${activeLink.workspace_id}`} passHref className="w-full block">
                <Button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl py-5 cursor-pointer flex items-center justify-center gap-1">
                  <span>Enter Workspace</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <form action={handleJoin} className="w-full pt-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl py-5 cursor-pointer shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5"
              >
                <span>Accept Invitation & Open Dashboard</span>
                <ChevronRight className="w-4.5 h-4.5" />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
