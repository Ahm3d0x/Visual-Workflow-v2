'use client';

import { useState, use } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { signIn, signInWithGoogle } from '@/actions/auth.actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Workflow, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function SignInPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form Validation Schema
  const schema = zod.object({
    email: zod.string().min(1, t('email') + ' required').email('Invalid email address'),
    password: zod.string().min(8, t('password') + ' must be at least 8 characters'),
  });

  type FormData = zod.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    setServerError(null);
    const result = await signIn(values.email, values.password);
    
    if (result?.error) {
      setServerError(result.error);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setServerError(null);
    const result = await signInWithGoogle(locale);
    
    if (result?.error) {
      setServerError(result.error);
      setGoogleLoading(false);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-canvas text-foreground transition-colors duration-300 relative">
      {/* Toggles in header */}
      <div className="absolute top-6 right-6 left-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <Workflow className="w-6 h-6 text-accent" />
          <span className="font-bold hidden sm:inline-block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Visual Workflow SaaS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle currentLocale={locale} />
          <ThemeToggle />
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-8">
        <Card className="bg-background/60 border-border backdrop-blur-md shadow-2xl rounded-2xl p-4 sm:p-6">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-extrabold font-sans leading-none tracking-tight">
              {t('sign_in')}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm font-light">
              Welcome back! Please enter your details below.
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
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-semibold">
                    {t('password')}
                  </Label>
                  <Link
                    href={`/${locale}/auth/forgot-password`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    {t('forgot_password')}
                  </Link>
                </div>
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
                  t('sign_in')
                )}
              </Button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground font-light">or</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              disabled={googleLoading}
              className="w-full border-border hover:bg-muted font-medium py-6 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-3"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              ) : (
                <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              )}
              <span>{t('google_login')}</span>
            </Button>

            <div className="text-center text-sm font-light text-muted-foreground mt-4">
              Don't have an account?{' '}
              <Link href={`/${locale}/auth/sign-up`} className="font-semibold text-accent hover:underline">
                Create Account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
