'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid Hydration Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 border border-border bg-background rounded-xl flex items-center justify-center opacity-50">
        <Sun className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center w-10 h-10 border border-border bg-background rounded-xl transition-all hover:bg-muted relative cursor-pointer select-none focus:outline-hidden">
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-primary" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-accent" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg">
        <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer gap-2 rounded-lg m-1">
          <Sun className="w-4 h-4 text-primary" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer gap-2 rounded-lg m-1">
          <Moon className="w-4 h-4 text-accent" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer gap-2 rounded-lg m-1">
          <Monitor className="w-4 h-4 text-muted-foreground" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
