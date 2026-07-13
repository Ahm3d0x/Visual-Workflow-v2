'use client';

import { useState, useTransition } from 'react';
import { 
  Check, Shield, Zap, Sparkles, Crown, Terminal, 
  HelpCircle, CreditCard, ExternalLink, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { createCheckoutSession, createPortalSession } from '@/actions/billing.actions';
import { PLAN_LIMITS, PlanType } from '@/lib/planLimits';

interface PricingSetting {
  plan: PlanType;
  price_monthly: number;
  price_annual: number;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
}

interface BillingClientProps {
  locale: string;
  workspace: {
    id: string;
    name: string;
    plan: PlanType;
    stripe_customer_id: string | null;
  };
  subscription: { status?: string; [key: string]: unknown } | null;
  usage: {
    workflows: { current: number; limit: number };
    customElements: { current: number; limit: number };
    favorites: { current: number; limit: number };
    aiCredits: { current: number; limit: number };
  };
  pricingSettings: PricingSetting[];
}

const STRIPE_PRICES_FALLBACK: Record<PlanType, { monthly: string; annual: string; priceMonthly: number; priceAnnual: number }> = {
  free: { monthly: '', annual: '', priceMonthly: 0, priceAnnual: 0 },
  warrior: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_WARRIOR_MONTHLY_PRICE_ID || 'price_warrior_monthly',
    annual: process.env.NEXT_PUBLIC_STRIPE_WARRIOR_ANNUAL_PRICE_ID || 'price_warrior_annual',
    priceMonthly: 600,
    priceAnnual: 5000,
  },
  elite: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID || 'price_elite_monthly',
    annual: process.env.NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID || 'price_elite_annual',
    priceMonthly: 1500,
    priceAnnual: 12500,
  },
  champion: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID || 'price_champion_monthly',
    annual: process.env.NEXT_PUBLIC_STRIPE_CHAMPION_ANNUAL_PRICE_ID || 'price_champion_annual',
    priceMonthly: 4000,
    priceAnnual: 33500,
  },
  legend: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_LEGEND_MONTHLY_PRICE_ID || 'price_legend_monthly',
    annual: process.env.NEXT_PUBLIC_STRIPE_LEGEND_ANNUAL_PRICE_ID || 'price_legend_annual',
    priceMonthly: 10000,
    priceAnnual: 85000,
  },
};

export function BillingClient({
  locale,
  workspace,
  subscription,
  usage,
  pricingSettings,
}: BillingClientProps) {
  const isRtl = locale === 'ar';
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [, startTransition] = useTransition();
  const [actionLoadingPlan, setActionLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activePlan = workspace.plan;

  // Resolve localized strings (inline dictionaries to handle multi-locale without complex config)
  const t = {
    title: isRtl ? 'إدارة الاشتراك والخطط' : 'Billing & Subscription Tiers',
    desc: isRtl 
      ? 'قم بترقية مساحة عملك للوصول إلى التعاون في الوقت الفعلي والحدود الموسعة والميزات المدعومة بالذكاء الاصطناعي.' 
      : 'Upgrade your workspace to access real-time collaboration, expanded canvas limits, and AI-powered insights.',
    monthly: isRtl ? 'شهرياً' : 'Monthly',
    yearly: isRtl ? 'سنوياً' : 'Yearly',
    save30: isRtl ? 'وفر ٣٠٪' : 'Save 30%',
    currentPlan: isRtl ? 'الخطة الحالية' : 'Current Plan',
    upgrade: isRtl ? 'ترقية الآن' : 'Upgrade Now',
    manageSub: isRtl ? 'إدارة الفواتير' : 'Manage Subscription',
    usageTitle: isRtl ? 'مؤشرات سعة مساحة العمل' : 'Active Workspace Capacity Gauges',
    workflows: isRtl ? 'مخططات سير العمل' : 'Workflows Canvas',
    customElements: isRtl ? 'العناصر المخصصة' : 'Custom Elements Designer',
    favorites: isRtl ? 'العناصر المفضلة' : 'Favorite Starred Items',
    aiCredits: isRtl ? 'رصيد مساعد الذكاء الاصطناعي' : 'AI Assistant Credits',
    featuresTitle: isRtl ? 'الميزات المضمنة' : 'Included Tier Capabilities',
    trialActive: isRtl ? 'أنت في الفترة التجريبية لخطة Legend' : 'You are on a Legend Plan Trial',
    trialDesc: isRtl 
      ? 'ينتهي اشتراكك التجريبي قريباً. يرجى الترقية للحفاظ على استمرارية مشاريعك.' 
      : 'Your trial period will expire soon. Upgrade now to keep seamless editing and collaboration controls.',
    unlimited: isRtl ? 'غير محدود' : 'Unlimited',
    monthShort: isRtl ? '/ شهر' : '/ mo',
    yearShort: isRtl ? '/ سنة' : '/ yr',
  };

  const planVisuals: Record<PlanType, { icon: React.ComponentType<{ className?: string }>; color: string; bgGradient: string; shadow: string }> = {
    free: {
      icon: Shield,
      color: 'text-zinc-400',
      bgGradient: 'from-zinc-500/10 to-zinc-500/5 border-zinc-200 dark:border-zinc-800',
      shadow: 'shadow-zinc-500/5',
    },
    warrior: {
      icon: Zap,
      color: 'text-orange-500',
      bgGradient: 'from-orange-500/10 to-orange-500/5 border-orange-200 dark:border-orange-950',
      shadow: 'shadow-orange-500/5',
    },
    elite: {
      icon: Sparkles,
      color: 'text-blue-500',
      bgGradient: 'from-blue-500/15 to-blue-500/5 border-blue-200 dark:border-blue-950',
      shadow: 'shadow-blue-500/10',
    },
    champion: {
      icon: Crown,
      color: 'text-purple-500',
      bgGradient: 'from-purple-500/15 to-purple-500/5 border-purple-200 dark:border-purple-950',
      shadow: 'shadow-purple-500/10',
    },
    legend: {
      icon: Terminal,
      color: 'text-emerald-500',
      bgGradient: 'from-emerald-500/20 to-emerald-500/5 border-emerald-300 dark:border-emerald-950 ring-2 ring-emerald-500/30',
      shadow: 'shadow-emerald-500/15',
    },
  };

  const handleCheckout = async (plan: PlanType) => {
    if (plan === 'free') return;
    setError(null);
    setActionLoadingPlan(plan);

    const dbPlan = pricingSettings.find(p => p.plan === plan);
    const fallback = STRIPE_PRICES_FALLBACK[plan];
    const priceId = billingCycle === 'monthly' 
      ? (dbPlan?.stripe_monthly_price_id || fallback.monthly)
      : (dbPlan?.stripe_annual_price_id || fallback.annual);

    startTransition(async () => {
      const res = await createCheckoutSession(workspace.id, priceId, locale);
      setActionLoadingPlan(null);

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.url) {
        window.location.href = res.url;
      }
    });
  };

  const handleManageBilling = async () => {
    setError(null);
    setActionLoadingPlan('portal');

    startTransition(async () => {
      const res = await createPortalSession(workspace.id, locale);
      setActionLoadingPlan(null);

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.url) {
        window.location.href = res.url;
      }
    });
  };

  // Helper to resolve metric percentage and status colors
  const getProgressInfo = (current: number, limit: number) => {
    const percentage = limit > 0 ? Math.min(100, (current / limit) * 100) : 0;
    let color = 'bg-accent';
    if (percentage >= 95) color = 'bg-red-500';
    else if (percentage >= 80) color = 'bg-orange-500';
    return { percentage, color };
  };

  const renderProgressCard = (title: string, current: number, limit: number, desc: string) => {
    const { percentage, color } = getProgressInfo(current, limit);
    const limitLabel = limit >= 9999 ? t.unlimited : limit.toLocaleString();

    return (
      <div className="bg-background/40 backdrop-blur-md border border-border p-4.5 rounded-2xl flex flex-col gap-3 shadow-xs transition-transform hover:-translate-y-0.5 duration-200">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-muted-foreground">{title}</span>
          <span className="font-mono text-foreground font-semibold">
            {current} / {limitLabel}
          </span>
        </div>
        <Progress value={percentage} className="h-2 [&_div]:transition-all" style={{ backgroundColor: 'var(--border)' }}>
          <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${percentage}%` }} />
        </Progress>
        <span className="text-[10px] text-muted-foreground/60 leading-none font-light">{desc}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Banners */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1.5 max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight font-sans bg-clip-text bg-linear-to-r from-foreground to-foreground/80">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            {t.desc}
          </p>
        </div>

        {workspace.stripe_customer_id && (
          <Button
            onClick={handleManageBilling}
            disabled={actionLoadingPlan !== null}
            className="rounded-xl bg-background/55 text-foreground hover:bg-muted font-bold text-xs border border-border px-5 py-2.5 h-10 shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
          >
            {actionLoadingPlan === 'portal' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4 text-accent" />
            )}
            <span>{t.manageSub}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-2xl text-xs text-red-500 font-bold flex items-center gap-2 animate-shake">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Legend Trial banner alert */}
      {subscription?.status === 'trialing' && (
        <div className="p-5 border border-purple-500/20 bg-purple-500/10 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-purple-500/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Crown className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-foreground">{t.trialActive}</h4>
              <p className="text-xs text-muted-foreground/80 font-light mt-0.5 leading-relaxed">
                {t.trialDesc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Current Capacity Meters */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
          <span>{t.usageTitle}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderProgressCard(
            t.workflows,
            usage.workflows.current,
            usage.workflows.limit,
            isRtl ? 'الحد المسموح به للمخططات النشطة في مساحة العمل.' : 'Active workflows inside dashboard shell.'
          )}
          {renderProgressCard(
            t.customElements,
            usage.customElements.current,
            usage.customElements.limit,
            isRtl ? 'العناصر المخصصة المنشأة بواسطة مصمم المكونات.' : 'Private components built in node designer.'
          )}
          {renderProgressCard(
            t.favorites,
            usage.favorites.current,
            usage.favorites.limit,
            isRtl ? 'المكونات المفضلة والمميزة بالنجمة في المكتبة.' : 'Gold-starred components pinned in library.'
          )}
          {renderProgressCard(
            t.aiCredits,
            usage.aiCredits.current,
            usage.aiCredits.limit,
            isRtl ? 'الرصيد الشهري المستخدم لمساعد الذكاء الاصطناعي.' : 'Remaining credits reset at monthly invoice cycle.'
          )}
        </div>
      </div>

      {/* 3. Pricing Toggle Slider */}
      <div className="flex flex-col items-center justify-center pt-6 pb-2 gap-4">
        <div className="bg-muted p-1 rounded-2xl flex items-center border border-border">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.monthly}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{t.yearly}</span>
            <span className="text-[9px] uppercase bg-accent text-white px-2 py-0.5 rounded-full tracking-wide">
              {t.save30}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Complete Product Comparison Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {(Object.keys(PLAN_LIMITS) as PlanType[]).map((plan) => {
          const limits = PLAN_LIMITS[plan];
          const isCurrent = activePlan === plan;
          const config = planVisuals[plan];
          const PlanIcon = config.icon;

          const dbPlan = pricingSettings.find(p => p.plan === plan);
          const fallback = STRIPE_PRICES_FALLBACK[plan];
          const displayPrice = billingCycle === 'monthly' 
            ? (dbPlan ? dbPlan.price_monthly : fallback.priceMonthly)
            : (dbPlan ? dbPlan.price_annual : fallback.priceAnnual);
          const cycleLabel = billingCycle === 'monthly' ? t.monthShort : t.yearShort;

          return (
            <div
              key={plan}
              className={`bg-background/45 backdrop-blur-md border rounded-3xl p-5 flex flex-col justify-between relative shadow-lg ${config.shadow} ${config.bgGradient} transition-all duration-300 hover:scale-[1.01]`}
            >
              {/* Highlight badge for Legend tier */}
              {plan === 'legend' && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-emerald-500 to-teal-600 text-white text-[8px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full border border-emerald-400 shadow-md">
                  {isRtl ? 'الأقوى' : 'Ultimate'}
                </div>
              )}

              {/* Plan Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl bg-background/60 border border-border/80 flex items-center justify-center ${config.color} shrink-0`}>
                    <PlanIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm capitalize text-foreground">{plan}</h3>
                    <span className="text-[9px] text-muted-foreground/60 font-light leading-none">
                      {plan === 'free' ? (isRtl ? 'للتجربة الفردية' : 'Sandbox usage') : (isRtl ? 'مساحة عمل احترافية' : 'Paid enterprise limits')}
                    </span>
                  </div>
                </div>

                {/* Price Label */}
                <div className="pt-2 border-b border-border/40 pb-4">
                  {plan === 'free' ? (
                    <h2 className="text-3xl font-extrabold font-sans text-foreground">
                      {isRtl ? '٠ جنيه' : '0 EGP'}
                    </h2>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <h2 className="text-3xl font-extrabold font-sans text-foreground tracking-tight leading-none">
                        {displayPrice.toLocaleString()}
                      </h2>
                      <span className="text-xs font-bold text-foreground/75">
                        {isRtl ? 'جنيه' : 'EGP'}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 font-light pl-0.5">{cycleLabel}</span>
                    </div>
                  )}
                </div>

                {/* Tier Limits Features List */}
                <div className="space-y-3.5 pt-2">
                  <h4 className="text-[10px] uppercase font-extrabold text-muted-foreground/80 tracking-widest">
                    {t.featuresTitle}
                  </h4>
                  <ul className="space-y-2.5">
                    {/* Workspaces limit */}
                    <li className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-light leading-none">
                        {limits.max_workspaces >= 9999 ? t.unlimited : limits.max_workspaces}{' '}
                        {isRtl ? 'مساحات عمل' : 'Workspaces Allowed'}
                      </span>
                    </li>

                    {/* Workspace Share links limit */}
                    <li className={`flex items-start gap-2 text-xs ${limits.max_workspace_share_links === 0 && 'opacity-35 line-through decoration-border'}`}>
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-light leading-none">
                        {limits.max_workspace_share_links >= 9999 ? t.unlimited : limits.max_workspace_share_links}{' '}
                        {isRtl ? 'روابط دعوة نشطة' : 'Active Invite Links'}
                      </span>
                    </li>

                    {/* Workflows Limit */}
                    <li className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-light leading-none">
                        {limits.max_workflows >= 9999 ? t.unlimited : limits.max_workflows}{' '}
                        {isRtl ? 'مخططات' : 'Active Workflows'}
                      </span>
                    </li>

                    {/* Nodes limit */}
                    <li className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-light leading-none">
                        {limits.max_nodes_per_workflow >= 99999 ? t.unlimited : limits.max_nodes_per_workflow.toLocaleString()}{' '}
                        {isRtl ? 'عقد / مخطط' : 'Nodes per Flow'}
                      </span>
                    </li>

                    {/* Custom Elements limit */}
                    <li className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-light leading-none">
                        {limits.max_custom_elements >= 9999 ? t.unlimited : limits.max_custom_elements}{' '}
                        {isRtl ? 'مكونات مخصصة' : 'Custom Elements'}
                      </span>
                    </li>

                    {/* AI Credits */}
                    <li className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-light leading-none">
                        {limits.ai_credits_monthly}{' '}
                        {isRtl ? 'رصيد ذكاء اصطناعي' : 'Monthly AI Credits'}
                      </span>
                    </li>

                    {/* Real-time Collaboration */}
                    <li className={`flex items-start gap-2 text-xs ${!limits.can_realtime_collab && 'opacity-35 line-through decoration-border'}`}>
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-light leading-none">
                        {isRtl ? 'تعاون في الوقت الفعلي' : 'Real-time Collab'}
                      </span>
                    </li>

                    {/* Share links */}
                    <li className={`flex items-start gap-2 text-xs ${!limits.can_share_links && 'opacity-35 line-through decoration-border'}`}>
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="text-foreground/90 font-light leading-none">
                        {isRtl ? 'روابط مشاركة عامة' : 'Public Share Links'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6">
                {isCurrent ? (
                  <Button
                    disabled
                    className="w-full rounded-2xl bg-muted text-muted-foreground border border-border font-bold text-xs h-9 shadow-inner cursor-not-allowed leading-none flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.currentPlan}</span>
                  </Button>
                ) : plan === 'free' ? (
                  <Button
                    disabled
                    className="w-full rounded-2xl bg-muted text-muted-foreground border border-border font-bold text-xs h-9 cursor-not-allowed leading-none flex items-center justify-center"
                  >
                    <span>{t.currentPlan}</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCheckout(plan)}
                    disabled={actionLoadingPlan !== null}
                    className="w-full rounded-2xl bg-accent hover:bg-accent/90 text-white border border-accent/20 font-bold text-xs h-9 shadow-md cursor-pointer transition-all leading-none flex items-center justify-center gap-1.5"
                  >
                    {actionLoadingPlan === plan ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{t.upgrade}</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Additional Help banner */}
      <div className="bg-background/25 border border-border p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0 border border-accent/20">
            <HelpCircle className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-foreground">
              {isRtl ? 'هل تحتاج إلى خطة مخصصة للمؤسسات الكبيرة؟' : 'Need Custom Enterprise Scalability?'}
            </h4>
            <p className="text-xs text-muted-foreground/80 font-light mt-0.5 leading-relaxed">
              {isRtl 
                ? 'إذا كنت تدير فرقاً كبيرة بمئات المستخدمين والآلاف من مخططات سير العمل المعقدة، اتصل بقسم المبيعات لدينا.' 
                : 'If you manage large-scale workspaces requiring dedicated support SLAs and self-hosted visual canvas models, consult our sales crew.'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => window.location.href = `mailto:sales@visual-workflow.com?subject=Enterprise%20Plan%20Inquiry%20-%20Workspace%20${workspace.id}`}
          className="rounded-xl bg-background/55 text-foreground hover:bg-muted font-bold text-xs border border-border px-5 py-2.5 h-10 shadow-xs cursor-pointer transition-all"
        >
          {isRtl ? 'اتصل بنا' : 'Contact Sales'}
        </Button>
      </div>
    </div>
  );
}
