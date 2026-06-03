import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Layout, 
  Shield, 
  Mail, 
  GraduationCap, 
  Sparkles 
} from 'lucide-react';
import Link from 'next/link';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const PLATFORM_INFO = {
  name: {
    en: "Visual Workflow v2",
    ar: "منصة سير العمل المرئي v2"
  },
  tagline: {
    en: "Infinite Whiteboard meets Advanced Workflow Automation",
    ar: "لوحة عمل لا نهائية تلتقي مع أتمتة مسارات العمل المتقدمة"
  },
  description: {
    en: "An advanced workflow automation SaaS equipped with an infinite interactive whiteboard system.",
    ar: "منصة برمجية متقدمة لأتمتة سير العمل مجهزة بنظام لوحة تفاعلية لا نهائية."
  },
  mission: {
    en: "Empowering developers and businesses to build and manage complex workflows visually and without space limits.",
    ar: "تمكين المطورين والشركات من بناء وإدارة مسارات العمل المعقدة بصرياً وبدون قيود مساحة العمل."
  }
};

const FOUNDER_INFO = {
  name: {
    en: "Ahmed Mohamed Attia",
    ar: "أحمد محمد عطية"
  },
  title: {
    en: "Founder & Lead Architect",
    ar: "المؤسس والمهندس الرئيسي للمنصة"
  },
  university: {
    en: "Zagazig University",
    ar: "جامعة الزقازيق"
  },
  major: {
    en: "Electronics and Communications Engineering Student",
    ar: "طالب هندسة الإلكترونيات والاتصالات"
  },
  bio: {
    en: "Specialized in building low-latency software architectures, advanced digital logic design, and interactive production-ready systems. Passionate about bridging hardware-level efficiency with modern full-stack web applications.",
    ar: "متخصص في بناء برمجيات ذات زمن استجابة منخفض، وتصميم المنطق الرقمي المتقدم، والأنظمة التفاعلية الجاهزة للإنتاج. شغوف بربط الكفاءة البرمجية على مستوى العتاد مع تطبيقات الويب الحديثة المتكاملة."
  },
  github: "https://github.com/Ahm3d0x",
  linkedin: "https://www.linkedin.com/in/ahmed-m-attia-757aa6292/",
  email: "ahm3d.m.attia@gmail.com"
};

const PLATFORM_PILLARS = [
  {
    title: {
      en: "Low-Latency Logic",
      ar: "منطق منخفض الاستجابة"
    },
    desc: {
      en: "High-performance processing engines that execute workflow nodes sequentially and asynchronously with minimal latency.",
      ar: "محركات معالجة عالية الأداء تنفذ عقد سير العمل بشكل متسلسل وغير متزامن وبأقل زمن استجابة ممكن."
    },
    icon: Zap,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    glow: "hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)]"
  },
  {
    title: {
      en: "Infinite Interactive Canvas",
      ar: "لوحة عمل تفاعلية لا نهائية"
    },
    desc: {
      en: "Powered by modern canvas layers allowing seamless panning, zooming, and node creation without spatial boundaries.",
      ar: "تعتمد على طبقات لوحة رسم حديثة تسمح بالتنقل السلس والتقريب وإنشاء العقد دون قيود مكانية."
    },
    icon: Layout,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    glow: "hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.06)]"
  },
  {
    title: {
      en: "Enterprise Security & RLS",
      ar: "أمان بمستوى المؤسسات وسياسات RLS"
    },
    desc: {
      en: "Granular Row Level Security (RLS) tables inside Supabase secure database structure to protect workspace data privacy.",
      ar: "جداول أمان دقيقة على مستوى الصفوف (RLS) داخل قاعدة بيانات Supabase لحماية خصوصية بيانات مساحة العمل بالكامل."
    },
    icon: Shield,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    glow: "hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)]"
  }
];

export default async function AboutPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  return (
    <div className="space-y-12 animate-fadeIn font-sans pb-12 relative overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Decorative Orbs */}
      <div className="absolute top-[10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(124,58,237,0.06),transparent)] blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-[20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(59,130,246,0.05),transparent)] blur-3xl pointer-events-none -z-10" />

      {/* 1. Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge className="bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15 px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          {isAr ? 'قصة نجاح طموحة' : 'Ambitious Platform Story'}
        </Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-linear-to-r from-primary via-accent to-node-ai bg-clip-text text-transparent">
          {isAr ? PLATFORM_INFO.name.ar : PLATFORM_INFO.name.en}
        </h1>
        <p className="text-lg font-bold text-foreground max-w-xl mx-auto leading-normal">
          {isAr ? PLATFORM_INFO.tagline.ar : PLATFORM_INFO.tagline.en}
        </p>
        <p className="text-sm text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
          {isAr ? PLATFORM_INFO.description.ar : PLATFORM_INFO.description.en}
        </p>
      </div>

      {/* 2. Platform Pillars (Features) */}
      <div className="space-y-6">
        <div className="text-start">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight border-b border-border pb-2.5">
            {isAr ? 'الركائز الهندسية للمنصة' : 'Technical Platform Pillars'}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLATFORM_PILLARS.map((pillar, idx) => {
            const IconComponent = pillar.icon;
            return (
              <Card key={idx} className={`bg-card/45 border border-border backdrop-blur-md shadow-xs rounded-2xl transition-all duration-300 ${pillar.glow} group hover:-translate-y-1`}>
                <CardHeader className="p-6 pb-2 space-y-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110 ${pillar.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold tracking-tight text-start">
                    {isAr ? pillar.title.ar : pillar.title.en}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2">
                  <p className="text-xs text-muted-foreground font-light leading-relaxed text-start">
                    {isAr ? pillar.desc.ar : pillar.desc.en}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 3. Founder & Management Profile */}
      <div className="space-y-6">
        <div className="text-start">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight border-b border-border pb-2.5">
            {isAr ? 'القيادة والتأسيس' : 'Founding Leadership'}
          </h2>
        </div>

        <Card className="bg-card/45 border border-border backdrop-blur-md shadow-xs rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-linear-to-r from-accent to-node-ai" />
          <CardContent className="p-6 md:p-10 flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center">
            {/* Avatar / Monogram */}
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-linear-to-tr from-accent to-node-ai text-white text-2xl md:text-4xl font-extrabold flex items-center justify-center shrink-0 shadow-lg shadow-accent/15 select-none relative">
              <span className="absolute inset-0 bg-accent/20 blur-md rounded-full animate-pulse" />
              <span className="relative">AMA</span>
            </div>

            {/* Profile Bio */}
            <div className="flex-1 space-y-4 text-start min-w-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">
                    {isAr ? FOUNDER_INFO.name.ar : FOUNDER_INFO.name.en}
                  </h3>
                  <Badge variant="secondary" className="bg-accent/10 border border-accent/25 text-accent font-semibold px-2.5 py-0.5 rounded-md text-[10px] uppercase">
                    {isAr ? FOUNDER_INFO.title.ar : FOUNDER_INFO.title.en}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium flex-wrap">
                  <GraduationCap className="w-4 h-4 text-accent shrink-0" />
                  <span>{isAr ? FOUNDER_INFO.major.ar : FOUNDER_INFO.major.en}</span>
                  <span className="text-zinc-600 hidden sm:inline">|</span>
                  <span>{isAr ? FOUNDER_INFO.university.ar : FOUNDER_INFO.university.en}</span>
                </div>
              </div>

              <blockquote className="border-s-2 border-accent/40 ps-4 py-1 text-xs md:text-sm italic font-light text-muted-foreground leading-relaxed">
                {isAr ? FOUNDER_INFO.bio.ar : FOUNDER_INFO.bio.en}
              </blockquote>

              {/* Social Links buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={FOUNDER_INFO.github} target="_blank" passHref>
                  <Button variant="outline" className="h-9 px-4 rounded-xl border-border hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer select-none">
                    <GithubIcon className="w-4 h-4" />
                    <span>GitHub</span>
                  </Button>
                </Link>
                <Link href={FOUNDER_INFO.linkedin} target="_blank" passHref>
                  <Button variant="outline" className="h-9 px-4 rounded-xl border-border hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer select-none">
                    <LinkedinIcon className="w-4 h-4 text-sky-500" />
                    <span>LinkedIn</span>
                  </Button>
                </Link>
                <Link href={`mailto:${FOUNDER_INFO.email}`} passHref>
                  <Button variant="outline" className="h-9 px-4 rounded-xl border-border hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer select-none">
                    <Mail className="w-4 h-4 text-emerald-500" />
                    <span>Email</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Connect Footer */}
      <div className="text-center pt-6 border-t border-border/80">
        <p className="text-xs text-muted-foreground font-light leading-relaxed">
          {isAr ? PLATFORM_INFO.mission.ar : PLATFORM_INFO.mission.en}
        </p>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'حول المنصة — Visual Workflow SaaS' : 'About Platform — Visual Workflow SaaS',
    description: isAr
      ? 'تعرف على قصة المنصة والمميزات التقنية والمؤسس أحمد محمد عطية.'
      : 'Learn about the platform story, technical pillars, and founder Ahmed Mohamed Attia.',
  };
}
