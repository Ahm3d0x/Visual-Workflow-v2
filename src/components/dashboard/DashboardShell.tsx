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
    { name: isRtl ? 'مخططات العمل' : 'Workflows', href: `/${locale}/dashboard${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: GitBranch },
    { name: isRtl ? 'متجر العقد' : 'Marketplace', href: `/${locale}/marketplace${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: Store },
    { name: isRtl ? 'صانع العقد' : 'Node Creator', href: `/${locale}/node-creator${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: Puzzle },
    ...(activeWorkspace && activeWorkspace.role === 'owner' ? [
      { name: isRtl ? 'إعدادات مساحة العمل' : 'Workspace settings', href: `/${locale}/settings/workspace${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: Settings }
    ] : []),
    { name: isRtl ? 'الخطط والاشتراكات' : 'Billing & Plans', href: `/${locale}/billing${activeWorkspace ? `?w=${activeWorkspace.id}` : ''}`, icon: CreditCard },
    { name: isRtl ? 'دليل المساعدة' : 'Help & Documentation', href: `/${locale}/help`, icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen flex bg-canvas text-foreground transition-colors duration-300">
      {/* 1. SIDEBAR */}
      <aside
        className={`fixed inset-y-0 start-0 z-40 flex flex-col bg-sidebar border-e border-border transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl flex items-center justify-center shrink-0">
              <Workflow className="w-5 h-5 animate-pulse" />
            </div>
            {!collapsed && (
              <span className="font-bold text-base tracking-tight truncate bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                Visual Workflow
              </span>
            )}
          </div>
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

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className={`w-full justify-start gap-3 py-3 rounded-xl hover:bg-muted transition-all cursor-pointer flex items-center text-foreground hover:no-underline select-none ${
                collapsed ? 'px-0 justify-center' : 'px-4'
              }`}
            >
              <item.icon className="w-5 h-5 text-accent shrink-0" />
              {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border flex flex-col gap-2">
          {!collapsed && (
            <Button
              onClick={handleSignOut}
              disabled={isPending}
              variant="outline"
              className="w-full border-border hover:bg-destructive/10 hover:text-destructive font-medium rounded-xl py-5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{tAuth('sign_out')}</span>
            </Button>
          )}
          {collapsed && (
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
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ps-20' : 'ps-64'}`}>
        {/* Top Navbar */}
        <header className="h-16 sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Button variant="ghost" size="icon" className="lg:hidden w-10 h-10 border border-border rounded-xl">
              <Menu className="w-5 h-5" />
            </Button>

            {/* Workspace Switcher */}
            {activeWorkspace && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-xl text-sm font-semibold hover:bg-muted cursor-pointer transition-all focus:outline-hidden select-none">
                  <Building className="w-4 h-4 text-accent" />
                  <span className="max-w-[120px] truncate">{activeWorkspace.name}</span>
                  <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                    {activeWorkspace.plan}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background border border-border rounded-xl shadow-lg w-56 font-sans">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-light px-2 py-1.5">
                      {isRtl ? 'اختر مساحة عمل' : 'Select Workspace'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    {workspaces.map((ws) => (
                      <DropdownMenuItem
                        key={ws.id}
                        onClick={() => handleSelectWorkspace(ws)}
                        className="cursor-pointer gap-2 rounded-lg m-1 font-medium"
                      >
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate flex-1">{ws.name}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => setCreateWsOpen(true)}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-semibold text-accent hover:text-accent-foreground"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isRtl ? 'إنشاء مساحة عمل' : 'Create Workspace'}</span>
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
                <DropdownMenuTrigger className="rounded-full w-10 h-10 cursor-pointer overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-all focus:outline-hidden">
                  <div className="w-full h-full bg-accent text-accent-foreground font-bold flex items-center justify-center uppercase text-sm">
                    {profile.full_name?.charAt(0) || profile.email.charAt(0)}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg w-56 font-sans">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-3 py-2">
                      <p className="font-bold text-sm truncate">{profile.full_name || (isRtl ? 'مستخدم' : 'User')}</p>
                      <p className="font-light text-xs text-muted-foreground truncate">{profile.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/profile')}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-medium"
                    >
                      <User className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'الملف الشخصي' : 'Profile'}
                    </DropdownMenuItem>
                    {activeWorkspace && activeWorkspace.role === 'owner' && (
                      <DropdownMenuItem
                        onClick={() => router.push(`/settings/workspace?w=${activeWorkspace.id}`)}
                        className="cursor-pointer gap-2 rounded-lg m-1 font-medium"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'الإعدادات' : 'Settings'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => router.push('/terms')}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs"
                    >
                      <Shield className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'شروط الخدمة' : 'Terms of Service'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/privacy')}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs"
                    >
                      <Shield className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer gap-2 rounded-lg m-1 font-semibold text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive text-xs"
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
