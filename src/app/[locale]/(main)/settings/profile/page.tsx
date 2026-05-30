import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';

interface ProfileRecord {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default async function ProfileSettingsPage({
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

  // 2. Fetch user profile
  const { data: profile } = await (supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, created_at')
    .eq('id', user.id)
    .single() as unknown as Promise<{ data: ProfileRecord | null }>);

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold font-sans">
          {locale === 'ar' ? 'لم يتم العثور على الملف الشخصي' : 'Profile not found'}
        </h2>
      </div>
    );
  }

  return (
    <ProfileSettings
      profile={{
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || null,
        avatar_url: profile.avatar_url || null,
        created_at: profile.created_at,
      }}
      locale={locale}
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
    title: isAr ? 'الملف الشخصي — Visual Workflow SaaS' : 'User Profile — Visual Workflow SaaS',
    description: isAr
      ? 'إدارة الملف الشخصي وتفاصيل الحساب والأمان.'
      : 'Manage your user profile, account details, and security settings.',
  };
}
