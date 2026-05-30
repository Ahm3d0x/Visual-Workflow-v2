import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Self-heal duplicate locale prefixes (e.g. /ar/ar/settings -> /ar/settings)
  const duplicateLocalePattern = /^\/(en|ar)\/(en|ar)(\/|$)/;
  if (duplicateLocalePattern.test(pathname)) {
    const cleanPath = pathname.replace(/^\/(en|ar)\/(en|ar)(\/|$)/, '/$1$3');
    const redirectUrl = new URL(cleanPath + request.nextUrl.search, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 1. Run next-intl middleware first to get the response containing locale redirects/cookies
  const response = intlMiddleware(request);

  // 2. Initialize Supabase server client for middleware to refresh auth tokens dynamically
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Get currently authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Clean pathname by removing the locale prefix (e.g. /en/dashboard -> /dashboard)
  const localePrefixPattern = /^\/(en|ar)(\/|$)/;
  const cleanPathname = pathname.replace(localePrefixPattern, '/');

  // Paths requiring authentication
  const PROTECTED_PATHS = ['/dashboard', '/workflows', '/billing', '/settings'];
  // Paths that should not be accessible if already authenticated
  const PUBLIC_ONLY_PATHS = ['/auth/sign-in', '/auth/sign-up', '/auth/forgot-password', '/auth/verify-email'];

  const isProtected = PROTECTED_PATHS.some((path) => cleanPathname.startsWith(path));
  const isPublicOnly = PUBLIC_ONLY_PATHS.some((path) => cleanPathname.startsWith(path));

  // Determine current locale (default to 'en')
  const locale = pathname.split('/')[1] === 'ar' ? 'ar' : 'en';

  if (isProtected && !user) {
    // Redirect unauthenticated user to sign-in page under their current locale, preserving the original page as redirect parameter
    const redirectUrl = new URL(`/${locale}/auth/sign-in`, request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicOnly && user) {
    // Redirect authenticated user away from auth pages
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  // Match all pathnames except for static files, specific APIs, and public share links
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|share/|sitemap.xml|robots.txt).*)']
};
