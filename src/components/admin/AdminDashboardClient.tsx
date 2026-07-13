/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { 
  Users, Building2, Store, DollarSign, Check, X, 
  Search, Shield, CreditCard, Clock, 
  ArrowUpDown, PlayCircle, Layers, Activity, Save, Settings, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDialogStore } from '@/stores/dialogStore';
import { 
  toggleAdminStatus, 
  reviewMarketplaceNode, 
  updateWorkspacePlan,
  getAdminStats,
  getAdminUsers,
  getAdminSubscriptions,
  getAdminPendingNodes,
  getPricingSettings,
  updatePricingSettings
} from '@/actions/admin.actions';
import { type PlanType, DEFAULT_PRICING } from '@/lib/planLimits';

interface PricingSetting {
  plan: PlanType;
  price_monthly: number;
  price_annual: number;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
}

interface AdminDashboardClientProps {
  locale: string;
  initialStats: {
    totalUsers: number;
    totalWorkspaces: number;
    totalMarketplaceNodes: number;
    totalSubscriptions: number;
    pendingNodesCount: number;
    estimatedMrr: number;
  };
  initialUsers: Array<{
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
    is_admin: boolean;
  }>;
  initialSubscriptions: Array<any>;
  initialPendingNodes: Array<any>;
  initialPricingSettings: Array<PricingSetting>;
}

export function AdminDashboardClient({
  locale,
  initialStats,
  initialUsers,
  initialSubscriptions,
  initialPendingNodes,
  initialPricingSettings,
}: AdminDashboardClientProps) {
  const isRtl = locale === 'ar';

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'nodes' | 'pricing'>('overview');

  // Interactive UI Datasets
  const [stats, setStats] = useState(initialStats);
  const [users, setUsers] = useState(initialUsers);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [pendingNodes, setPendingNodes] = useState(initialPendingNodes);
  const [pricingSettings, setPricingSettings] = useState<PricingSetting[]>(initialPricingSettings);

  // Search Filters
  const [userSearch, setUserSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');

  // Loading States for Actions
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Pricing Form State
  const [pricingForm, setPricingForm] = useState<Record<string, { price_monthly: string; price_annual: string; stripe_monthly_price_id: string; stripe_annual_price_id: string }>>(
    initialPricingSettings.reduce((acc, curr) => {
      acc[curr.plan] = {
        price_monthly: String(curr.price_monthly),
        price_annual: String(curr.price_annual),
        stripe_monthly_price_id: curr.stripe_monthly_price_id || '',
        stripe_annual_price_id: curr.stripe_annual_price_id || '',
      };
      return acc;
    }, {} as any)
  );

  // Localized dictionary
  const t = {
    title: isRtl ? 'لوحة إدارة النظام' : 'System Administration Portal',
    desc: isRtl 
      ? 'تحكم في حسابات المستخدمين، اشتراكات مساحات العمل، عقد الماركت بليس، وإحصائيات المنصة الكلية.' 
      : 'Oversee user accounts, workspace subscriptions, marketplace extensions, and overall platform metrics.',
    tabs: {
      overview: isRtl ? 'الإحصائيات الكلية' : 'System Overview',
      users: isRtl ? 'الحسابات والمستخدمين' : 'Accounts & Users',
      subscriptions: isRtl ? 'الاشتراكات والخطط' : 'Subscriptions & Limits',
      nodes: isRtl ? 'مراجعة الماركت بليس' : 'Marketplace Reviews',
      pricing: isRtl ? 'إدارة التسعير' : 'Pricing Settings',
    },
    stats: {
      totalUsers: isRtl ? 'إجمالي الأعضاء' : 'Total Registered Users',
      totalWorkspaces: isRtl ? 'مساحات العمل' : 'Workspaces Created',
      marketplaceNodes: isRtl ? 'عقد الماركت بليس' : 'Marketplace Nodes',
      activeSubs: isRtl ? 'الاشتراكات النشطة' : 'Active Subscriptions',
      estimatedMrr: isRtl ? 'العائد الشهري المقدر' : 'Estimated Monthly Revenue',
      pendingReviews: isRtl ? 'طلبات مراجعة العقد' : 'Pending Node Reviews',
    },
    users: {
      searchPlaceholder: isRtl ? 'بحث باسم المستخدم أو البريد الإلكتروني...' : 'Search by name or email address...',
      tableHeaderName: isRtl ? 'المستخدم' : 'User Details',
      tableHeaderJoined: isRtl ? 'تاريخ الانضمام' : 'Joined Date',
      tableHeaderRole: isRtl ? 'مسؤول النظام (Admin)' : 'System Administrator',
      selfBadge: isRtl ? 'أنت' : 'You',
    },
    subs: {
      searchPlaceholder: isRtl ? 'بحث باسم مساحة العمل أو المالك...' : 'Search by workspace name or owner...',
      tableWorkspace: isRtl ? 'مساحة العمل' : 'Workspace Name',
      tableOwner: isRtl ? 'المالك' : 'Owner',
      tablePlan: isRtl ? 'الخطة الحالية' : 'Subscription Plan',
      tableCustomer: isRtl ? 'معرف العميل (Stripe)' : 'Stripe Customer ID',
      tableStatus: isRtl ? 'حالة الدفع' : 'Billing Status',
      actionAdjust: isRtl ? 'تعديل الخطة يدوياً' : 'Manually Change Plan',
    },
    nodes: {
      noPending: isRtl ? 'لا توجد طلبات مراجعة حالية للعقد.' : 'No custom nodes currently pending review.',
      author: isRtl ? 'المطور' : 'Author',
      category: isRtl ? 'القسم' : 'Category',
      visibility: isRtl ? 'الظهور' : 'Visibility',
      approve: isRtl ? 'قبول ونشر' : 'Approve & Publish',
      reject: isRtl ? 'رفض' : 'Reject',
      specs: isRtl ? 'الخصائص والمدخلات' : 'Handles & Parameters',
    },
    common: {
      error: isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred',
      success: isRtl ? 'تم بنجاح!' : 'Action completed successfully!',
      saving: isRtl ? 'جاري الحفظ...' : 'Saving changes...',
    }
  };

  // Helper to trigger refetch of datasets
  const refetchAllData = async () => {
    const [statsRes, usersRes, subsRes, pendingNodesRes, pricingRes] = await Promise.all([
      getAdminStats(),
      getAdminUsers(),
      getAdminSubscriptions(),
      getAdminPendingNodes(),
      getPricingSettings()
    ]);
    if (statsRes.success) setStats(statsRes.data!);
    if (usersRes.success) setUsers(usersRes.data!);
    if (subsRes.success) setSubscriptions(subsRes.data!);
    if (pendingNodesRes.success) setPendingNodes(pendingNodesRes.data!);
    if (pricingRes.success && pricingRes.data) {
      setPricingSettings(pricingRes.data);
      setPricingForm(
        pricingRes.data.reduce((acc: any, curr: any) => {
          acc[curr.plan] = {
            price_monthly: String(curr.price_monthly),
            price_annual: String(curr.price_annual),
            stripe_monthly_price_id: curr.stripe_monthly_price_id || '',
            stripe_annual_price_id: curr.stripe_annual_price_id || '',
          };
          return acc;
        }, {} as any)
      );
    }
  };

  const handlePricingFormChange = (plan: PlanType, field: string, value: string) => {
    setPricingForm((prev) => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [field]: value
      }
    }));
  };

  const handleSavePricing = async (plan: PlanType) => {
    const form = pricingForm[plan];
    if (!form) return;

    const price_monthly = Number(form.price_monthly);
    const price_annual = Number(form.price_annual);

    if (isNaN(price_monthly) || isNaN(price_annual) || price_monthly < 0 || price_annual < 0) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في المدخلات' : 'Invalid Input',
        isRtl ? 'يرجى إدخال أرقام صحيحة وغير سالبة للأسعار.' : 'Please enter valid non-negative numbers for pricing.',
        isRtl ? 'حسناً' : 'OK'
      );
      return;
    }

    const actionId = `pricing-${plan}`;
    setLoadingAction(actionId);

    const res = await updatePricingSettings(plan, {
      price_monthly,
      price_annual,
      stripe_monthly_price_id: form.stripe_monthly_price_id,
      stripe_annual_price_id: form.stripe_annual_price_id
    });

    setLoadingAction(null);

    if (res.error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في حفظ الأسعار' : 'Error Saving Pricing',
        res.error,
        isRtl ? 'حسناً' : 'OK'
      );
    } else {
      await refetchAllData();
      useDialogStore.getState().showAlert(
        isRtl ? 'تم الحفظ بنجاح' : 'Pricing Settings Saved',
        isRtl ? `تم تحديث أسعار خطة ${plan} بنجاح.` : `Pricing settings for plan ${plan} updated successfully.`,
        isRtl ? 'موافق' : 'Done'
      );
    }
  };

  // Toggle Admin status action handler
  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    const actionId = `admin-${userId}`;
    setLoadingAction(actionId);

    const res = await toggleAdminStatus(userId, !currentStatus);
    setLoadingAction(null);

    if (res.error) {
      if (res.error === 'CANNOT_DEMOTE_SELF') {
        useDialogStore.getState().showAlert(
          isRtl ? 'غير مسموح' : 'Action Denied',
          isRtl ? 'لا يمكنك إزالة صلاحيات الآدمن الخاصة بك تجنباً لإغلاق الحساب.' : 'You cannot revoke admin permissions from your own account.',
          isRtl ? 'حسناً' : 'OK'
        );
      } else {
        useDialogStore.getState().showAlert(
          isRtl ? 'خطأ في التعديل' : 'Modification Error',
          res.error,
          isRtl ? 'حسناً' : 'OK'
        );
      }
    } else {
      await refetchAllData();
    }
  };

  // Manual Plan adjustment action handler
  const handlePlanChange = async (workspaceId: string, newPlan: PlanType) => {
    const actionId = `plan-${workspaceId}`;
    setLoadingAction(actionId);

    const res = await updateWorkspacePlan(workspaceId, newPlan);
    setLoadingAction(null);

    if (res.error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في تعديل الخطة' : 'Plan Update Error',
        res.error,
        isRtl ? 'حسناً' : 'OK'
      );
    } else {
      await refetchAllData();
      useDialogStore.getState().showAlert(
        isRtl ? 'تم تحديث الخطة' : 'Plan Tier Updated',
        isRtl ? 'تم تغيير حدود خطة مساحة العمل بنجاح.' : 'Workspace subscription levels manual override applied successfully.',
        isRtl ? 'موافق' : 'Done'
      );
    }
  };

  // Node Review Action (Approve / Reject)
  const handleReviewNode = async (nodeId: string, action: 'approve' | 'reject') => {
    const actionId = `node-${nodeId}`;
    setLoadingAction(actionId);

    const res = await reviewMarketplaceNode(nodeId, action);
    setLoadingAction(null);

    if (res.error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في مراجعة العقدة' : 'Node Review Error',
        res.error,
        isRtl ? 'حسناً' : 'OK'
      );
    } else {
      await refetchAllData();
    }
  };

  // Filter lists based on searches
  const filteredUsers = users.filter((u) => {
    const query = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      (u.full_name || '').toLowerCase().includes(query)
    );
  });

  const filteredSubs = subscriptions.filter((s) => {
    const query = subSearch.toLowerCase();
    const wsName = s.workspaces?.name || '';
    const ownerName = s.workspaces?.profiles?.full_name || '';
    const ownerEmail = s.workspaces?.profiles?.email || '';
    return (
      wsName.toLowerCase().includes(query) ||
      ownerName.toLowerCase().includes(query) ||
      ownerEmail.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary p-1.5 rounded-lg shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text bg-linear-to-r from-foreground to-foreground/80">
              {t.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            {t.desc}
          </p>
        </div>

        <Button
          onClick={refetchAllData}
          variant="outline"
          className="rounded-xl border-border hover:bg-muted font-bold text-xs h-9 cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 mr-1 rtl:ml-1 animate-pulse" />
          <span>{isRtl ? 'تحديث البيانات' : 'Refresh System Logs'}</span>
        </Button>
      </div>

      {/* 2. Admin System Navigation Tabs */}
      <div className="flex border-b border-border/80 overflow-x-auto scrollbar-none gap-2">
        {(Object.keys(t.tabs) as Array<keyof typeof t.tabs>).map((tabKey) => {
          const isActive = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`py-3.5 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'border-primary text-primary font-bold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.tabs[tabKey]}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}
      
      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Overview Cards Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Registered Users Card */}
            <Card className="bg-background/40 backdrop-blur-md border-border/60 hover:border-primary/20 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.stats.totalUsers}
                </CardTitle>
                <Users className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.totalUsers}</div>
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-light">
                  {isRtl ? 'إجمالي الحسابات المسجلة في قاعدة البيانات' : 'Accounts authenticated on platform database.'}
                </p>
              </CardContent>
            </Card>

            {/* Workspaces Card */}
            <Card className="bg-background/40 backdrop-blur-md border-border/60 hover:border-primary/20 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.stats.totalWorkspaces}
                </CardTitle>
                <Building2 className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.totalWorkspaces}</div>
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-light">
                  {isRtl ? 'إجمالي مساحات العمل والمشاريع النشطة' : 'Active shared workspace configurations.'}
                </p>
              </CardContent>
            </Card>

            {/* MRR Card */}
            <Card className="backdrop-blur-md border-emerald-500/10 hover:border-emerald-500/30 bg-emerald-500/5 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {t.stats.estimatedMrr}
                </CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {isRtl ? `${stats.estimatedMrr.toLocaleString()} ج.م` : `${stats.estimatedMrr.toLocaleString()} EGP`}
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-light">
                  {isRtl ? 'حساب تقديري بناء على الاشتراكات النشطة حالياً' : 'Sum of monthly price valuations of active tiers.'}
                </p>
              </CardContent>
            </Card>

            {/* Active Subscriptions Card */}
            <Card className="bg-background/40 backdrop-blur-md border-border/60 hover:border-primary/20 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.stats.activeSubs}
                </CardTitle>
                <CreditCard className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.totalSubscriptions}</div>
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-light">
                  {isRtl ? 'المشتركون بالخطط المدفوعة والتجريبية' : 'Paid enterprise limits active accounts count.'}
                </p>
              </CardContent>
            </Card>

            {/* Marketplace Nodes Card */}
            <Card className="bg-background/40 backdrop-blur-md border-border/60 hover:border-primary/20 shadow-xs transition-all hover:-translate-y-0.5 duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.stats.marketplaceNodes}
                </CardTitle>
                <Store className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.totalMarketplaceNodes}</div>
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-light">
                  {isRtl ? 'إجمالي العقد الجاهزة والمرفوعة في المتجر' : 'Published and certified canvas tool options.'}
                </p>
              </CardContent>
            </Card>

            {/* Pending Reviews Card */}
            <Card className={`bg-background/40 backdrop-blur-md border-border/60 shadow-xs transition-all hover:-translate-y-0.5 duration-200 ${stats.pendingNodesCount > 0 && 'border-amber-500/20 bg-amber-500/5'}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.stats.pendingReviews}
                </CardTitle>
                <Clock className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stats.pendingNodesCount}</div>
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-light">
                  {isRtl ? 'عقد مخصصة أرسلها المطورون وتحتاج مراجعة' : 'Nodes awaiting administration approval before publish.'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Shortcuts */}
          <Card className="bg-background/40 backdrop-blur-md border-border/60">
            <CardHeader>
              <CardTitle className="text-sm font-bold">{isRtl ? 'إجراءات سريعة' : 'Administrative Quick Tasks'}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button onClick={() => setActiveTab('users')} className="bg-primary/10 text-primary hover:bg-primary/20 rounded-xl px-5 h-9 cursor-pointer text-xs font-semibold">
                {isRtl ? 'إدارة المستخدمين وصلاحيات الآدمن' : 'Manage User Ranks'}
              </Button>
              <Button onClick={() => setActiveTab('subscriptions')} className="bg-primary/10 text-primary hover:bg-primary/20 rounded-xl px-5 h-9 cursor-pointer text-xs font-semibold">
                {isRtl ? 'ترقية حسابات مساحات العمل' : 'Override Plan Capacity'}
              </Button>
              <Button onClick={() => setActiveTab('nodes')} className="bg-primary/10 text-primary hover:bg-primary/20 rounded-xl px-5 h-9 cursor-pointer text-xs font-semibold relative">
                {isRtl ? 'مراجعة عقد متجر الماركت بليس' : 'Review Node Catalog'}
                {stats.pendingNodesCount > 0 && (
                  <span className="absolute -top-1.5 -inset-e-1.5 w-4.5 h-4.5 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold animate-bounce">
                    {stats.pendingNodesCount}
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute inset-s-4.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t.users.searchPlaceholder}
              className="ps-11 py-5.5 rounded-xl border-border/60 focus:ring-accent w-full text-sm"
            />
          </div>

          {/* Users Table */}
          <Card className="bg-background/40 backdrop-blur-md border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground font-bold">
                    <th className="p-4 text-start font-semibold">{t.users.tableHeaderName}</th>
                    <th className="p-4 text-start font-semibold">{t.users.tableHeaderJoined}</th>
                    <th className="p-4 text-center font-semibold w-56">{t.users.tableHeaderRole}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground font-bold flex items-center justify-center uppercase text-sm border border-primary/10">
                          {user.full_name?.charAt(0) || user.email.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-foreground truncate max-w-[200px]">
                            {user.full_name || (isRtl ? 'مستعمل بدون اسم' : 'Unnamed User')}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-light truncate max-w-[240px]">
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground font-light">
                        {new Date(user.created_at).toLocaleDateString(locale, { dateStyle: 'medium' })}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {loadingAction === `admin-${user.id}` ? (
                            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          ) : (
                            <Switch
                              checked={user.is_admin}
                              onCheckedChange={() => handleToggleAdmin(user.id, user.is_admin)}
                            />
                          )}
                          <span className={`text-[10px] font-bold ${user.is_admin ? 'text-primary' : 'text-muted-foreground/60'}`}>
                            {user.is_admin ? (isRtl ? 'مسؤول (Admin)' : 'Admin') : (isRtl ? 'مستخدم عادي' : 'Standard User')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTIONS & LIMITS OVERRIDES */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute inset-s-4.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              placeholder={t.subs.searchPlaceholder}
              className="ps-11 py-5.5 rounded-xl border-border/60 focus:ring-accent w-full text-sm"
            />
          </div>

          {/* Subscriptions Table */}
          <Card className="bg-background/40 backdrop-blur-md border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground font-bold">
                    <th className="p-4 text-start font-semibold">{t.subs.tableWorkspace}</th>
                    <th className="p-4 text-start font-semibold">{t.subs.tableOwner}</th>
                    <th className="p-4 text-center font-semibold w-40">{t.subs.tableStatus}</th>
                    <th className="p-4 text-center font-semibold w-56">{t.subs.actionAdjust}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSubs.map((sub) => {
                    const ws = sub.workspaces;
                    const owner = ws?.profiles;
                    const plan = ws?.plan || sub.plan || 'free';
                    const activeLoading = loadingAction === `plan-${sub.workspace_id}`;

                    return (
                      <tr key={sub.id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-foreground truncate max-w-[200px]">
                              {ws?.name || (isRtl ? 'مساحة افتراضية' : 'Sandbox Workspace')}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 font-light font-mono truncate max-w-[180px]">
                              {sub.stripe_customer_id || (isRtl ? 'بدون معرف دفع' : 'No Stripe ID')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {owner ? (
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-foreground truncate max-w-[150px]">
                                {owner.full_name || (isRtl ? 'مستخدم' : 'User')}
                              </span>
                              <span className="text-[10px] text-muted-foreground/75 font-light truncate max-w-[180px]">
                                {owner.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">{isRtl ? 'غير معروف' : 'Unknown'}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Badge 
                            variant="outline" 
                            className={`rounded-full px-2.5 py-0.5 capitalize text-[9px] font-bold ${
                              sub.status === 'active' || sub.status === 'trialing'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {sub.status || 'active'}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {activeLoading ? (
                              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            ) : (
                              <select
                                value={plan}
                                onChange={(e) => handlePlanChange(sub.workspace_id, e.target.value as PlanType)}
                                className="bg-background text-foreground border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-hidden cursor-pointer w-36 hover:bg-muted"
                              >
                                <option value="free">{isRtl ? 'المجانية (Free)' : 'Free Tier'}</option>
                                {(Object.keys(DEFAULT_PRICING) as PlanType[]).map((pPlan) => {
                                  const dbPlan = pricingSettings.find(p => p.plan === pPlan);
                                  const price = dbPlan ? dbPlan.price_monthly : DEFAULT_PRICING[pPlan as keyof typeof DEFAULT_PRICING].price_monthly;
                                  return (
                                    <option key={pPlan} value={pPlan}>
                                      {pPlan.charAt(0).toUpperCase() + pPlan.slice(1)} ({price} {isRtl ? 'ج.م' : 'EGP'})
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: MARKETPLACE NODE REVIEWS */}
      {activeTab === 'nodes' && (
        <div className="space-y-6 animate-fadeIn">
          {pendingNodes.length === 0 ? (
            <div className="bg-background/40 border border-border p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground border border-border">
                <Store className="w-6 h-6 opacity-60" />
              </div>
              <span className="font-bold text-sm text-muted-foreground">
                {t.nodes.noPending}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingNodes.map((node) => {
                const author = node.profiles;
                const activeLoading = loadingAction === `node-${node.id}`;

                return (
                  <Card key={node.id} className="bg-background/45 backdrop-blur-md border border-border flex flex-col justify-between overflow-hidden group">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${node.color_class || 'bg-primary/10 text-primary'} shrink-0 border border-border/80`}>
                            {node.icon === 'branch' && <ArrowUpDown className="w-5 h-5" />}
                            {node.icon === 'loop' && <PlayCircle className="w-5 h-5" />}
                            {node.icon === 'data' && <Layers className="w-5 h-5" />}
                            {node.icon !== 'branch' && node.icon !== 'loop' && node.icon !== 'data' && (
                              <span>{node.icon || '📦'}</span>
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-sm font-extrabold truncate max-w-[200px]">
                              {node.name}
                            </CardTitle>
                            <span className="text-[10px] text-muted-foreground/60 font-light block mt-0.5">
                              {t.nodes.category}: {node.category}
                            </span>
                          </div>
                        </div>

                        <Badge variant="outline" className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] font-bold">
                          {isRtl ? 'تحت المراجعة' : 'Pending Review'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="py-4 space-y-4 flex-1">
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">
                        {node.description}
                      </p>

                      {/* Author credentials */}
                      <div className="bg-muted/40 border border-border/40 rounded-xl p-3 flex flex-col gap-1.5 text-[10px]">
                        <span className="font-bold text-muted-foreground">{t.nodes.author}</span>
                        {author ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{author.full_name || 'Anonymous Developer'}</span>
                            <span className="text-[9px] text-muted-foreground/80">{author.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">{isRtl ? 'غير معروف' : 'Unknown Author'}</span>
                        )}
                      </div>
                    </CardContent>

                    {/* Bottom Controls */}
                    <div className="border-t border-border/40 p-4 flex gap-3 bg-muted/20">
                      <Button
                        onClick={() => handleReviewNode(node.id, 'approve')}
                        disabled={activeLoading}
                        className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs h-9 rounded-xl cursor-pointer"
                      >
                        {activeLoading ? (
                          <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 rtl:ml-1 shrink-0" />
                            <span>{t.nodes.approve}</span>
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => handleReviewNode(node.id, 'reject')}
                        disabled={activeLoading}
                        variant="outline"
                        className="border-border hover:bg-destructive/10 hover:text-destructive font-bold text-xs h-9 rounded-xl cursor-pointer text-muted-foreground/85 px-4"
                      >
                        {activeLoading ? (
                          <div className="w-4 h-4 rounded-full border-2 border-destructive border-t-transparent animate-spin" />
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5 mr-1 rtl:ml-1 shrink-0" />
                            <span>{t.nodes.reject}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PRICING SETTINGS */}
      {activeTab === 'pricing' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.keys(DEFAULT_PRICING) as PlanType[]).map((plan) => {
              const form = pricingForm[plan] || { price_monthly: '0', price_annual: '0', stripe_monthly_price_id: '', stripe_annual_price_id: '' };
              const activeLoading = loadingAction === `pricing-${plan}`;

              return (
                <Card key={plan} className="bg-background/45 backdrop-blur-md border border-border overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                    <div className="flex items-center gap-2">
                      <div className="bg-accent/15 text-accent p-1.5 rounded-lg shrink-0 border border-accent/20">
                        <Settings className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-sm font-extrabold capitalize">
                        {plan} Plan Settings
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Monthly Price */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isRtl ? 'السعر الشهري (ج.م)' : 'Monthly Price (EGP)'}
                        </label>
                        <Input
                          type="number"
                          value={form.price_monthly}
                          onChange={(e) => handlePricingFormChange(plan, 'price_monthly', e.target.value)}
                          className="rounded-xl border-border bg-background/50 h-9 font-mono text-xs"
                          min="0"
                        />
                      </div>

                      {/* Annual Price */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isRtl ? 'السعر السنوي (ج.م)' : 'Annual Price (EGP)'}
                        </label>
                        <Input
                          type="number"
                          value={form.price_annual}
                          onChange={(e) => handlePricingFormChange(plan, 'price_annual', e.target.value)}
                          className="rounded-xl border-border bg-background/50 h-9 font-mono text-xs"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-border/40">
                      {/* Stripe Monthly ID */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isRtl ? 'معرف سعر Stripe الشهري' : 'Stripe Monthly Price ID'}
                        </label>
                        <Input
                          type="text"
                          value={form.stripe_monthly_price_id}
                          onChange={(e) => handlePricingFormChange(plan, 'stripe_monthly_price_id', e.target.value)}
                          placeholder="price_..."
                          className="rounded-xl border-border bg-background/50 h-9 font-mono text-xs"
                        />
                      </div>

                      {/* Stripe Annual ID */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isRtl ? 'معرف سعر Stripe السنوي' : 'Stripe Annual Price ID'}
                        </label>
                        <Input
                          type="text"
                          value={form.stripe_annual_price_id}
                          onChange={(e) => handlePricingFormChange(plan, 'stripe_annual_price_id', e.target.value)}
                          placeholder="price_..."
                          className="rounded-xl border-border bg-background/50 h-9 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>

                  {/* Save Footer */}
                  <div className="border-t border-border/40 p-4 bg-muted/20 flex justify-end">
                    <Button
                      onClick={() => handleSavePricing(plan)}
                      disabled={activeLoading}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs h-9 rounded-xl px-4 cursor-pointer flex items-center gap-1.5"
                    >
                      {activeLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{isRtl ? 'حفظ التغييرات' : 'Save Pricing'}</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
