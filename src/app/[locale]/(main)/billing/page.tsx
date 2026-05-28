import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getWorkspaceSubscription, getUsageMetrics } from '@/actions/billing.actions';
import { BillingClient } from '@/components/billing/BillingClient';
import { PlanType } from '@/lib/planLimits';

interface WorkspaceRecord {
  role: string;
  workspaces: {
    id: string;
    name: string;
    plan: string;
    stripe_customer_id: string | null;
  } | null;
}

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // 2. Fetch user's workspaces
  const { data: memberRecords } = await (supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, plan, stripe_customer_id)')
    .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

  const workspaces = memberRecords
    ? memberRecords
        .map((r) => r.workspaces)
        .filter((w): w is { id: string; name: string; plan: string; stripe_customer_id: string | null } => w !== null)
    : [];

  const activeWorkspace = workspaces[0];

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-4">
        <h2 className="text-2xl font-bold font-sans">Setting up your Workspace...</h2>
        <p className="text-sm text-muted-foreground font-light max-w-sm">
          Please wait a moment while we provision your custom workflows canvas and Legend trial dashboard.
        </p>
      </div>
    );
  }

  // 3. Fetch subscription details and usage counts
  const { subscription } = await getWorkspaceSubscription(activeWorkspace.id);
  const metrics = await getUsageMetrics(activeWorkspace.id, user.id);

  const defaultUsage = {
    workflows: { current: 0, limit: 3 },
    customElements: { current: 0, limit: 2 },
    favorites: { current: 0, limit: 5 },
    aiCredits: { current: 0, limit: 10 },
  };

  const usage = metrics
    ? {
        workflows: { current: metrics.workflows.current, limit: metrics.workflows.limit },
        customElements: { current: metrics.customElements.current, limit: metrics.customElements.limit },
        favorites: { current: metrics.favorites.current, limit: metrics.favorites.limit },
        aiCredits: { current: metrics.aiCredits.current, limit: metrics.aiCredits.limit },
      }
    : defaultUsage;

  const planType: PlanType = (activeWorkspace.plan as PlanType) || 'free';

  return (
    <BillingClient
      locale={locale}
      workspace={{
        id: activeWorkspace.id,
        name: activeWorkspace.name,
        plan: planType,
        stripe_customer_id: activeWorkspace.stripe_customer_id,
      }}
      subscription={subscription as { status?: string; [key: string]: unknown } | null}
      usage={usage}
    />
  );
}

export const metadata = {
  title: 'Billing & Subscriptions — Visual Workflow SaaS',
  description: 'Manage subscription plans, check active usage capacities, and upgrade visual canvas tiers.',
};
