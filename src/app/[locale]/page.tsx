import { getTranslations } from 'next-intl/server';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

import { 
  ArrowRight, 
  Sparkles, 
  Workflow,
  Database, 
  CreditCard, 
  Languages, 
  Shield, 
  Zap, 
  CheckCircle2, 
  Mail,
  Globe,
  Users,
  ChevronRight
} from 'lucide-react';
import { AppLogo } from '../../components/AppLogo';
import Link from 'next/link';

export default async function LandingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tAuth = await getTranslations('auth');
  const tDash = await getTranslations('dashboard');
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen bg-canvas text-foreground selection:bg-accent/20 transition-colors duration-300 relative overflow-hidden">
      {/* Ambient Orb Glows */}
      <div className="absolute top-[-15%] left-[-10%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(124,58,237,0.18),transparent)] blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[25%] right-[-8%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(59,130,246,0.14),transparent)] blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] left-[30%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(236,72,153,0.1),transparent)] blur-3xl pointer-events-none -z-10" />

      {/* Dot Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)] -z-20 opacity-60 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/60 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <AppLogo variant="full" size={32} href={`/${locale}`} />

          <div className="flex items-center gap-3">
            <LanguageToggle currentLocale={locale} />
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <Link href={`/${locale}/auth/sign-in`} passHref>
                <Button variant="ghost" className="font-semibold cursor-pointer text-sm px-4 rounded-xl hover:bg-muted/60 transition-all duration-150 active:scale-95">
                  {tAuth('sign_in')}
                </Button>
              </Link>
              <Link href={`/${locale}/auth/sign-up`} passHref>
                <Button className="bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold px-5 rounded-xl shadow-lg shadow-primary/20 transition-all duration-150 hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.97] cursor-pointer text-sm">
                  {tAuth('sign_up')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6">
        <section className="py-24 flex flex-col items-center text-center">

          {/* Live Badge */}
          <div className="mb-7 inline-flex items-center gap-2 bg-accent/8 hover:bg-accent/12 border border-accent/25 text-accent px-5 py-2 rounded-full text-xs font-bold transition-colors duration-150 cursor-default shadow-sm shadow-accent/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <Sparkles className="w-3.5 h-3.5" />
            {isAr ? 'الجيل القادم من أتمتة مسارات العمل' : 'Next-generation Workflow Automation'}
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-sans font-extrabold tracking-tight max-w-5xl leading-[1.08] mb-7">
            {isAr ? (
              <>
                أتمتة{' '}
                <span className="relative inline-block">
                  <span className="bg-linear-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                    ذكية
                  </span>
                  <span className="absolute -bottom-2 left-0 w-full h-1 bg-linear-to-r from-primary/40 via-purple-500/40 to-accent/40 rounded-full blur-sm" />
                </span>
                {' '}بلمسة بصرية
              </>
            ) : (
              <>
                Build{' '}
                <span className="relative inline-block">
                  <span className="bg-linear-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                    Agentic
                  </span>
                  <span className="absolute -bottom-2 left-0 w-full h-1 bg-linear-to-r from-primary/40 via-purple-500/40 to-accent/40 rounded-full blur-sm" />
                </span>
                {' '}Workflows
                <br className="hidden md:block" />
                <span className="text-muted-foreground/70">Visually.</span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-10 font-light leading-relaxed">
            {isAr
              ? 'صمم وتعاون ونفذ مخططات سير عمل معقدة بمساعدة الذكاء الاصطناعي من Gemini، مع لوحات عمل تعاونية فورية وحماية متقدمة.'
              : 'Design, collaborate, and execute complex logic workflows with Gemini-powered AI, real-time multiplayer boards, and enterprise-grade security.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-20">
            <Link href={`/${locale}/auth/sign-up`} passHref>
              <Button size="lg" className="bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold px-8 py-6 text-base rounded-2xl shadow-xl shadow-primary/25 transition-all duration-150 hover:shadow-primary/40 hover:scale-[1.04] active:scale-[0.97] cursor-pointer flex items-center gap-2 group">
                {isAr ? 'ابدأ مجاناً' : 'Start for Free'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform duration-150" />
              </Button>
            </Link>
            <Link href={`/${locale}/dashboard`} passHref>
              <Button size="lg" variant="outline" className="border-border/80 hover:bg-muted/50 hover:border-accent/30 font-semibold px-8 py-6 text-base rounded-2xl transition-all duration-150 hover:scale-[1.02] active:scale-[0.97] cursor-pointer flex items-center gap-2 group">
                {tDash('title')}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
              </Button>
            </Link>
          </div>

          {/* Social proof bar */}
          <div className="flex items-center gap-6 text-xs text-muted-foreground mb-20 flex-wrap justify-center">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {isAr ? 'لا بطاقة ائتمان' : 'No credit card required'}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {isAr ? '14 يوماً تجريبياً مجاناً' : '14-day free trial'}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {isAr ? 'إلغاء في أي وقت' : 'Cancel anytime'}
            </span>
          </div>

          {/* Live Interactive Workflow Canvas Preview */}
          <div className="w-full max-w-5xl relative group">
            {/* Ambient glow */}
            <div className="absolute -inset-4 bg-linear-to-r from-accent/8 via-primary/6 to-purple-500/8 rounded-[2.5rem] blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-700 -z-10" />

            <div className="relative bg-background/50 dark:bg-zinc-950/50 backdrop-blur-2xl border border-border/60 rounded-3xl overflow-hidden shadow-2xl shadow-black/10">
              {/* Window chrome */}
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-[10px] font-mono text-muted-foreground ms-3 select-none">lead_scoring_automation.skima</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-emerald-500 dark:text-emerald-400">{isAr ? 'يعمل الآن' : 'LIVE'}</span>
                </div>
              </div>

              {/* Animated flow particles */}
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes flowDash {
                  to { stroke-dashoffset: -40; }
                }
                .flow-dash {
                  stroke-dasharray: 8 8;
                  animation: flowDash 1.2s linear infinite;
                }
              `}} />

              {/* Canvas body */}
              <div className="p-6 md:p-10 min-h-[380px] flex flex-col justify-between">
                <div className="relative flex-1 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 py-6">
                  {/* Connecting SVG paths */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" style={{ overflow: 'visible' }}>
                    <path
                      d={isAr ? "M 800 80 C 640 80 500 80 320 80" : "M 100 80 C 260 80 400 80 580 80"}
                      fill="none"
                      stroke="currentColor"
                      className="text-border/40 dark:text-zinc-800/60"
                      strokeWidth="1.5"
                    />
                    <path
                      d={isAr ? "M 800 80 C 640 80 500 80 320 80" : "M 100 80 C 260 80 400 80 580 80"}
                      fill="none"
                      stroke="url(#grad1)"
                      className="flow-dash"
                      strokeWidth="2"
                    />
                    <path
                      d={isAr ? "M 580 80 C 440 80 320 80 120 80" : "M 330 80 C 500 80 620 80 800 80"}
                      fill="none"
                      stroke="currentColor"
                      className="text-border/40 dark:text-zinc-800/60"
                      strokeWidth="1.5"
                    />
                    <path
                      d={isAr ? "M 580 80 C 440 80 320 80 120 80" : "M 330 80 C 500 80 620 80 800 80"}
                      fill="none"
                      stroke="url(#grad2)"
                      className="flow-dash"
                      strokeWidth="2"
                      style={{ animationDelay: '0.6s' }}
                    />
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Node 1: Trigger */}
                  <div className="w-full md:w-52 bg-card/80 border border-blue-500/20 rounded-2xl shadow-sm shadow-blue-500/5 p-4 relative hover:scale-[1.04] hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-150 group/node text-start cursor-default">
                    <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent rounded-2xl" />
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-extrabold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md tracking-wider">Trigger</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                          <Database className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{isAr ? 'استمارة تسجيل' : 'New Sign-up Form'}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{isAr ? 'مستمع الويب' : 'Webhook listener'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 -right-1.5 rtl:-left-1.5 rtl:right-auto -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-background hidden md:block shadow-sm shadow-blue-500/50" />
                  </div>

                  {/* Node 2: AI */}
                  <div className="w-full md:w-52 bg-card/80 border border-purple-500/30 rounded-2xl shadow-md shadow-purple-500/10 p-4 relative hover:scale-[1.04] hover:shadow-lg hover:shadow-purple-500/15 transition-all duration-150 group/node text-start cursor-default">
                    <div className="absolute inset-0 bg-linear-to-br from-purple-500/8 to-pink-500/5 rounded-2xl" />
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-extrabold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-md tracking-wider">AI Model</span>
                        <span className="text-[8px] text-purple-500 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 animate-spin" /> {isAr ? 'يحلل' : 'Processing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{isAr ? 'مصنف الذكاء الاصطناعي' : 'AI Lead Classifier'}</p>
                          <p className="text-[9px] text-muted-foreground truncate">Gemini Pro 1.5</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 -left-1.5 rtl:-right-1.5 rtl:left-auto -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 border-2 border-background hidden md:block shadow-sm shadow-purple-500/50" />
                    <div className="absolute top-1/2 -right-1.5 rtl:-left-1.5 rtl:right-auto -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 border-2 border-background hidden md:block shadow-sm shadow-purple-500/50" />
                  </div>

                  {/* Node 3: Decision */}
                  <div className="w-full md:w-52 bg-card/80 border border-amber-500/20 rounded-2xl shadow-sm p-4 relative hover:scale-[1.04] hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-150 group/node text-start cursor-default">
                    <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent rounded-2xl" />
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md tracking-wider">Decision</span>
                        <span className="text-[9px] font-bold text-emerald-500">YES (98%)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{isAr ? 'تقييم الأهمية' : 'Lead Score > 80'}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{isAr ? 'تحويل شرطي' : 'Condition router'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 -left-1.5 rtl:-right-1.5 rtl:left-auto -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 border-2 border-background hidden md:block shadow-sm shadow-amber-500/50" />
                    <div className="absolute top-1/2 -right-1.5 rtl:-left-1.5 rtl:right-auto -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 border-2 border-background hidden md:block shadow-sm shadow-amber-500/50" />
                  </div>

                  {/* Node 4: Integration */}
                  <div className="w-full md:w-52 bg-card/80 border border-emerald-500/20 rounded-2xl shadow-sm p-4 relative hover:scale-[1.04] hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-150 group/node text-start cursor-default">
                    <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent rounded-2xl" />
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md tracking-wider">Action</span>
                        <span className="text-[9px] text-emerald-500 font-bold">{isAr ? 'تم' : 'Done ✓'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{isAr ? 'إرسال إشعار' : 'Send Slack & CRM'}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{isAr ? 'مزامنة HubSpot' : 'HubSpot & Slack'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 -left-1.5 rtl:-right-1.5 rtl:left-auto -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background hidden md:block shadow-sm shadow-emerald-500/50" />
                  </div>
                </div>

                {/* Canvas status bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-muted-foreground font-light border-t border-border/40 pt-4 gap-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {isAr ? 'اكتمل التشغيل بنجاح في 1.2 ثانية' : 'Execution completed in 1.2s · 4 nodes · 0 errors'}
                  </span>
                  <span className="font-mono">{isAr ? 'آخر تشغيل: ثانية' : 'Last run: 1s ago'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Banner */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto -mt-4 mb-24 px-2">
          {[
            { label: isAr ? 'مستخدم نشط' : 'Active Users', value: '12K+', icon: Users, color: 'text-blue-500' },
            { label: isAr ? 'مسار عمل منجز' : 'Workflows Built', value: '80K+', icon: Workflow, color: 'text-purple-500' },
            { label: isAr ? 'نقطة تكامل' : 'Integrations', value: '200+', icon: Globe, color: 'text-emerald-500' },
            { label: isAr ? 'وقت تشغيل' : 'Uptime SLA', value: '99.9%', icon: Shield, color: 'text-amber-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card/60 backdrop-blur border border-border/60 rounded-2xl p-4 flex flex-col items-center text-center hover:border-border hover:shadow-sm transition-all duration-150">
              <stat.icon className={`w-5 h-5 mb-2 ${stat.color}`} />
              <span className="text-2xl font-extrabold tracking-tight">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{stat.label}</span>
            </div>
          ))}
        </section>

        {/* Feature Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-24">
          {[
            {
              icon: Workflow,
              gradient: 'from-blue-500 to-indigo-600',
              softBg: 'bg-blue-500/8 hover:bg-blue-500/12',
              borderGlow: 'hover:border-blue-500/30 hover:shadow-blue-500/8',
              accent: 'text-blue-500',
              title: isAr ? 'محرر اللوحة المرئي' : 'Visual Canvas Editor',
              desc: isAr
                ? 'محرر لوحة عالي الأداء مع مكتبة تضم أكثر من 40 عقدة، وتنسيق تلقائي وإمكانيات تصدير متميزة.'
                : 'High-performance XYFlow/React Flow canvas. 40+ node library, auto-layouts, and full export capabilities.',
            },
            {
              icon: Sparkles,
              gradient: 'from-purple-500 to-pink-600',
              softBg: 'bg-purple-500/8 hover:bg-purple-500/12',
              borderGlow: 'hover:border-purple-500/30 hover:shadow-purple-500/8',
              accent: 'text-purple-500',
              title: isAr ? 'مساعد الذكاء الاصطناعي' : 'AI Agent Assistance',
              desc: isAr
                ? 'صمم العمليات تلقائياً من نصوص عادية، وحلل الاختناقات، واكتشف أخطاء التشغيل بلمسة واحدة.'
                : 'Synthesize workflows from plain text prompts. Query AI for layout optimization, bottleneck analysis, and error resolution.',
            },
            {
              icon: Database,
              gradient: 'from-emerald-500 to-teal-600',
              softBg: 'bg-emerald-500/8 hover:bg-emerald-500/12',
              borderGlow: 'hover:border-emerald-500/30 hover:shadow-emerald-500/8',
              accent: 'text-emerald-500',
              title: isAr ? 'خلفية سحابية متكاملة' : 'Supabase Backend',
              desc: isAr
                ? 'مؤمنة بالكامل عبر سياسات أمان مستوى الصف. مزامنة فورية متعددة المستخدمين عبر WebSocket.'
                : 'Secured via granular Row Level Security policies. Instant multiplayer sync via real-time WebSocket tables.',
            },
          ].map((feature) => (
            <Card
              key={feature.title}
              className={`border-border/70 backdrop-blur-md ${feature.softBg} ${feature.borderGlow} hover:shadow-lg hover:-translate-y-1.5 transition-all duration-200 rounded-2xl group overflow-hidden relative`}
            >
              <div className={`absolute top-0 left-0 w-full h-0.5 bg-linear-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardHeader className="p-6 md:p-8">
                <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg font-bold font-sans mb-2.5">{feature.title}</CardTitle>
                <CardDescription className="text-muted-foreground font-light text-sm leading-relaxed">{feature.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        {/* Platform Metrics */}
        <section className="max-w-4xl mx-auto mb-24 border-t border-border/50 pt-16">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-2xl md:text-3xl font-bold font-sans">
              {isAr ? 'بنية المنصة الأساسية' : 'Platform Foundation Metrics'}
            </h2>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-emerald-500">ALL SYSTEMS STABLE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Languages, color: 'text-purple-500', bg: 'bg-purple-500/10', label: isAr ? 'الترجمة واللغة' : 'Localization', value: isAr ? 'العربية (RTL)' : 'English (LTR)' },
              { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Tailwind CSS', value: isAr ? 'V4 مفعّل' : 'V4 Enabled' },
              { icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: isAr ? 'أمان البيانات' : 'Data Security', value: isAr ? 'Supabase RLS' : 'Supabase RLS' },
              { icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-500/10', label: isAr ? 'المدفوعات' : 'Payments', value: isAr ? 'Stripe مدمج' : 'Stripe Active' },
            ].map((item) => (
              <div key={item.label} className="bg-card/60 hover:bg-muted/40 border border-border/60 hover:border-border p-5 rounded-2xl flex items-center gap-4 transition-all duration-150 hover:scale-[1.02] shadow-xs text-start">
                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-4xl mx-auto mb-24">
          <div className="relative bg-linear-to-br from-primary/10 via-accent/5 to-purple-500/10 border border-primary/20 rounded-3xl p-10 md:p-14 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/8 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/8 rounded-full blur-3xl -z-10" />
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-bold text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              {isAr ? 'ابدأ اليوم' : 'Get started today'}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {isAr ? 'جاهز لأتمتة مساراتك؟' : 'Ready to automate your workflows?'}
            </h2>
            <p className="text-muted-foreground text-base mb-8 max-w-xl mx-auto font-light">
              {isAr
                ? 'انضم إلى آلاف الفرق التي تستخدم Skima لبناء عمليات ذكية أسرع وأكثر موثوقية.'
                : 'Join thousands of teams using Skima to build faster, smarter, more reliable processes.'}
            </p>
            <Link href={`/${locale}/auth/sign-up`} passHref>
              <Button size="lg" className="bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold px-10 py-6 text-base rounded-2xl shadow-xl shadow-primary/25 transition-all duration-150 hover:shadow-primary/35 hover:scale-[1.04] active:scale-[0.97] cursor-pointer inline-flex items-center gap-2 group">
                {isAr ? 'ابدأ مجاناً الآن' : 'Start Free — No Credit Card'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform duration-150" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-zinc-950 py-10 text-sm text-muted-foreground transition-colors duration-300 w-full">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <AppLogo variant="full" size={26} href={`/${locale}`} />

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
            <Link href={`/${locale}/help`} className="hover:text-zinc-200 hover:no-underline transition-colors duration-150">
              {isAr ? 'المساعدة والتوثيق' : 'Help & Docs'}
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-zinc-200 hover:no-underline transition-colors duration-150">
              {isAr ? 'شروط الخدمة' : 'Terms'}
            </Link>
            <Link href={`/${locale}/privacy`} className="hover:text-zinc-200 hover:no-underline transition-colors duration-150">
              {isAr ? 'الخصوصية' : 'Privacy'}
            </Link>
          </div>

          <p className="text-[11px] text-zinc-600 font-light">
            {isAr ? '© 2026 Skima. جميع الحقوق محفوظة.' : '© 2026 Skima. All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
