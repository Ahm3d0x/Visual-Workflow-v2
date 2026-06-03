'use client';

import { useState, useTransition, useEffect } from 'react';
import { useDialogStore } from '@/stores/dialogStore';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { signOut } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Workflow,
  Home,
  GitBranch,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Building,
  Menu,
  Plus,
  Loader2,
  HelpCircle,
  Shield,
  Store,
  Puzzle,
  X,
  Info,
  Presentation,
} from 'lucide-react';
import Link from 'next/link';
import { createWorkspace } from '@/actions/workspace.actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';

interface DashboardShellProps {
  children: React.ReactNode;
  locale: string;
  profile: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    is_admin?: boolean;
  } | null;
  workspaces: Array<{
    id: string;
    name: string;
    plan: string;
    role?: string;
  }>;
}

export function DashboardShell({ children, locale, profile, workspaces }: DashboardShellProps) {
  const isRtl = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [activeWorkspace, setActiveWorkspace] = useState(() => workspaces[0] || null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const wsId = params.get('w');
      if (wsId) {
        const found = workspaces.find((w) => w.id === wsId);
        if (found) {
          setTimeout(() => {
            setActiveWorkspace(found);
          }, 0);
        }
      }
    }
  }, [workspaces]);

  const [isPending, startTransition] = useTransition();
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [wsLoading, setWsLoading] = useState(false);
  const tAuth = useTranslations('auth');

  const handleSignOut = async () => {
    startTransition(async () => {
      const res = await signOut();
      if (!res?.error) {
        router.push('/auth/sign-in');
      }
    });
  };

  const handleSelectWorkspace = (ws: { id: string; name: string; plan: string }) => {
    setActiveWorkspace(ws);
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('w', ws.id);
    router.push(`${pathname}?${searchParams.toString()}`);
  };

  const handleCreateWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    setWsLoading(true);
    const res = await createWorkspace(newWsName);
    setWsLoading(false);

    if (res.error) {
      if (res.error === 'PLAN_LIMIT_REACHED') {
        useDialogStore.getState().showAlert(
          isRtl ? 'تم الوصول إلى الحد الأقصى للخطة' : 'Plan Limit Reached',
          isRtl 
            ? `لقد وصلت إلى الحد الأقصى للخطة! تسمح خطتك بإنشاء ما يصل إلى ${res.data?.limit} مساحات عمل. يرجى الترقية لإنشاء المزيد.` 
            : `Plan limit reached! Your plan allows up to ${res.data?.limit} workspaces. Please upgrade to create more.`,
          isRtl ? 'حسناً' : 'OK'
        );
      } else {
        useDialogStore.getState().showAlert(
          isRtl ? 'خطأ في إنشاء مساحة العمل' : 'Workspace Creation Error',
          (isRtl ? 'فشل إنشاء مساحة العمل: ' : 'Failed to create workspace: ') + res.error,
          isRtl ? 'حسناً' : 'OK'
        );
      }
    } else if (res.data?.workspaceId) {
      setNewWsName('');
      setCreateWsOpen(false);
      // Re-route to the newly created workspace
      window.location.href = `/${locale}/dashboard?w=${res.data.workspaceId}`;
    }
  };

  const navItems = [
    { name: isRtl ? 'لوحة التحكم' : 'Dashboard', href: `/${locale}/dashboard${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: Home },
    { name: isRtl ? 'مخططات العمل' : 'Workflows', href: `/${locale}/dashboard${activeWorkspace ? `?w=${activeWorkspace.id}&tab=workflows` : '?tab=workflows'}`, icon: GitBranch },
    { name: isRtl ? 'اللوحات البيضاء' : 'Whiteboards', href: `/${locale}/dashboard${activeWorkspace ? `?w=${activeWorkspace.id}&tab=whiteboards` : '?tab=whiteboards'}`, icon: Presentation },
    { name: isRtl ? 'متجر العقد' : 'Marketplace', href: `/${locale}/marketplace${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: Store },
    { name: isRtl ? 'صانع العقد' : 'Node Creator', href: `/${locale}/node-creator${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: Puzzle },
    ...(activeWorkspace && activeWorkspace.role === 'owner' ? [
      { name: isRtl ? 'إعدادات مساحة العمل' : 'Workspace settings', href: `/${locale}/settings/workspace${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: Settings }
    ] : []),
    { name: isRtl ? 'الخطط والاشتراكات' : 'Billing & Plans', href: `/${locale}/billing${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: CreditCard },
    ...(profile?.is_admin ? [
      { name: isRtl ? 'لوحة الإدارة' : 'Admin Dashboard', href: `/${locale}/admin`, icon: Shield }
    ] : []),
    { name: isRtl ? 'حول المنصة' : 'About Platform', href: `/${locale}/about${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: Info },
    { name: isRtl ? 'دليل المساعدة' : 'Help & Documentation', href: `/${locale}/help`, icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen flex bg-canvas text-foreground transition-colors duration-300">
      {/* Backdrop for Mobile Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 1. SIDEBAR */}
      <aside
        className={`fixed inset-y-0 inset-s-0 z-50 flex flex-col bg-background/60 dark:bg-zinc-950/40 backdrop-blur-xl border-e border-border transition-all duration-300 ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          mobileOpen ? 'inset-s-0 w-64' : '-inset-s-64 lg:inset-s-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-primary/10">
              <Workflow className="w-5 h-5 animate-pulse" />
            </div>
            {(!collapsed || mobileOpen) && (
              <span className="font-bold text-base tracking-tight truncate bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                Visual Workflow
              </span>
            )}
          </div>
          {/* Mobile Close Button */}
          {mobileOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {/* Desktop Collapse Buttons */}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hidden lg:flex"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </Button>
          )}
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hidden lg:flex mx-auto"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Button>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            const normalizedHref = item.href.split('?')[0];
            const hasTabParam = item.href.includes('tab=');
            const itemTab = hasTabParam 
              ? (item.href.includes('tab=workflows') ? 'workflows' : 'whiteboards') 
              : null;

            let isActive = false;
            if (pathname === '/') {
              isActive = normalizedHref === `/${locale}/dashboard` || normalizedHref === `/${locale}`;
            } else {
              const matchesPath = normalizedHref === `/${locale}${pathname}` || 
                (pathname !== '/dashboard' && normalizedHref.startsWith(`/${locale}${pathname}`));
              
              if (matchesPath) {
                if (normalizedHref.endsWith('/dashboard')) {
                  const currentTab = typeof window !== 'undefined' 
                    ? new URLSearchParams(window.location.search).get('tab') 
                    : null;
                  isActive = itemTab === currentTab;
                } else {
                  isActive = true;
                }
              }
            }

            return (
              <Link
                key={idx}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`w-full justify-start gap-3 py-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center hover:no-underline select-none relative group ${
                  isActive 
                    ? 'bg-accent/10 dark:bg-accent/15 text-accent font-bold' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium'
                } ${
                  (collapsed && !mobileOpen) ? 'px-0 justify-center' : 'px-4'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-accent animate-pulse' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {(!collapsed || mobileOpen) && <span className="text-sm">{item.name}</span>}
                
                {/* Active Sidebar Indicator Strip */}
                {isActive && (
                  <div className="absolute left-0 rtl:right-0 w-1 h-6 bg-accent rounded-full animate-fadeIn" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border flex flex-col gap-2">
          {(!collapsed || mobileOpen) && (
            <Button
              onClick={handleSignOut}
              disabled={isPending}
              variant="outline"
              className="w-full border-border hover:bg-destructive/10 hover:text-destructive font-semibold rounded-xl py-5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{tAuth('sign_out')}</span>
            </Button>
          )}
          {(collapsed && !mobileOpen) && (
            <Button
              onClick={handleSignOut}
              disabled={isPending}
              variant="outline"
              size="icon"
              className="w-10 h-10 border-border hover:bg-destructive/10 hover:text-destructive rounded-xl mx-auto cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* 2. MAIN BODY */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ps-0 ${collapsed ? 'lg:ps-20' : 'lg:ps-64'}`}>
        {/* Top Navbar */}
        <header className="h-16 sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-10 h-10 border border-border rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Workspace Switcher */}
            {activeWorkspace && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/70 backdrop-blur-md rounded-xl text-sm font-semibold cursor-pointer transition-all hover:border-accent/30 shadow-xs focus:outline-hidden select-none">
                  <Building className="w-4 h-4 text-accent animate-pulse" />
                  <span className="max-w-[120px] truncate">{activeWorkspace.name}</span>
                  <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md border ${
                    activeWorkspace.plan.toLowerCase() === 'legend' 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : activeWorkspace.plan.toLowerCase() === 'elite' || activeWorkspace.plan.toLowerCase() === 'champion'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  }`}>
                    {activeWorkspace.plan}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background border border-border rounded-xl shadow-lg w-56 font-sans">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-light px-3 py-2">
                      {isRtl ? 'اختر مساحة عمل' : 'Select Workspace'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    {workspaces.map((ws) => (
                      <DropdownMenuItem
                        key={ws.id}
                        onClick={() => handleSelectWorkspace(ws)}
                        className="cursor-pointer gap-2.5 rounded-lg m-1 font-medium text-xs py-2"
                      >
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate flex-1 font-semibold">{ws.name}</span>
                        <span className={`text-[8px] uppercase font-bold px-1.5 py-0.2 rounded-md ${
                          ws.plan.toLowerCase() === 'legend'
                            ? 'bg-amber-500/10 text-amber-500'
                            : ws.plan.toLowerCase() === 'elite'
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {ws.plan}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => setCreateWsOpen(true)}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-bold text-accent hover:text-accent-foreground text-xs py-2"
                    >
                      <Plus className="w-4 h-4 text-accent" />
                      <span>{isRtl ? 'إنشاء مساحة عمل جديدة' : 'Create Workspace'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle currentLocale={locale} />
            <ThemeToggle />

            {/* Profile Dropdown */}
            {profile && (
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full w-10 h-10 cursor-pointer overflow-hidden border-2 border-primary/20 hover:border-accent transition-all duration-300 focus:outline-hidden shadow-xs">
                  <div className="w-full h-full bg-accent text-accent-foreground font-bold flex items-center justify-center uppercase text-sm">
                    {profile.full_name?.charAt(0) || profile.email.charAt(0)}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg w-56 font-sans">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-3 py-2 border-b border-border mb-1">
                      <p className="font-bold text-sm truncate">{profile.full_name || (isRtl ? 'مستخدم' : 'User')}</p>
                      <p className="font-light text-[10px] text-muted-foreground truncate">{profile.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/profile')}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs"
                    >
                      <User className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'الملف الشخصي' : 'Profile'}
                    </DropdownMenuItem>
                    {profile.is_admin && (
                      <DropdownMenuItem
                        onClick={() => router.push('/admin')}
                        className="cursor-pointer gap-2 rounded-lg m-1 font-semibold text-accent hover:text-accent-foreground text-xs"
                      >
                        <Shield className="w-4 h-4 text-accent animate-pulse" /> {isRtl ? 'لوحة الإدارة' : 'Admin Dashboard'}
                      </DropdownMenuItem>
                    )}

                    {activeWorkspace && activeWorkspace.role === 'owner' && (
                      <DropdownMenuItem
                        onClick={() => router.push(`/settings/workspace?w=${activeWorkspace.id}`)}
                        className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'إعدادات مساحة العمل' : 'Workspace Settings'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => router.push('/terms')}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-[11px]"
                    >
                      <Shield className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'شروط الخدمة' : 'Terms of Service'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/privacy')}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-[11px]"
                    >
                      <Shield className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-bold text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive text-xs"
                    >
                      <LogOut className="w-4 h-4" /> {isRtl ? 'تسجيل الخروج' : 'Sign Out'}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={createWsOpen} onOpenChange={setCreateWsOpen}>
        <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-md p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{isRtl ? 'إنشاء مساحة عمل جديدة' : 'Create Workspace'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newWsName" className="font-semibold text-sm">
                {isRtl ? 'اسم مساحة العمل' : 'Workspace Name'}
              </Label>
              <Input
                id="newWsName"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder={isRtl ? 'فريقي الرائع' : 'My Awesome Team'}
                required
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateWsOpen(false)} className="rounded-xl border-border cursor-pointer">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={wsLoading || !newWsName.trim()} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 cursor-pointer">
                {wsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? 'إنشاء' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
