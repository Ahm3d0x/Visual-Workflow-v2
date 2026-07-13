import Link from 'next/link';

interface AppLogoProps {
  /** 'icon' = logo image only; 'full' = image + brand name */
  variant?: 'icon' | 'full';
  /** Size of the logo image in px (square) */
  size?: number;
  /** Wrap in a Link to home (pass locale) */
  href?: string;
  /** Custom class for the wrapper */
  className?: string;
}

/**
 * AppLogo — renders the Visual Workflow logo image, optionally with
 * the brand name beside it.  Drop this in wherever you previously had
 * the Workflow lucide icon + text combo.
 */
export function AppLogo({
  variant = 'full',
  size = 32,
  href,
  className = '',
}: AppLogoProps) {
  const content = (
    <span className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Visual Workflow logo"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
        className="rounded-lg shrink-0 drop-shadow-sm"
      />
      {variant === 'full' && (
        <span className="font-extrabold text-base tracking-tight leading-none">
          <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            ski
          </span>
          <span className="text-foreground">.ma</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="hover:no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
