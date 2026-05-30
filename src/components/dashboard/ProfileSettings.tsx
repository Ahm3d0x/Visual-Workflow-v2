'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, Shield, Lock, Loader2, Mail, Calendar, Key, AlertCircle
} from 'lucide-react';
import { updateProfile, updatePassword } from '@/actions/auth.actions';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface ProfileSettingsProps {
  profile: Profile;
  locale: string;
}

export function ProfileSettings({ profile, locale }: ProfileSettingsProps) {
  const isRtl = locale === 'ar';
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form States
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Profile Update Submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setProfileLoading(true);
    setProfileMessage(null);
    
    const res = await updateProfile(fullName.trim(), avatarUrl.trim() || null);
    setProfileLoading(false);

    if (res.error) {
      setProfileMessage({
        type: 'error',
        text: isRtl ? `فشل التحديث: ${res.error}` : `Failed to update profile: ${res.error}`
      });
    } else {
      setProfileMessage({
        type: 'success',
        text: isRtl ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profile successfully updated!'
      });
      router.refresh();
    }
  };

  // Handle Password Update Submit
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setSecurityMessage({
        type: 'error',
        text: isRtl ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Password must be at least 6 characters.'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({
        type: 'error',
        text: isRtl ? 'كلمات المرور غير متطابقة!' : 'Passwords do not match!'
      });
      return;
    }

    setSecurityLoading(true);
    setSecurityMessage(null);

    const res = await updatePassword(newPassword);
    setSecurityLoading(false);

    if (res.error) {
      setSecurityMessage({
        type: 'error',
        text: isRtl ? `فشل تغيير كلمة المرور: ${res.error}` : `Failed to change password: ${res.error}`
      });
    } else {
      setSecurityMessage({
        type: 'success',
        text: isRtl ? 'تم تغيير كلمة المرور بنجاح!' : 'Password successfully updated!'
      });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // User Initials
  const displayInitials = fullName.trim() 
    ? fullName.trim().charAt(0) 
    : profile.email.charAt(0);

  // Formatted Date
  const joinDate = new Date(profile.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl font-sans pb-12" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* ─── Premium Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text bg-linear-to-r from-foreground to-foreground/80">
            {isRtl ? 'إعدادات الملف الشخصي والحساب' : 'Profile & Account Settings'}
          </h1>
          <p className="text-sm text-muted-foreground font-light mt-1 text-left rtl:text-right">
            {isRtl ? 'تعديل تفاصيل الهوية الشخصية وتأمين حساب المستخدم الخاص بك.' : 'Manage your identity, personal profile branding, and account security credentials.'}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="bg-muted/80 p-1.5 rounded-2xl flex items-center border border-border gap-1 shadow-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
              activeTab === 'profile'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{isRtl ? 'بيانات الملف الشخصي' : 'Profile Details'}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
              activeTab === 'security'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isRtl ? 'الأمان والحماية' : 'Security Details'}</span>
          </button>
        </div>
      </div>

      {/* ─── Live Profile Avatar Card ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full filter blur-2xl pointer-events-none" />
        
        {/* Initials Avatar */}
        <div className="w-20 h-20 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center uppercase text-3xl shrink-0 border-2 border-primary/20 shadow-sm">
          {displayInitials}
        </div>

        <div className="min-w-0 text-center sm:text-left rtl:sm:text-right space-y-2 flex-1">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded-md inline-block">
            {isRtl ? 'ملف تعريف معتمد' : 'Verified User Account'}
          </Badge>
          <h2 className="text-2xl font-black text-foreground leading-tight truncate">
            {fullName.trim() || (isRtl ? 'مستخدم المنصة' : 'Platform User')}
          </h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-light text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-accent" />
              <span>{profile.email}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>{isRtl ? 'انضم في:' : 'Joined:'} <span className="font-semibold text-foreground">{joinDate}</span></span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: Profile Customization ─── */}
      {activeTab === 'profile' && (
        <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl font-sans">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-accent" />
              <span>{isRtl ? 'إدارة الهوية الشخصية' : 'Personal Identity Profile'}</span>
            </CardTitle>
            <CardDescription className="font-light">
              {isRtl ? 'تحديث معلومات المظهر والاسم التعريفي الخاص بك في مساحات العمل.' : 'Adjust the personal credentials displayed on visual nodes and collaborator lists.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              
              {profileMessage && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border text-sm ${
                  profileMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}>
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{profileMessage.text}</p>
                </div>
              )}

              {/* Form Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-semibold text-xs">
                    {isRtl ? 'الاسم بالكامل' : 'Full Name'}
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isRtl ? 'أحمد محمد' : 'John Doe'}
                    className="rounded-xl border-border focus:ring-accent py-5"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl" className="font-semibold text-xs">
                    {isRtl ? 'رابط الصورة الرمزية (اختياري)' : 'Avatar Image URL (Optional)'}
                  </Label>
                  <Input
                    id="avatarUrl"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="rounded-xl border-border focus:ring-accent py-5"
                  />
                </div>
              </div>

              {/* Read Only Account details */}
              <div className="pt-4 border-t border-border/60 space-y-4">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground/80">{isRtl ? 'تفاصيل الحساب' : 'Account Details'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-border bg-card/25 flex flex-col gap-1 text-left rtl:text-right">
                    <span className="text-muted-foreground">{isRtl ? 'البريد الإلكتروني' : 'Auth Email Address'}</span>
                    <span className="font-mono text-foreground font-semibold">{profile.email}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card/25 flex flex-col gap-1 text-left rtl:text-right">
                    <span className="text-muted-foreground">{isRtl ? 'معرف المستخدم الفريد (UUID)' : 'User Unique Identifier (ID)'}</span>
                    <span className="font-mono text-foreground select-all font-semibold">{profile.id}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={profileLoading || !fullName.trim() || (fullName.trim() === profile.full_name && avatarUrl.trim() === (profile.avatar_url || ''))}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-5 rounded-xl cursor-pointer"
                >
                  {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? 'حفظ التعديلات' : 'Save Changes')}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 2: Security & Password Update ─── */}
      {activeTab === 'security' && (
        <Card className="bg-background/40 border border-border backdrop-blur-md shadow-sm rounded-3xl font-sans">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <span>{isRtl ? 'تحديث كلمة المرور والحماية' : 'Update Password & Credentials'}</span>
            </CardTitle>
            <CardDescription className="font-light">
              {isRtl ? 'قم بتعديل كلمة مرور حسابك لتأمين مشاريعك ومساحات العمل.' : 'Secure your visual diagrams by rotating your account access password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              
              {securityMessage && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border text-sm ${
                  securityMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}>
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{securityMessage.text}</p>
                </div>
              )}

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-semibold text-xs">
                    {isRtl ? 'كلمة المرور الجديدة' : 'New Security Password'}
                  </Label>
                  <div className="relative">
                    <Key className="absolute inset-s-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="ps-10 rounded-xl border-border focus:ring-accent py-5"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-semibold text-xs">
                    {isRtl ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                  </Label>
                  <div className="relative">
                    <Key className="absolute inset-s-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="ps-10 rounded-xl border-border focus:ring-accent py-5"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={securityLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-5 rounded-xl cursor-pointer"
                >
                  {securityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? 'تحديث كلمة المرور' : 'Update Security Password')}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
