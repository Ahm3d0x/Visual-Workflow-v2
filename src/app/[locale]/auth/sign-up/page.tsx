'use client';

import { useState, use } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { signUp } from '@/actions/auth.actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useSearchParams } from 'next/navigation';

export default function SignUpPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || `/${locale}/dashboard`;

  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);

  const [serverError, setServerError] = useState<string | null>(null);

  // Form Validation Schema with password matching
  const schema = zod
    .object({
      fullName: zod.string().min(1, t('full_name') + ' required'),
      email: zod.string().min(1, t('email') + ' required').email('Invalid email address'),
      password: zod.string().min(8, t('password') + ' must be at least 8 characters'),
      confirmPassword: zod.string().min(1, 'Confirm password required'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });

  type FormData = zod.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    setServerError(null);
    
    const result = await signUp(values.email, values.password, values.fullName, locale, redirectTo);
    
    if (result?.error) {
      setServerError(result.error);
      setLoading(false);
    } else {
      router.push(`/auth/verify-email?email=${encodeURIComponent(values.email)}`);
    }
  };



  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-canvas text-foreground transition-colors duration-300 relative">
      {/* Toggles in header */}
      <div className="absolute top-6 right-6 left-6 flex justify-between items-center z-50">
        <AppLogo variant="full" size={30} href={`/${locale}`} />
        <div className="flex items-center gap-3">
          <LanguageToggle currentLocale={locale} />
          <ThemeToggle />
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-10">
        <Card className="bg-background/60 border-border backdrop-blur-md shadow-2xl rounded-2xl p-4 sm:p-6">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-extrabold font-sans leading-none tracking-tight">
              {t('sign_up')}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm font-light">
              Get started with your free 14-day Legend trial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {serverError && (
              <div className="bg-destructive/10 text-destructive border border-destructive/25 text-sm p-4 rounded-xl font-medium animate-shake">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold">
                  {t('full_name')}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  className="rounded-xl border-border focus:ring-accent"
                  {...register('fullName')}
                />
                {errors.fullName && (
                  <p className="text-destructive text-xs font-semibold">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  {t('email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="rounded-xl border-border focus:ring-accent"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-destructive text-xs font-semibold">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  {t('password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl border-border focus:ring-accent"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-destructive text-xs font-semibold">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl border-border focus:ring-accent"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs font-semibold">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/95 font-semibold py-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{tCommon('loading')}</span>
                  </>
                ) : (
                  t('sign_up')
                )}
              </Button>

              <p className="text-[10px] text-zinc-500 font-light text-center mt-2 leading-normal">
                {locale === 'ar' ? (
                  <>
                    بالنقر فوق التسجيل، فإنك توافق على{' '}
                    <Link href={`/${locale}/terms`} className="text-accent hover:underline font-semibold">شروط الخدمة</Link>{' '}
                    و{' '}
                    <Link href={`/${locale}/privacy`} className="text-accent hover:underline font-semibold">سياسة الخصوصية</Link>.
                  </>
                ) : (
                  <>
                    By clicking Sign Up, you agree to our{' '}
                    <Link href={`/${locale}/terms`} className="text-accent hover:underline font-semibold">Terms of Service</Link>{' '}
                    and{' '}
                    <Link href={`/${locale}/privacy`} className="text-accent hover:underline font-semibold">Privacy Policy</Link>.
                  </>
                )}
              </p>
            </form>



            <div className="text-center text-sm font-light text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link
                href={`/${locale}/auth/sign-in${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
                className="font-semibold text-accent hover:underline"
              >
                Sign In
              </Link>
            </div>

            <div className="text-center text-[11px] font-light text-zinc-500 mt-6 pt-4 border-t border-border flex justify-center gap-4">
              <Link href={`/${locale}/terms`} className="hover:text-foreground hover:underline transition-colors">
                {locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
              </Link>
              <span>•</span>
              <Link href={`/${locale}/privacy`} className="hover:text-foreground hover:underline transition-colors">
                {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
