import { createClient, getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getWorkspaceSubscription, getUsageMetrics } from '@/actions/billing.actions';
import { getPricingSettings } from '@/actions/admin.actions';
import { BillingClient } from '@/components/billing/BillingClient';
import { PlanType } from '@/lib/planLimits';
import { provisionWorkspaceIfNeeded } from '@/lib/supabase/provision';

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

  // Cached getUser() — React.cache() deduplicates with the layout's call.
  const { user } = await getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // 2. Fetch user's workspaces
  const { data: memberRecords } = await (supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, plan, stripe_customer_id)')
    .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

  let workspaces = memberRecords
    ? memberRecords
        .map((r) => r.workspaces)
        .filter((w): w is { id: string; name: string; plan: string; stripe_customer_id: string | null } => w !== null)
    : [];

  // Fallback dynamic self-healing provisioning if empty
  if (workspaces.length === 0) {
    const { data: profile } = await (supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle() as unknown as Promise<{ data: { full_name: string | null } | null }>);

    await provisionWorkspaceIfNeeded(user.id, user.email || '', profile?.full_name || null);

    // Refetch membership records
    const { data: refetchedRecords } = await (supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, plan, stripe_customer_id)')
      .eq('user_id', user.id) as unknown as { data: WorkspaceRecord[] | null });

    workspaces = refetchedRecords
      ? refetchedRecords
          .map((r) => r.workspaces)
          .filter((w): w is { id: string; name: string; plan: string; stripe_customer_id: string | null } => w !== null)
      : [];
  }

  const activeWorkspace = workspaces[0];

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-4">
        <h2 className="text-2xl font-bold font-sans">
          {locale === 'ar' ? 'جاري إعداد مساحة العمل الخاصة بك...' : 'Setting up your Workspace...'}
        </h2>
        <p className="text-sm text-muted-foreground font-light max-w-sm">
          {locale === 'ar'
            ? 'يرجى الانتظار للحظات بينما نقوم بتهيئة لوحة سير العمل المخصصة ولوحة تحكم Legend التجريبية.'
            : 'Please wait a moment while we provision your custom workflows canvas and Legend trial dashboard.'}
        </p>
      </div>
    );
  }

  // 3. Fetch subscription details, usage counts, and pricing settings in parallel
  const [subRes, metricsRes, pricingRes] = await Promise.all([
    getWorkspaceSubscription(activeWorkspace.id),
    getUsageMetrics(activeWorkspace.id, user.id),
    getPricingSettings()
  ]);

  const { subscription } = subRes;
  const metrics = metricsRes;

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
      pricingSettings={pricingRes.success ? pricingRes.data! : []}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الفواتير والاشتراكات — Visual Workflow SaaS' : 'Billing & Subscriptions — Visual Workflow SaaS',
    description: isAr
      ? 'إدارة خطط الاشتراك، والتحقق من طاقة الاستخدام النشطة، وترقية مستويات اللوحة المرئية.'
      : 'Manage subscription plans, check active usage capacities, and upgrade visual canvas tiers.',
  };
}
