import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAdminStats, getAdminUsers, getAdminSubscriptions, getAdminPendingNodes, getPricingSettings } from '@/actions/admin.actions';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export default async function AdminPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Use getSession() (cookie-only, zero network) — layout already validated JWT.
  const supabase = await createClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  const user = session?.user;

  if (authError || !user) {
    redirect(`/${locale}/auth/sign-up`);
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
  const [statsRes, usersRes, subsRes, pendingNodesRes, pricingRes] = await Promise.all([
    getAdminStats(),
    getAdminUsers(),
    getAdminSubscriptions(),
    getAdminPendingNodes(),
    getPricingSettings()
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
      initialPricingSettings={pricingRes.success ? pricingRes.data! : []}
    />
  );
}
