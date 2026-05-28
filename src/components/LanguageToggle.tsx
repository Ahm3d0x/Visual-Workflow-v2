'use client';

import { usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageToggle({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (nextLocale: 'en' | 'ar') => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Button
      variant="outline"
      onClick={() => handleLanguageChange(currentLocale === 'en' ? 'ar' : 'en')}
      className="border-border rounded-xl flex items-center gap-2 font-medium transition-all hover:bg-muted"
    >
      <Languages className="w-4 h-4 text-accent" />
      <span>{currentLocale === 'en' ? 'العربية' : 'English'}</span>
    </Button>
  );
}
