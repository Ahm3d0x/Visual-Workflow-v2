import { getTranslations } from 'next-intl/server';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowRight, Sparkles, Workflow, Database, CreditCard, Languages, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export default async function LandingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tAuth = await getTranslations('auth');
  const tDash = await getTranslations('dashboard');

  return (
    <div className="min-h-screen bg-canvas text-foreground selection:bg-accent/20 transition-colors duration-300">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center">
              <Workflow className="w-6 h-6 animate-pulse" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Visual Workflow SaaS
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle currentLocale={locale} />
            <ThemeToggle />
            <Link href={`/${locale}/auth/sign-in`} passHref>
              <Button variant="ghost" className="font-medium cursor-pointer">
                {tAuth('sign_in')}
              </Button>
            </Link>
            <Link href={`/${locale}/auth/sign-up`} passHref>
              <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 rounded-lg shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                {tAuth('sign_up')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <Badge className="bg-accent/10 text-accent hover:bg-accent/15 border-accent/20 px-4 py-1.5 mb-6 text-sm font-medium rounded-full flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" /> Next-generation Workflow Automation
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-sans font-extrabold tracking-tight max-w-4xl leading-[1.15] mb-8">
          Build & Automate{" "}
          <span className="bg-gradient-to-r from-accent to-node-ai bg-clip-text text-transparent">
            Agentic Workflows
          </span>{" "}
          Visually
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed">
          Design, collaborate, and execute complex logic workflows with OpenAI-powered AI assistance, Supabase security, and fully real-time multiplayer boards.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
          <Link href={`/${locale}/auth/sign-up`} passHref>
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-accent/25 transition-all duration-300 hover:scale-[1.03] group cursor-pointer">
              Start Free Trial{" "}
              <ArrowRight className="w-5 h-5 ms-2 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href={`/${locale}/dashboard`} passHref>
            <Button size="lg" variant="outline" className="border-border hover:bg-muted font-medium px-8 py-6 text-lg rounded-xl transition-all duration-300 cursor-pointer">
              {tDash('title')}
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mt-12 text-start">
          <Card className="bg-background/50 border-border backdrop-blur-sm hover:shadow-xl hover:border-accent/40 transition-all duration-500 rounded-2xl group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-node-data/10 text-node-data flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Workflow className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold font-sans">Visual Canvas Editor</CardTitle>
              <CardDescription className="text-muted-foreground">
                High-performance XYFlow/React Flow canvas editor. Complete library of 40+ nodes, validation layers, auto-layouts, and export capabilities.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-background/50 border-border backdrop-blur-sm hover:shadow-xl hover:border-accent/40 transition-all duration-500 rounded-2xl group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-node-ai/10 text-node-ai flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold font-sans">AI Agent Assistance</CardTitle>
              <CardDescription className="text-muted-foreground">
                Synthesize processes automatically from raw text prompts. Query the AI Agent for layout optimizations, bottleneck analysis, and error resolution.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-background/50 border-border backdrop-blur-sm hover:shadow-xl hover:border-accent/40 transition-all duration-500 rounded-2xl group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-node-integration/10 text-node-integration flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Database className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold font-sans">Supabase Backend</CardTitle>
              <CardDescription className="text-muted-foreground">
                Secured via granular Row Level Security (RLS) policies. Instant multiplayer syncing via real-time WebSocket tables.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Foundations Verification Section */}
        <section className="w-full max-w-4xl mt-32 border-t border-border pt-16">
          <h2 className="text-3xl font-bold mb-6 font-sans">Foundation Check</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background border border-border p-4 rounded-xl flex items-center gap-3">
              <Languages className="text-node-ai w-5 h-5" />
              <div className="text-start">
                <p className="text-xs text-muted-foreground">Localization</p>
                <p className="text-sm font-bold capitalize">{locale === 'en' ? 'English (LTR)' : 'العربية (RTL)'}</p>
              </div>
            </div>

            <div className="bg-background border border-border p-4 rounded-xl flex items-center gap-3">
              <Zap className="text-node-logic w-5 h-5" />
              <div className="text-start">
                <p className="text-xs text-muted-foreground">Tailwind CSS</p>
                <p className="text-sm font-bold">V4 Installed</p>
              </div>
            </div>

            <div className="bg-background border border-border p-4 rounded-xl flex items-center gap-3">
              <Shield className="text-node-integration w-5 h-5" />
              <div className="text-start">
                <p className="text-xs text-muted-foreground">Auth Security</p>
                <p className="text-sm font-bold">Supabase RLS</p>
              </div>
            </div>

            <div className="bg-background border border-border p-4 rounded-xl flex items-center gap-3">
              <CreditCard className="text-node-human w-5 h-5" />
              <div className="text-start">
                <p className="text-xs text-muted-foreground">Payments</p>
                <p className="text-sm font-bold">Stripe Subscriptions</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8 text-center text-sm text-muted-foreground transition-colors duration-300">
        <p>© 2026 Visual Workflow SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
}
