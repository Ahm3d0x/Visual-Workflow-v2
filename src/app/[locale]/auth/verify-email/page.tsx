'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailOpen } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function VerifyEmailPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email address';
  const t = useTranslations('auth');

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
        <Card className="bg-background/60 border-border backdrop-blur-md shadow-2xl rounded-2xl p-4 sm:p-6 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center animate-bounce">
              <MailOpen className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl font-extrabold font-sans leading-none tracking-tight">
              {t('verify_email_title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm font-light">
              {t('verify_email_desc', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm font-light text-muted-foreground">
              Please click the link inside that email to verify and automatically activate your account and provision your Legend trial dashboard workspace.
            </p>
            <div className="pt-2">
              <Link href={`/${locale}/auth/sign-in`} passHref>
                <Button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-6 rounded-xl cursor-pointer">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
