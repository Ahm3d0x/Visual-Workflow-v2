import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAdminStats, getAdminUsers, getAdminSubscriptions, getAdminPendingNodes } from '@/actions/admin.actions';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export default async function AdminPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 1. Verify user session and check if they are an admin
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/auth/sign-in`);
  }

/* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_admin) {
    // Standard users are redirected back to the default dashboard
    redirect(`/${locale}/dashboard`);
  }

  // 2. Fetch admin dashboard data in parallel
  const [statsRes, usersRes, subsRes, pendingNodesRes] = await Promise.all([
    getAdminStats(),
    getAdminUsers(),
    getAdminSubscriptions(),
    getAdminPendingNodes()
  ]);

  const defaultStats = {
    totalUsers: 0,
    totalWorkspaces: 0,
    totalMarketplaceNodes: 0,
    totalSubscriptions: 0,
    pendingNodesCount: 0,
    estimatedMrr: 0
  };

  return (
    <AdminDashboardClient
      locale={locale}
      initialStats={statsRes.success ? statsRes.data! : defaultStats}
      initialUsers={usersRes.success ? usersRes.data! : []}
      initialSubscriptions={subsRes.success ? subsRes.data! : []}
      initialPendingNodes={pendingNodesRes.success ? pendingNodesRes.data! : []}
    />
  );
}
