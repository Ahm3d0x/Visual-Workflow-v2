import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

// Paths requiring authentication
const PROTECTED_PATHS = ['/dashboard', '/workflows', '/billing', '/settings', '/admin', '/marketplace', '/node-creator', '/whiteboards', '/about', '/help', '/join'];
// Paths that should redirect logged-in users away
const PUBLIC_ONLY_PATHS = ['/auth/sign-in', '/auth/sign-up', '/auth/forgot-password', '/auth/verify-email'];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Self-heal duplicate locale prefixes (e.g. /ar/ar/settings -> /ar/settings)
  const duplicateLocalePattern = /^\/(en|ar)\/(en|ar)(\/|$)/;
  if (duplicateLocalePattern.test(pathname)) {
    const cleanPath = pathname.replace(/^\/(en|ar)\/(en|ar)(\/|$)/, '/$1$3');
    const redirectUrl = new URL(cleanPath + request.nextUrl.search, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 1. Run next-intl middleware first
  const response = intlMiddleware(request);

  // Clean pathname by stripping locale prefix (e.g. /en/dashboard -> /dashboard)
  const localePrefixPattern = /^\/(en|ar)(\/|$)/;
  const cleanPathname = pathname.replace(localePrefixPattern, '/');

  const isProtected = PROTECTED_PATHS.some((p) => cleanPathname === p || cleanPathname.startsWith(p + '/'));
  const isPublicOnly = PUBLIC_ONLY_PATHS.some((p) => cleanPathname === p || cleanPathname.startsWith(p + '/'));

  // 2. Only hit Supabase when we actually need to check auth
  if (!isProtected && !isPublicOnly) {
    return response;
  }

  const locale = pathname.split('/')[1] === 'ar' ? 'ar' : 'en';

  // 3. Read session from the cookie — zero network round-trip
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

  // getUser validates the session token and refreshes it if needed
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  if (isProtected && !isLoggedIn) {
    const redirectUrl = new URL(`/${locale}/auth/sign-in`, request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicOnly && isLoggedIn) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  // Match all pathnames except static files, APIs, and public share links
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|share/|sitemap.xml|robots.txt).*)'],
};
