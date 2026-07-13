'use client';

import { useState, use } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { resetPassword } from '@/actions/auth.actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MailCheck } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function ForgotPasswordPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form Validation Schema
  const schema = zod.object({
    email: zod.string().min(1, t('email') + ' required').email('Invalid email address'),
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
    },
  });

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    setServerError(null);
    const result = await resetPassword(values.email, locale);
    
    if (result?.error) {
      setServerError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
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

      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-8">
        <Card className="bg-background/60 border-border backdrop-blur-md shadow-2xl rounded-2xl p-4 sm:p-6">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-extrabold font-sans leading-none tracking-tight">
              Reset Password
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm font-light">
              Enter your email address to recover your account password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {success ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center animate-scaleIn">
                  <MailCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg">Check your inbox</h3>
                <p className="text-sm font-light text-muted-foreground">
                  We&apos;ve sent a password reset link to your email address. Please follow the instructions to secure your account.
                </p>
                <Link href={`/${locale}/auth/sign-in`} passHref>
                  <Button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-6 rounded-xl mt-4 cursor-pointer">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <>
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
                      'Send Reset Link'
                    )}
                  </Button>
                </form>

                <div className="text-center text-sm font-light text-muted-foreground mt-4">
                  Remembered your password?{' '}
                  <Link href={`/${locale}/auth/sign-in`} className="font-semibold text-accent hover:underline">
                    Sign In
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
