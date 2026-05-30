/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
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
import { 
  Shield, Trash2, Loader2, ChevronDown, Check, 
  Copy, Link2, UserPlus, Palette, Plus, Sliders, Cpu,
  AlertTriangle, Database
} from 'lucide-react';
import { 
  updateWorkspaceCustomization, 
  createWorkspaceShareLink, 
  revokeWorkspaceShareLink,
  updateWorkspaceSettingsAction,
  deleteWorkspaceAction
} from '@/actions/workspace.actions';
import { createClient } from '@/lib/supabase/client';
import { useDialogStore } from '@/stores/dialogStore';

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
    color: string | null;
    icon: string | null;
    banner: string | null;
    settings: any;
  };
  initialMembers: Member[];
  initialShareLinks: any[];
  currentUserRole: string;
  currentUserId: string;
  locale: string;
}

const COLOR_PRESETS = [
  { name: 'Sky Cyan', hex: '#0284c7', bg: 'bg-sky-500' },
  { name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Sunset Orange', hex: '#f97316', bg: 'bg-orange-500' },
  { name: 'Indigo Dream', hex: '#6366f1', bg: 'bg-indigo-500' },
  { name: 'Rose Red', hex: '#f43f5e', bg: 'bg-rose-500' },
  { name: 'Royal Gold', hex: '#eab308', bg: 'bg-yellow-500' },
];

const EMOJI_PRESETS = ['💼', '🚀', '🎨', '🤖', '📈', '🛠️', '🌐', '🔒', '👥', '⚡'];

const BANNER_PRESETS = [
  { name: 'Midnight Space', class: 'bg-gradient-to-r from-indigo-950 via-purple-950 to-zinc-950' },
  { name: 'Emerald Aurora', class: 'bg-gradient-to-r from-emerald-950 via-teal-950 to-zinc-950' },
  { name: 'Crimson Solar', class: 'bg-gradient-to-r from-rose-950 via-orange-950 to-zinc-950' },
  { name: 'Deep Sea Blue', class: 'bg-gradient-to-r from-blue-950 via-sky-950 to-zinc-950' },
  { name: 'Cyberpunk Neon', class: 'bg-gradient-to-r from-purple-950 via-rose-950 to-zinc-950' },
];

export function WorkspaceSettings({
  initialWorkspace,
  initialMembers,
  initialShareLinks,
  currentUserRole,
  currentUserId,
  locale,
}: WorkspaceSettingsProps) {
  const isRtl = locale === 'ar';
  const router = useRouter();
  const supabase = createClient();

  const getPresetName = (name: string) => {
    if (isRtl) {
      if (name === 'Sky Cyan') return 'سماوي';
      if (name === 'Emerald') return 'زمردي';
      if (name === 'Sunset Orange') return 'برتقالي غروب الشمس';
      if (name === 'Indigo Dream') return 'أزرق نيلي';
      if (name === 'Rose Red') return 'أحمر وردي';
      if (name === 'Royal Gold') return 'ذهبي ملكي';
    }
    return name;
  };

  const getBannerName = (name: string) => {
    if (isRtl) {
      if (name === 'Midnight Space') return 'فضاء منتصف الليل';
      if (name === 'Emerald Aurora') return 'شفق زمردي';
      if (name === 'Crimson Solar') return 'شمس قرمزي';
      if (name === 'Deep Sea Blue') return 'أزرق أعماق البحار';
      if (name === 'Cyberpunk Neon') return 'نيون سايبربانك';
    }
    return name;
  };

  const getRoleLabel = (role: string) => {
    if (isRtl) {
      if (role === 'owner') return 'مالك';
      if (role === 'admin') return 'مدير';
      if (role === 'editor') return 'محرر';
      if (role === 'commenter') return 'معلق';
      if (role === 'viewer') return 'مشاهد';
    }
    return role;
  };

  // Tab State
  type TabType = 'customization' | 'people' | 'preferences' | 'integrations' | 'danger';
  const [activeTab, setActiveTab] = useState<TabType>('customization');

  // Customization States
  const [wsName, setWsName] = useState(initialWorkspace.name);
  const [selectedColor, setSelectedColor] = useState(initialWorkspace.color || '#0284c7');
  const [selectedIcon, setSelectedIcon] = useState(initialWorkspace.icon || '💼');
  const [selectedBanner, setSelectedBanner] = useState(
    initialWorkspace.banner || 'bg-gradient-to-r from-indigo-950 via-purple-950 to-zinc-950'
  );
  const [customizationLoading, setCustomizationLoading] = useState(false);

  // Invite Link States
  const [linkTitle, setLinkTitle] = useState('');
  const [linkRole, setLinkRole] = useState<'admin' | 'editor' | 'commenter' | 'viewer'>('editor');
  const [links, setLinks] = useState<any[]>(initialShareLinks);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Members Management States
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [memberLoading, setMemberLoading] = useState<string | null>(null);

  // Advanced Settings & Preferences
  const initialSettings = initialWorkspace.settings || {};
  const [snapToGrid, setSnapToGrid] = useState(!!initialSettings.snapToGrid);
  const [autoSaveInterval, setAutoSaveInterval] = useState(initialSettings.autoSaveInterval || '30s');
  const [gridBackground, setGridBackground] = useState(initialSettings.gridBackground || 'dots');
  const [strictValidation, setStrictValidation] = useState(
    initialSettings.strictValidation !== undefined ? !!initialSettings.strictValidation : true
  );
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  // AI & Integrations States
  const [geminiEnabled, setGeminiEnabled] = useState(
    initialSettings.geminiEnabled !== undefined ? !!initialSettings.geminiEnabled : true
  );
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  // Danger Zone States
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  // ─── Actions handlers ────────────────────────────────────────────────────────

  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;

    setCustomizationLoading(true);
    const res = await updateWorkspaceCustomization(
      initialWorkspace.id,
      wsName.trim(),
      selectedColor,
      selectedIcon,
      selectedBanner
    );
    setCustomizationLoading(false);

    if (res.error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ' : 'Error',
        (isRtl ? 'فشل تحديث التخصيص: ' : 'Failed to update customization: ') + res.error
      );
    } else {
      useDialogStore.getState().showNotification(
        isRtl ? 'تم تحديث تخصيص مساحة العمل بنجاح!' : 'Workspace customization successfully updated!',
        'success'
      );
      router.refresh();
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreferencesLoading(true);

    const updatedSettings = {
      ...initialWorkspace.settings,
      snapToGrid,
      autoSaveInterval,
      gridBackground,
      strictValidation,
    };

    const res = await updateWorkspaceSettingsAction(initialWorkspace.id, updatedSettings);
    setPreferencesLoading(false);

    if (res.error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ' : 'Error',
        (isRtl ? 'فشل حفظ التفضيلات: ' : 'Failed to save preferences: ') + res.error
      );
    } else {
      useDialogStore.getState().showNotification(
        isRtl ? 'تم حفظ تفضيلات اللوحة بنجاح!' : 'Canvas preferences successfully saved!',
        'success'
      );
      router.refresh();
    }
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntegrationsLoading(true);

    const updatedSettings = {
      ...initialWorkspace.settings,
      geminiEnabled,
    };

    const res = await updateWorkspaceSettingsAction(initialWorkspace.id, updatedSettings);
    setIntegrationsLoading(false);

    if (res.error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ' : 'Error',
        (isRtl ? 'فشل حفظ الإعدادات: ' : 'Failed to save settings: ') + res.error
      );
    } else {
      useDialogStore.getState().showNotification(
        isRtl ? 'تم تحديث إعدادات الذكاء الاصطناعي والربط بنجاح!' : 'AI & Integration settings successfully updated!',
        'success'
      );
      router.refresh();
    }
  };

  const handleDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== initialWorkspace.name) {
      useDialogStore.getState().showAlert(
        isRtl ? 'اسم غير مطابِق' : 'Mismatch Name',
        isRtl ? 'اسم مساحة العمل غير مطابِق!' : 'Workspace name does not match!'
      );
      return;
    }

    setDeleteLoading(true);
    const res = await deleteWorkspaceAction(initialWorkspace.id);
    setDeleteLoading(false);

    if (res.error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ' : 'Error',
        (isRtl ? 'فشل حذف مساحة العمل: ' : 'Failed to delete workspace: ') + res.error
      );
    } else {
      await useDialogStore.getState().showAlert(
        isRtl ? 'نجاح' : 'Success',
        isRtl ? 'تم حذف مساحة العمل بنجاح!' : 'Workspace successfully deleted!'
      );
      window.location.href = `/${locale}/dashboard`;
    }
  };

  const handleCreateInviteLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim()) return;

    setLinkLoading(true);
    const res = await createWorkspaceShareLink(
      initialWorkspace.id,
      linkTitle.trim(),
      linkRole
    );
    setLinkLoading(false);

    if (res.error) {
      if (res.error === 'PLAN_LIMIT_LIMIT_REACHED' || res.error === 'PLAN_LIMIT_REACHED') {
        useDialogStore.getState().showAlert(
          isRtl ? 'حماية باقة الاشتراك' : 'Subscription Guard',
          isRtl ? 'تم الوصول للحد الأقصى للباقة! قم بترقية باقتك لتفعيل المزيد من روابط الدعوة.' : 'Plan Limit Reached! Upgrade your plan to activate more invite links.'
        );
      } else {
        useDialogStore.getState().showAlert(
          isRtl ? 'خطأ' : 'Error',
          (isRtl ? 'فشل إنشاء رابط الدعوة: ' : 'Failed to create invitation link: ') + res.error
        );
      }
    } else {
      useDialogStore.getState().showNotification(
        isRtl ? 'تم إنشاء رابط دعوة مساحة العمل بنجاح!' : 'Workspace invitation link generated successfully!',
        'success'
      );
      setLinkTitle('');
      router.refresh();
      window.location.reload();
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    const title = isRtl ? 'إلغاء رابط الدعوة' : 'Revoke Invite Link';
    const message = isRtl ? 'هل تريد إلغاء هذا الرابط؟ سيتم حظر أي شخص يحاول الانضمام باستخدامه.' : 'Revoke this link? Anyone who tries to join using this token will be blocked.';
    
    const confirmed = await useDialogStore.getState().showConfirm(title, message, {
      confirmText: isRtl ? 'إلغاء الرابط' : 'Revoke Link',
      cancelText: isRtl ? 'إلغاء' : 'Cancel'
    });
    if (!confirmed) return;

    const res = await revokeWorkspaceShareLink(linkId, initialWorkspace.id);
    if (res.error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ' : 'Error',
        (isRtl ? 'فشل الإلغاء: ' : 'Failed to revoke: ') + res.error
      );
    } else {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      useDialogStore.getState().showNotification(
        isRtl ? 'تم إلغاء رابط الدعوة.' : 'Invitation link revoked.',
        'success'
      );
    }
  };

  const handleCopyLink = async (linkId: string, token: string) => {
    const url = `${window.location.origin}/${locale}/join/workspace/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleChangeRole = async (targetUserId: string, nextRole: any) => {
    setMemberLoading(targetUserId);
    const { error } = await (supabase
      .from('workspace_members') as any)
      .update({ role: nextRole })
      .eq('workspace_id', initialWorkspace.id)
      .eq('user_id', targetUserId);

    if (error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ' : 'Error',
        (isRtl ? 'فشل تحديث الدور: ' : 'Failed to update role: ') + error.message
      );
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.profiles?.id === targetUserId ? { ...m, role: nextRole } : m))
      );
      useDialogStore.getState().showNotification(
        isRtl ? 'تم تحديث دور المتعاون بنجاح!' : 'Collaborator role successfully updated!',
        'success'
      );
    }
    setMemberLoading(null);
  };

  const handleRemoveMember = async (targetUserId: string) => {
    const title = isRtl ? 'إزالة عضو' : 'Remove Member';
    const message = isRtl ? 'هل أنت متأكد أنك تريد إزالة هذا العضو من مساحة العمل؟' : 'Are you sure you want to remove this member from the workspace?';
    
    const confirmed = await useDialogStore.getState().showConfirm(title, message, {
      confirmText: isRtl ? 'إزالة' : 'Remove',
      cancelText: isRtl ? 'إلغاء' : 'Cancel'
    });
    if (!confirmed) return;

    setMemberLoading(targetUserId);
    const { error } = await (supabase
      .from('workspace_members') as any)
      .delete()
      .eq('workspace_id', initialWorkspace.id)
      .eq('user_id', targetUserId);

    if (error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ' : 'Error',
        (isRtl ? 'فشل إزالة العضو: ' : 'Failed to remove member: ') + error.message
      );
    } else {
      setMembers((prev) => prev.filter((m) => m.profiles?.id !== targetUserId));
      useDialogStore.getState().showNotification(
        isRtl ? 'تمت إزالة العضو بنجاح.' : 'Member removed successfully.',
        'success'
      );
    }
    setMemberLoading(null);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-primary/10 text-primary border-primary/20',
      admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      editor: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      commenter: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      viewer: 'bg-zinc-500/10 text-zinc-400 border-white/10',
    };
    return (
      <Badge variant="outline" className={`capitalize font-semibold text-xs rounded-md ${colors[role] || colors.viewer}`}>
        {getRoleLabel(role)}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl font-sans pb-12">
      {/* ─── Premium Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text bg-linear-to-r from-foreground to-foreground/80">
            {isRtl ? 'تخصيص وإعدادات مساحة العمل' : 'Workspace Customization & Settings'}
          </h1>
          <p className="text-sm text-muted-foreground font-light mt-1">
            {isRtl ? 'قم بتهيئة الواصفات المرئية، وتوليد رموز الدعوة، وإدارة أدوار المتعاونين.' : 'Configure visual descriptors, generate invite codes, and manage collaborator roles.'}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="bg-muted/80 p-1.5 rounded-2xl flex flex-wrap items-center border border-border gap-1 shadow-sm">
          <button
            onClick={() => setActiveTab('customization')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'customization'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{isRtl ? 'الهوية المرئية' : 'Visual Branding'}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('people')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'people'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isRtl ? 'الأعضاء' : 'Members'}</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'preferences'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isRtl ? 'تفضيلات اللوحة' : 'Canvas Preferences'}</span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'integrations'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{isRtl ? 'الذكاء الاصطناعي والربط' : 'AI & Integrations'}</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveTab('danger')}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'danger'
                  ? 'bg-destructive/10 text-destructive shadow-xs border border-destructive/20'
                  : 'text-muted-foreground hover:text-destructive'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isRtl ? 'منطقة الخطر' : 'Danger Zone'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Premium Live Preview Card ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 shadow-md">
        {/* Banner */}
        <div className={`h-36 ${selectedBanner} transition-all duration-500`} />
        
        {/* Gradient Blur Background Overlay */}
        <div className="absolute inset-0 bg-background/30 backdrop-blur-xs pointer-events-none" />

        {/* Card Content Overlay */}
        <div className="relative p-6 -mt-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4 min-w-0">
            {/* Custom Icon */}
            <div 
              className="w-20 h-20 rounded-3xl bg-background border-4 border-background flex items-center justify-center text-4xl shadow-xl transition-all duration-300 transform hover:scale-105"
              style={{ borderColor: selectedColor }}
            >
              {selectedIcon}
            </div>
            
            {/* Workspace Label */}
            <div className="min-w-0 text-left rtl:text-right">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-accent/20 text-accent-foreground font-sans inline-block mb-1 border border-accent/15">
                {isRtl ? 'مساحة العمل النشطة' : 'Active Workspace'}
              </span>
              <h2 className="text-2xl font-black truncate text-foreground leading-none">
                {wsName || (isRtl ? 'مساحة عمل غير مسماة' : 'Unnamed Workspace')}
              </h2>
            </div>
          </div>

          {/* Settings Indicator */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1 bg-background/55 px-3 py-1.5 rounded-full border border-border backdrop-blur-md">
              <Shield className="w-3.5 h-3.5" style={{ color: selectedColor }} />
              {isRtl ? 'الدور:' : 'Role:'} <span className="font-semibold text-foreground capitalize">{getRoleLabel(currentUserRole)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: Customization Settings ─── */}
      {activeTab === 'customization' && (
        <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl font-sans">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Palette className="w-5 h-5 text-accent" />
              <span>{isRtl ? 'تخصيص الملف التعريفي لمساحة العمل' : 'Workspace Profile Customization'}</span>
            </CardTitle>
            <CardDescription className="font-light">
              {isRtl ? 'قم بضبط إعدادات الملف التعريفي والمظهر الخاص بهذه البيئة المرئية.' : 'Fine-tune the profile settings and theme of this visual environment.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveCustomization} className="space-y-6">
              {/* Workspace name */}
              <div className="space-y-2 max-w-lg">
                <Label htmlFor="wsName" className="font-semibold text-sm">
                  {isRtl ? 'اسم مساحة العمل' : 'Workspace Name'}
                </Label>
                <Input
                  id="wsName"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  disabled={!canManage}
                  placeholder={isRtl ? 'مساحتي الإبداعية' : 'My Creative Space'}
                  className="rounded-xl border-border focus:ring-accent py-5"
                />
              </div>

              {/* Accent Color presets */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">{isRtl ? 'لون العلامة التجارية المميز' : 'Accent Brand Color'}</Label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      disabled={!canManage}
                      onClick={() => setSelectedColor(preset.hex)}
                      className={`h-11 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border cursor-pointer select-none transition-all duration-200 ${
                        selectedColor === preset.hex
                          ? 'border-foreground text-foreground shadow-sm scale-102 bg-white/5'
                          : 'border-border text-muted-foreground hover:bg-white/5 hover:text-foreground'
                       }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${preset.bg}`} />
                      <span>{getPresetName(preset.name)}</span>
                      {selectedColor === preset.hex && <Check className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji Icon picker */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">{isRtl ? 'رمز مساحة العمل التعبيري' : 'Workspace Icon Emoji'}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={!canManage}
                      onClick={() => setSelectedIcon(emoji)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center border cursor-pointer select-none transition-all duration-200 ${
                        selectedIcon === emoji
                          ? 'border-foreground bg-white/5 shadow-md scale-105'
                          : 'border-border hover:bg-white/5 hover:scale-102'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  {canManage && (
                    <Input
                      value={selectedIcon}
                      onChange={(e) => setSelectedIcon(e.target.value.slice(0, 4))}
                      placeholder={isRtl ? 'أو الصق رمزاً تعبيرياً مخصصاً...' : 'Or paste custom emoji...'}
                      className="w-48 h-12 rounded-xl border-border focus:ring-accent ml-2 text-center text-xs"
                    />
                  )}
                </div>
              </div>

              {/* Banner presets */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">{isRtl ? 'نمط تدرج الخلفية' : 'Banner Gradient Style'}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {BANNER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={!canManage}
                      onClick={() => setSelectedBanner(preset.class)}
                      className={`h-16 rounded-2xl overflow-hidden border cursor-pointer select-none text-left flex flex-col justify-end p-3 relative group transition-all duration-300 ${
                        selectedBanner === preset.class
                          ? 'border-foreground ring-2 ring-foreground/20 scale-[1.01]'
                          : 'border-border hover:border-foreground/50'
                      }`}
                    >
                      <div className={`absolute inset-0 ${preset.class} transition-all duration-300`} />
                      <div className="absolute inset-0 bg-black/40" />
                      <span className="relative font-bold text-[10px] text-white tracking-wide uppercase select-none flex items-center justify-between w-full">
                        <span>{getBannerName(preset.name)}</span>
                        {selectedBanner === preset.class && <Check className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit actions */}
              {canManage && (
                <div className="pt-4 border-t border-border flex items-center justify-end gap-3 animate-fadeIn">
                  <Button
                    type="submit"
                    disabled={customizationLoading}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-5 rounded-xl cursor-pointer"
                  >
                    {customizationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      isRtl ? 'حفظ إعدادات الهوية' : 'Save Branding Settings'
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 2: Members & Sharing Links ─── */}
      {activeTab === 'people' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section A: Workspace Share Links Generator */}
          <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl font-sans">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-accent" />
                <span>{isRtl ? 'دعوات مساحة عمل متعددة الروابط' : 'Multi-Link Workspace Invitations'}</span>
              </CardTitle>
              <CardDescription className="font-light">
                {isRtl ? 'قم بتوليد روابط دعوة ديناميكية لمساحة العمل لتخصيص أدوار محددة تلقائياً.' : 'Generate dynamic workspace invitation links. Each link can assign specific roles automatically.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Link creation form (for admins/owners only) */}
              {canManage && (
                <form onSubmit={handleCreateInviteLink} className="grid grid-cols-1 md:grid-cols-3 items-end gap-4 border border-border/60 bg-background/30 rounded-2xl p-4.5">
                  <div className="space-y-2">
                    <Label htmlFor="linkTitle" className="font-semibold text-xs">{isRtl ? 'عنوان رابط الدعوة' : 'Invite Link Label'}</Label>
                    <Input
                      id="linkTitle"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder={isRtl ? 'مثال: رابط انضمام فريقي' : 'e.g. Creator Join Link'}
                      className="rounded-xl border-border focus:ring-accent"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-xs">{isRtl ? 'الدور المعين تلقائياً عند الانضمام' : 'Auto-Assigned Joining Role'}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full inline-flex items-center justify-between gap-1.5 rounded-xl border border-border bg-background hover:bg-muted px-4 py-2.5 text-xs text-foreground transition-colors focus:outline-hidden font-semibold">
                        <span className="capitalize">{getRoleLabel(linkRole)}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg w-44 p-1 font-sans font-medium text-xs">
                        {(['admin', 'editor', 'commenter', 'viewer'] as const).map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => setLinkRole(r)}
                            className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer capitalize flex items-center justify-between"
                          >
                            <span>{getRoleLabel(r)}</span>
                            {linkRole === r && <Check className="w-4 h-4 text-accent" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Button
                    type="submit"
                    disabled={linkLoading || !linkTitle.trim()}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl h-10 px-5 cursor-pointer flex items-center justify-center gap-1.5 w-full"
                  >
                    {linkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{isRtl ? 'توليد رابط مشاركة' : 'Generate Share Link'}</span>
                  </Button>
                </form>
              )}

              {/* Links list */}
              <div className="space-y-3">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">{isRtl ? 'روابط الدعوة النشطة' : 'Active Invite Links'}</Label>
                {links.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border/80 rounded-2xl bg-background/25">
                    <p className="text-xs text-muted-foreground font-light">{isRtl ? 'لم يتم إنشاء أي روابط دعوة لمساحة العمل بعد.' : 'No workspace invite links created yet.'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-background/30 shadow-xs">
                    {links.map((link) => {
                      const joinUrl = `${window.location.origin}/${locale}/join/workspace/${link.share_token}`;
                      const isCopied = copiedLinkId === link.id;

                      return (
                        <div key={link.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap text-left rtl:text-right">
                              <h4 className="font-bold text-sm text-foreground truncate">{link.label}</h4>
                              <Badge variant="secondary" className="capitalize text-[10px] bg-accent/15 text-accent border border-accent/20">
                                {getRoleLabel(link.role)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-1.5 max-w-lg min-w-0 shadow-xs">
                              <Link2 className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span className="text-xs text-muted-foreground font-mono truncate select-all">{joinUrl}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                            <Button
                              onClick={() => handleCopyLink(link.id, link.share_token)}
                              size="sm"
                              className={`rounded-xl px-4 font-bold text-xs cursor-pointer gap-1 transition-all h-9 ${
                                isCopied ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-background hover:bg-muted text-foreground border border-border'
                              }`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-accent" />}
                              <span>{isCopied ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ' : 'Copy')}</span>
                            </Button>

                            {canManage && (
                              <Button
                                onClick={() => handleRevokeLink(link.id)}
                                variant="ghost"
                                size="icon"
                                className="w-9 h-9 rounded-xl border border-border text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section B: Workspace Members List */}
          <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl font-sans">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <span>{isRtl ? 'أعضاء مساحة العمل وأدوارهم' : 'Workspace Members & Roles'}</span>
              </CardTitle>
              <CardDescription className="font-light">
                {isRtl ? 'راقب واضبط الأدوار أو حقوق الوصول للمتعاونين داخل مساحة العمل هذه.' : 'Monitor and adjust roles or access rights for collaborators inside this workspace.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-2xl overflow-hidden shadow-xs bg-background/30">
                <div className="divide-y divide-border">
                  {members.map((member) => {
                    if (!member.profiles) return null;
                    const isTargetOwner = member.role === 'owner';
                    const isCurrentUser = member.profiles.id === currentUserId;

                    return (
                      <div key={member.profiles.id} className="p-4.5 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center uppercase text-sm shrink-0 border-2 border-primary/20">
                            {member.profiles.full_name?.charAt(0) || member.profiles.email.charAt(0)}
                          </div>
                          <div className="min-w-0 text-left rtl:text-right">
                            <h4 className="font-bold text-sm truncate flex items-center gap-1.5">
                              <span>{member.profiles.full_name || (isRtl ? 'مستخدم' : 'User')}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2 py-0.5 rounded-full">
                                  {isRtl ? 'أنت' : 'You'}
                                </span>
                              )}
                            </h4>
                            <p className="text-xs font-light text-muted-foreground truncate">{member.profiles.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 font-medium">
                          {getRoleBadge(member.role)}

                          {canManage && !isTargetOwner && !isCurrentUser && (
                            <div className="flex items-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  disabled={memberLoading === member.profiles.id}
                                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted px-3 h-9 gap-1 cursor-pointer text-xs transition-colors focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none shadow-xs font-medium"
                                >
                                  <span>{isRtl ? 'تغيير الدور' : 'Change Role'}</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-md w-40 p-1 font-sans text-xs">
                                  {['admin', 'editor', 'commenter', 'viewer'].map((roleOption) => (
                                    <DropdownMenuItem
                                      key={roleOption}
                                      onClick={() => handleChangeRole(member.profiles!.id, roleOption)}
                                      className="cursor-pointer capitalize rounded-lg m-1 font-semibold text-xs flex items-center justify-between"
                                    >
                                      <span>{getRoleLabel(roleOption)}</span>
                                      {member.role === roleOption && <Check className="w-4 h-4 text-accent" />}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

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
      )}

      {/* ─── TAB 3: Preferences & Editor Settings ─── */}
      {activeTab === 'preferences' && (
        <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl font-sans">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-accent" />
              <span>{isRtl ? 'تفضيلات وسلوك لوحة العمل' : 'Editor & Canvas Preferences'}</span>
            </CardTitle>
            <CardDescription className="font-light">
              {isRtl ? 'قم بضبط سلوك شبكة المحرر، خيارات الحفظ التلقائي، وقواعد التحقق.' : 'Fine-tune snap-to-grid behavior, auto-save settings, and operational canvas validation rules.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePreferences} className="space-y-6">
              
              {/* Option A: Snap to Grid */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl border border-border bg-background/25">
                <div className="space-y-1 text-left rtl:text-right">
                  <h4 className="text-sm font-bold text-foreground">{isRtl ? 'محاذاة العقد التلقائية للشبكة' : 'Snap-to-Grid Node Alignment'}</h4>
                  <p className="text-xs font-light text-muted-foreground">
                    {isRtl 
                      ? 'قم بمحاذاة العقد تلقائياً لأقرب تقاطع للحفاظ على ترتيب وتماثل الرسم.' 
                      : 'Automatically align custom nodes to the closest grid coordinate to maintain pristine layout structure.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer outline-hidden shrink-0 ${
                    snapToGrid ? 'bg-primary' : 'bg-zinc-800'
                  }`}
                >
                  <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-xs ${
                    isRtl 
                      ? (snapToGrid ? 'right-7' : 'right-1') 
                      : (snapToGrid ? 'left-7' : 'left-1')
                  }`} />
                </button>
              </div>

              {/* Option B: Strict Validations */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl border border-border bg-background/25">
                <div className="space-y-1 text-left rtl:text-right">
                  <h4 className="text-sm font-bold text-foreground">{isRtl ? 'التحقق الصارم من حلقات التكرار والأخطاء' : 'Strict Logic Validation Layers'}</h4>
                  <p className="text-xs font-light text-muted-foreground">
                    {isRtl 
                      ? 'منع توصيل العقد بشكل يسبب حلقات تكرار لا نهائية أو ترك عقد يتيمة دون اتصال.' 
                      : 'Validate edge lines during drawing. Generates security prompts on loop detection or orphan states.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => setStrictValidation(!strictValidation)}
                  className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer outline-hidden shrink-0 ${
                    strictValidation ? 'bg-primary' : 'bg-zinc-800'
                  }`}
                >
                  <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-xs ${
                    isRtl 
                      ? (strictValidation ? 'right-7' : 'right-1') 
                      : (strictValidation ? 'left-7' : 'left-1')
                  }`} />
                </button>
              </div>

              {/* Option C: Auto-save interval selection */}
              <div className="space-y-2 max-w-md text-left rtl:text-right">
                <Label className="font-semibold text-xs">{isRtl ? 'معدل الحفظ التلقائي في الخلفية' : 'Background Auto-Save Frequency'}</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full inline-flex items-center justify-between gap-1.5 rounded-xl border border-border bg-background hover:bg-muted px-4 py-2.5 text-xs text-foreground transition-colors focus:outline-hidden font-semibold">
                    <span>
                      {autoSaveInterval === '10s' && (isRtl ? 'كل 10 ثوانٍ (سريع)' : 'Every 10 seconds (Aggressive)')}
                      {autoSaveInterval === '30s' && (isRtl ? 'كل 30 ثانية (افتراضي)' : 'Every 30 seconds (Default)')}
                      {autoSaveInterval === '1m' && (isRtl ? 'كل دقيقة واحدة' : 'Every 1 minute')}
                      {autoSaveInterval === '5m' && (isRtl ? 'كل 5 دقائق' : 'Every 5 minutes')}
                      {autoSaveInterval === 'manual' && (isRtl ? 'حفظ يدوي فقط' : 'Manual Save Only')}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-background border border-border rounded-xl shadow-lg w-64 p-1 font-sans text-xs font-semibold">
                    {[
                      { id: '10s', labelEn: 'Every 10 seconds (Aggressive)', labelAr: 'كل 10 ثوانٍ (سريع)' },
                      { id: '30s', labelEn: 'Every 30 seconds (Default)', labelAr: 'كل 30 ثانية (افتراضي)' },
                      { id: '1m', labelEn: 'Every 1 minute', labelAr: 'كل دقيقة واحدة' },
                      { id: '5m', labelEn: 'Every 5 minutes', labelAr: 'كل 5 دقائق' },
                      { id: 'manual', labelEn: 'Manual Save Only', labelAr: 'حفظ يدوي فقط' },
                    ].map((opt) => (
                      <DropdownMenuItem
                        key={opt.id}
                        onClick={() => setAutoSaveInterval(opt.id)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between"
                      >
                        <span>{isRtl ? opt.labelAr : opt.labelEn}</span>
                        {autoSaveInterval === opt.id && <Check className="w-4 h-4 text-accent" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Option D: Grid Background Selection */}
              <div className="space-y-3">
                <Label className="font-semibold text-xs">{isRtl ? 'نمط خلفية اللوحة المرئية' : 'Canvas Background Pattern'}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'dots', labelEn: 'Dots Grid', labelAr: 'نقاط متباعدة' },
                    { id: 'lines', labelEn: 'Lines Grid', labelAr: 'شبكة مربعات' },
                    { id: 'cross', labelEn: 'Cross Grid', labelAr: 'شبكة متقاطعة' },
                    { id: 'none', labelEn: 'Prism Solid', labelAr: 'خلفية صلبة' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!canManage}
                      onClick={() => setGridBackground(opt.id)}
                      className={`h-16 rounded-xl border flex flex-col justify-center items-center gap-1.5 cursor-pointer transition-all duration-200 ${
                        gridBackground === opt.id
                          ? 'border-foreground bg-white/5 font-extrabold text-foreground shadow-xs'
                          : 'border-border text-muted-foreground hover:bg-white/2 hover:text-foreground'
                      }`}
                    >
                      <span className="text-xs font-semibold">{isRtl ? opt.labelAr : opt.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              {canManage && (
                <div className="pt-4 border-t border-border flex justify-end">
                  <Button
                    type="submit"
                    disabled={preferencesLoading}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-5 rounded-xl cursor-pointer"
                  >
                    {preferencesLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      isRtl ? 'حفظ تفضيلات اللوحة' : 'Save Canvas Preferences'
                    )}
                  </Button>
                </div>
              )}

            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 4: AI & Integrations ─── */}
      {activeTab === 'integrations' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section A: Gemini AI Assistant Toggle */}
          <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl font-sans">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent" />
                <span>{isRtl ? 'إعدادات مساعد الذكاء الاصطناعي' : 'Gemini AI Agent Settings'}</span>
              </CardTitle>
              <CardDescription className="font-light">
                {isRtl ? 'قم بتمكين أو تعطيل مساعد الذكاء الاصطناعي لإنشاء وتطوير مسارات العمل بصرياً.' : 'Enable or disable AI Agent capabilities to generate, outline, and layout workflow diagrams automatically.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveIntegrations} className="space-y-6">
                
                {/* Gemini AI Switch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl border border-border bg-background/25">
                  <div className="space-y-1 text-left rtl:text-right">
                    <h4 className="text-sm font-bold text-foreground">{isRtl ? 'تمكين عميل الذكاء الاصطناعي (Gemini)' : 'Enable Gemini AI Workspace Agent'}</h4>
                    <p className="text-xs font-light text-muted-foreground">
                      {isRtl 
                        ? 'تفعيل السحب التلقائي، واقتراحات العقد، وتوليد المخططات بناءً على التوجيهات النصية.' 
                        : 'Permit auto-layout scripting, node suggestions, and visual flow generation from text inputs.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => setGeminiEnabled(!geminiEnabled)}
                    className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer outline-hidden shrink-0 ${
                      geminiEnabled ? 'bg-primary' : 'bg-zinc-800'
                    }`}
                  >
                    <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-xs ${
                      isRtl 
                        ? (geminiEnabled ? 'right-7' : 'right-1') 
                        : (geminiEnabled ? 'left-7' : 'left-1')
                    }`} />
                  </button>
                </div>

                {/* Save button */}
                {canManage && (
                  <div className="pt-4 border-t border-border flex justify-end">
                    <Button
                      type="submit"
                      disabled={integrationsLoading}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-5 rounded-xl cursor-pointer"
                    >
                      {integrationsLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        isRtl ? 'حفظ إعدادات الذكاء الاصطناعي' : 'Save AI Settings'
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Section B: Integration Health status */}
          <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl font-sans">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-accent" />
                <span>{isRtl ? 'حالة الربط والخدمات النشطة' : 'Active Integrations Security & Health'}</span>
              </CardTitle>
              <CardDescription className="font-light">
                {isRtl ? 'مؤشرات الأمان وقنوات الربط الفعالة في مساحة العمل الحالية.' : 'Security indicators and active connectivity pipelines in this workspace.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Supabase status */}
                <div className="p-4 rounded-2xl border border-border bg-background/25 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <div className="text-left rtl:text-right min-w-0">
                    <h4 className="text-xs font-bold text-foreground">Supabase Storage</h4>
                    <p className="text-[10px] text-emerald-400 font-medium">
                      {isRtl ? 'نشط (RLS مؤمن)' : 'Active (RLS Enforced)'}
                    </p>
                  </div>
                </div>

                {/* Stripe status */}
                <div className="p-4 rounded-2xl border border-border bg-background/25 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <div className="text-left rtl:text-right min-w-0">
                    <h4 className="text-xs font-bold text-foreground">Stripe Payments</h4>
                    <p className="text-[10px] text-emerald-400 font-medium">
                      {isRtl ? 'الفوترة نشطة' : 'Billing Active'}
                    </p>
                  </div>
                </div>

                {/* Real-time sync status */}
                <div className="p-4 rounded-2xl border border-border bg-background/25 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <div className="text-left rtl:text-right min-w-0">
                    <h4 className="text-xs font-bold text-foreground">WebSocket Realtime</h4>
                    <p className="text-[10px] text-emerald-400 font-medium">
                      {isRtl ? 'متصل (تزامن فوري)' : 'Connected (Live)'}
                    </p>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* ─── TAB 5: Danger Zone (Owner Only) ─── */}
      {activeTab === 'danger' && isOwner && (
        <Card className="bg-destructive/5 border border-destructive/20 backdrop-blur-md shadow-md rounded-3xl font-sans">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{isRtl ? 'منطقة الخطر والعمليات الحساسة' : 'Platform Danger Zone'}</span>
            </CardTitle>
            <CardDescription className="text-destructive/80 font-light">
              {isRtl 
                ? 'تحذير: الإجراءات هنا دائمة ولا يمكن التراجع عنها. يرجى توخي الحذر الشديد.' 
                : 'Warning: Actions here are permanent and cannot be undone. Please proceed with extreme caution.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 border border-destructive/20 bg-destructive/10 rounded-2xl p-4.5">
              <h4 className="text-sm font-bold text-destructive">{isRtl ? 'حذف مساحة العمل بشكل نهائي' : 'Permanently Delete Workspace'}</h4>
              <p className="text-xs font-light text-muted-foreground leading-relaxed">
                {isRtl 
                  ? 'سيؤدي هذا إلى حذف مساحة العمل نهائياً، وإزالة جميع مخططات سير العمل ومسارات الأتمتة الملحقة بها، وإلغاء عضوية جميع الأعضاء النشطين فوراً.' 
                  : 'This will permanently destroy the workspace, wipe all visual workflow diagrams, cancel billing subscriptions, and immediately block collaborator memberships.'}
              </p>
            </div>

            <form onSubmit={handleDeleteWorkspace} className="space-y-4 max-w-lg text-left rtl:text-right">
              <div className="space-y-2">
                <Label htmlFor="confirmName" className="font-semibold text-xs text-destructive">
                  {isRtl 
                    ? `يرجى كتابة اسم مساحة العمل "${initialWorkspace.name}" لتأكيد الحذف:` 
                    : `Please type the exact name "${initialWorkspace.name}" to verify:`}
                </Label>
                <Input
                  id="confirmName"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={isRtl ? 'اكتب اسم مساحة العمل...' : 'Type workspace name...'}
                  className="rounded-xl border-destructive/30 focus:ring-destructive focus:border-destructive/80 font-sans text-xs py-5"
                />
              </div>

              <Button
                type="submit"
                disabled={deleteLoading || deleteConfirmText !== initialWorkspace.name}
                className="bg-destructive hover:bg-destructive/95 text-destructive-foreground font-bold px-6 py-5 rounded-xl cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isRtl ? 'حذف مساحة العمل نهائياً' : 'Destroy Workspace Permanently'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
