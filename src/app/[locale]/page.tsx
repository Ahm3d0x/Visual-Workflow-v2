import { getTranslations } from 'next-intl/server';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
  Mail 
} from 'lucide-react';
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
      {/* Premium Orb Glows */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(124,58,237,0.12),transparent)] blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-[-10%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(59,130,246,0.1),transparent)] blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[20%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(236,72,153,0.08),transparent)] blur-3xl pointer-events-none -z-10" />

      {/* Grid Canvas Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-20 opacity-70 pointer-events-none" />

      {/* Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center">
              <Workflow className="w-6 h-6 animate-pulse" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
              {isAr ? 'منصة سير العمل المرئي' : 'Visual Workflow SaaS'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle currentLocale={locale} />
            <ThemeToggle />
            <Link href={`/${locale}/auth/sign-in`} passHref>
              <Button variant="ghost" className="font-semibold cursor-pointer text-sm">
                {tAuth('sign_in')}
              </Button>
            </Link>
            <Link href={`/${locale}/auth/sign-up`} passHref>
              <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 rounded-xl shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:scale-[1.02] cursor-pointer text-sm">
                {tAuth('sign_up')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        {/* Glow Badge */}
        <Badge className="bg-accent/10 hover:bg-accent/15 border border-accent/20 text-accent px-4 py-1.5 mb-6 text-sm font-semibold rounded-full flex items-center gap-2 animate-fadeIn shadow-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <Sparkles className="w-4 h-4" />
          {isAr ? 'الجيل القادم من أتمتة مسارات العمل' : 'Next-generation Workflow Automation'}
        </Badge>
        
        {/* Main Header */}
        <h1 className="text-5xl md:text-7xl font-sans font-extrabold tracking-tight max-w-4xl leading-[1.12] mb-8 animate-fadeIn">
          {isAr ? (
            <>
              ابنِ وأتمتْ{' '}
              <span className="bg-linear-to-r from-primary via-accent to-node-ai bg-clip-text text-transparent drop-shadow-xs">
                مسارات العمل الذكية
              </span>{' '}
              بصرياً
            </>
          ) : (
            <>
              Build & Automate{" "}
              <span className="bg-linear-to-r from-primary via-accent to-node-ai bg-clip-text text-transparent drop-shadow-xs">
                Agentic Workflows
              </span>{" "}
              Visually
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed">
          {isAr
            ? 'صمم وتعاون ونفذ مخططات سير عمل معقدة بمساعدة الذكاء الاصطناعي من Gemini، وحماية Supabase الفائقة، مع لوحات عمل تعاونية فورية متعددة اللاعبين.'
            : 'Design, collaborate, and execute complex logic workflows with Gemini-powered AI assistance, Supabase security, and fully real-time multiplayer boards.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link href={`/${locale}/auth/sign-up`} passHref>
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 py-6 text-lg rounded-xl shadow-xl shadow-accent/25 transition-all duration-300 hover:scale-[1.03] group cursor-pointer flex items-center gap-2">
              {isAr ? 'ابدأ التجربة المجانية' : 'Start Free Trial'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href={`/${locale}/dashboard`} passHref>
            <Button size="lg" variant="outline" className="border-border hover:bg-muted font-semibold px-8 py-6 text-lg rounded-xl transition-all duration-300 hover:scale-[1.01] cursor-pointer">
              {tDash('title')}
            </Button>
          </Link>
        </div>

        {/* Live Interactive Workflow Canvas Preview */}
        <div className="w-full max-w-5xl mt-8 px-4 md:px-0 relative group">
          {/* Ambient glow container */}
          <div className="absolute inset-0 bg-linear-to-r from-accent/10 to-node-ai/10 rounded-3xl blur-3xl opacity-50 -z-10 group-hover:opacity-70 transition-opacity duration-700" />
          
          <div className="relative bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl border border-border rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden min-h-[440px] flex flex-col justify-between">
            {/* Header of Mock Canvas */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs font-mono text-muted-foreground ms-2">lead_scoring_and_automation.json</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-emerald-500 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isAr ? 'يعمل الآن' : 'LIVE RUNNING'}</span>
              </div>
            </div>

            {/* Custom SVG styling for flow particles */}
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes dash {
                to {
                  stroke-dashoffset: -40;
                }
              }
              .animate-flow-dash {
                stroke-dasharray: 8, 8;
                animation: dash 12s linear infinite;
              }
            `}} />

            {/* Nodes Visual Representation */}
            <div className="relative flex-1 flex flex-col md:flex-row items-center justify-between gap-12 md:gap-4 py-8">
              {/* LTR/RTL Connection Paths */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" style={{ overflow: 'visible' }}>
                <path 
                  d={isAr ? "M 800 100 Q 560 100 360 100 T 120 100" : "M 120 100 Q 360 100 560 100 T 800 100"} 
                  fill="none" 
                  stroke="currentColor" 
                  className="text-border dark:text-zinc-800" 
                  strokeWidth="2" 
                />
                <path 
                  d={isAr ? "M 800 100 Q 560 100 360 100 T 120 100" : "M 120 100 Q 360 100 560 100 T 800 100"} 
                  fill="none" 
                  stroke="url(#mockup-grad)" 
                  className="animate-flow-dash" 
                  strokeWidth="2.5" 
                />
                <defs>
                  <linearGradient id="mockup-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Node 1: Trigger */}
              <div className="w-full md:w-52 bg-card border border-border rounded-2xl shadow-lg p-4 relative hover:scale-105 transition-transform duration-300 group/node text-start">
                <div className="absolute -inset-px bg-linear-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-0 group-hover/node:opacity-30 blur-xs transition-opacity duration-300" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md">Trigger</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{isAr ? 'استمارة تسجيل' : 'New Sign-up Form'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{isAr ? 'مستمع الويب' : 'Webhook listener'}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 -right-1.5 rtl:-left-1.5 rtl:right-auto -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-background hidden md:block" />
              </div>

              {/* Node 2: AI Classification */}
              <div className="w-full md:w-52 bg-card border border-border rounded-2xl shadow-lg p-4 relative hover:scale-105 transition-transform duration-300 group/node text-start">
                <div className="absolute -inset-px bg-linear-to-r from-purple-500 to-pink-500 rounded-2xl opacity-30 blur-xs transition-opacity duration-300" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-purple-500 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-md">AI Model</span>
                    <span className="text-[9px] text-purple-500 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-spin" /> {isAr ? 'جاري التحليل' : 'Processing'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{isAr ? 'مصنف المشاعر' : 'AI Lead Classifier'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">Gemini Pro 1.5</p>
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 -left-1.5 rtl:-right-1.5 rtl:left-auto -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 border-2 border-background hidden md:block" />
                <div className="absolute top-1/2 -right-1.5 rtl:-left-1.5 rtl:right-auto -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 border-2 border-background hidden md:block" />
              </div>

              {/* Node 3: Router */}
              <div className="w-full md:w-52 bg-card border border-border rounded-2xl shadow-lg p-4 relative hover:scale-105 transition-transform duration-300 group/node text-start">
                <div className="absolute -inset-px bg-linear-to-r from-amber-500 to-orange-500 rounded-2xl opacity-0 group-hover/node:opacity-30 blur-xs transition-opacity duration-300" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md">Decision</span>
                    <span className="text-[9px] font-bold text-emerald-500">YES (98%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{isAr ? 'تقييم الأهمية' : 'Lead Score > 80'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{isAr ? 'تحويل شرطي' : 'Condition router'}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 -left-1.5 rtl:-right-1.5 rtl:left-auto -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 border-2 border-background hidden md:block" />
                <div className="absolute top-1/2 -right-1.5 rtl:-left-1.5 rtl:right-auto -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 border-2 border-background hidden md:block" />
              </div>

              {/* Node 4: Integration */}
              <div className="w-full md:w-52 bg-card border border-border rounded-2xl shadow-lg p-4 relative hover:scale-105 transition-transform duration-300 group/node text-start">
                <div className="absolute -inset-px bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-0 group-hover/node:opacity-30 blur-xs transition-opacity duration-300" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md">Integration</span>
                    <span className="text-[9px] text-emerald-500 font-bold">{isAr ? 'تم بنجاح' : 'Success'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{isAr ? 'إرسال تنبيه البريد' : 'Send Slack & CRM'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{isAr ? 'مزامنة HubSpot' : 'HubSpot & Slack sync'}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 -left-1.5 rtl:-right-1.5 rtl:left-auto -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background hidden md:block" />
              </div>
            </div>

            {/* Bottom status of canvas */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground font-light border-t border-border pt-4">
              <span className="flex items-center gap-2 mb-2 sm:mb-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'اكتمل تشغيل المخطط بنجاح في 1.2 ثانية' : 'Execution completed successfully in 1.2s'}</span>
              </span>
              <span>{isAr ? 'آخر تشغيل: ثانية واحدة مضت' : 'Last run: 1s ago'}</span>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mt-32 text-start">
          <Card className="bg-background/40 border-border/80 backdrop-blur-md hover:shadow-[0_0_30px_rgba(37,99,235,0.06)] hover:border-blue-500/40 hover:-translate-y-1.5 transition-all duration-500 rounded-2xl group overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="p-6 md:p-8">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <Workflow className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold font-sans mb-3">
                {isAr ? 'محرر اللوحة المرئي' : 'Visual Canvas Editor'}
              </CardTitle>
              <CardDescription className="text-muted-foreground font-light text-sm leading-relaxed">
                {isAr
                  ? 'محرر لوحة عالي الأداء معتمد على XYFlow/React Flow. مكتبة كاملة تضم أكثر من 40 عقدة، وطبقات تحقق قوية، وتنسيق تلقائي مع إمكانيات تصدير متميزة.'
                  : 'High-performance XYFlow/React Flow canvas editor. Complete library of 40+ nodes, validation layers, auto-layouts, and export capabilities.'}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-background/40 border-border/80 backdrop-blur-md hover:shadow-[0_0_30px_rgba(168,85,247,0.06)] hover:border-purple-500/40 hover:-translate-y-1.5 transition-all duration-500 rounded-2xl group overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="p-6 md:p-8">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold font-sans mb-3">
                {isAr ? 'مساعد الذكاء الاصطناعي الذكي' : 'AI Agent Assistance'}
              </CardTitle>
              <CardDescription className="text-muted-foreground font-light text-sm leading-relaxed">
                {isAr
                  ? 'صمم العمليات تلقائياً من توجيهات النصوص البسيطة. استعلم من عميل الذكاء الاصطناعي لتحسين التخطيط، وتحليل الاختناقات، وحل الأخط الأخطاء التشغيلية.'
                  : 'Synthesize processes automatically from raw text prompts. Query the AI Agent for layout optimizations, bottleneck analysis, and error resolution.'}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-background/40 border-border/80 backdrop-blur-md hover:shadow-[0_0_30px_rgba(16,185,129,0.06)] hover:border-emerald-500/40 hover:-translate-y-1.5 transition-all duration-500 rounded-2xl group overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="p-6 md:p-8">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xs">
                <Database className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold font-sans mb-3">
                {isAr ? 'خلفية سحابية متكاملة' : 'Supabase Backend'}
              </CardTitle>
              <CardDescription className="text-muted-foreground font-light text-sm leading-relaxed">
                {isAr
                  ? 'مؤمنة بالكامل عبر سياسات أمان مستوى الصف (RLS) الدقيقة. مزامنة فورية متعددة اللاعبين ومستقرة عبر جداول WebSocket في الوقت الفعلي.'
                  : 'Secured via granular Row Level Security (RLS) policies. Instant multiplayer syncing via real-time WebSocket tables.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Upgraded Foundations Verification Console Section */}
        <section className="w-full max-w-4xl mt-32 border-t border-border pt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold font-sans text-start">
              {isAr ? 'فحص البنية الأساسية للمنصة' : 'Platform Foundation Metrics'}
            </h2>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ALL SERVICES STABLE</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card hover:bg-muted/40 border border-border p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] shadow-xs text-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <Languages className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-muted-foreground uppercase">{isAr ? 'الترجمة واللغة' : 'Localization'}</p>
                <p className="text-sm font-bold text-foreground mt-0.5 truncate">
                  {isAr ? 'العربية (RTL)' : 'English (LTR)'}
                </p>
              </div>
            </div>

            <div className="bg-card hover:bg-muted/40 border border-border p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] shadow-xs text-start">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-muted-foreground uppercase">Tailwind CSS</p>
                <p className="text-sm font-bold text-foreground mt-0.5 truncate">
                  {isAr ? 'V4 مفعّل بالكامل' : 'V4 Engines Enabled'}
                </p>
              </div>
            </div>

            <div className="bg-card hover:bg-muted/40 border border-border p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] shadow-xs text-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-muted-foreground uppercase">{isAr ? 'أمان البيانات' : 'Data Security'}</p>
                <p className="text-sm font-bold text-foreground mt-0.5 truncate">
                  {isAr ? 'سياسات Supabase RLS' : 'Supabase RLS Active'}
                </p>
              </div>
            </div>

            <div className="bg-card hover:bg-muted/40 border border-border p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] shadow-xs text-start">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-muted-foreground uppercase">{isAr ? 'الاشتراكات والمدفوعات' : 'Payments & Billing'}</p>
                <p className="text-sm font-bold text-foreground mt-0.5 truncate">
                  {isAr ? 'بوابة Stripe مدمجة' : 'Stripe Subscriptions'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-border bg-zinc-950 py-12 text-sm text-muted-foreground transition-colors duration-300 w-full relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg flex items-center justify-center">
              <Workflow className="w-4 h-4" />
            </div>
            <span className="font-sans font-bold text-sm tracking-tight bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
              {isAr ? 'منصة سير العمل المرئي' : 'Visual Workflow SaaS'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
            <Link href={`/${locale}/help`} className="hover:text-foreground hover:no-underline transition-colors">
              {isAr ? 'مركز المساعدة ودليل العقد' : 'Help & Documentation'}
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-foreground hover:no-underline transition-colors">
              {isAr ? 'شروط الخدمة' : 'Terms of Service'}
            </Link>
            <Link href={`/${locale}/privacy`} className="hover:text-foreground hover:no-underline transition-colors">
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
          </div>

          <p className="text-xs text-zinc-500 font-light">
            {isAr
              ? '© 2026 جميع الحقوق محفوظة لمنصة سير العمل المرئي SaaS.'
              : '© 2026 Visual Workflow SaaS. All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
