'use client';

import { useState, useMemo, use } from 'react';
import { 
  ArrowLeft, ArrowRight, Shield, BookOpen, Key, 
  CreditCard, Activity, Scale, Eye, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface TermSection {
  id: string;
  iconName: string;
  en: {
    title: string;
    summary: string;
    details: string[];
  };
  ar: {
    title: string;
    summary: string;
    details: string[];
  };
}

const TERMS_SECTIONS: TermSection[] = [
  {
    id: 'accounts',
    iconName: 'Key',
    en: {
      title: 'User Accounts & Workspace Memberships',
      summary: 'Rules governing how users create accounts, manage workspace permissions, and secure collaborator tokens.',
      details: [
        'Users must provide valid emails to initialize workspaces and configure Supabase-backed authentication profiles.',
        'Workspace Owners hold exclusive administrative authorities, including generating join invitation tokens and delegating member roles (Admin, Editor, Commenter, Viewer).',
        'You are entirely responsible for keeping your collaborator tokens secure. Any action completed under an active session is attributed to your workspace owner profile.',
        'Sharing administrator credentials violates platform security rules and can cause immediate, permanent workspace suspension.'
      ]
    },
    ar: {
      title: 'حسابات المستخدمين وعضوية مساحات العمل',
      summary: 'القواعد التي تنظم كيفية إنشاء الحسابات، وإدارة أذونات مساحة العمل، وتأمين روابط انضمام المتعاونين.',
      details: [
        'يجب على المستخدمين تقديم بريد إلكتروني صالح ومؤكد لإنشاء مساحات العمل وتهيئة ملفاتهم الشخصية المدعومة بـ Supabase.',
        'يمتلك مالك مساحة العمل صلاحيات إدارية حصرية، بما في ذلك توليد روابط دعوة الأعضاء وتعيين أدوارهم (مشاهد، معلق، محرر، مدير).',
        'أنت مسؤول بالكامل عن الحفاظ على سرية روابط المتعاونين الخاصة بك. يُنسب أي إجراء يتم إكماله تحت جلسة نشطة إلى مالك مساحة العمل.',
        'يعدت مشاركة بيانات اعتماد الإدارة أو كلمات المرور خرقاً لقواعد أمان المنصة وقد تؤدي إلى تعليق مساحة العمل فوراً وبشكل دائم.'
      ]
    }
  },
  {
    id: 'orchestration',
    iconName: 'Activity',
    en: {
      title: 'Service Operations & Workflow Orchestrations',
      summary: 'Operational guidelines regarding runtime limits, custom workflow node executions, and AI processing scopes.',
      details: [
        'Execution limits and concurrent API threads quotas depend strictly on your active visual billing tier.',
        'Dynamic script executions (e.g. Process Steps custom scripts) must not contain malicious code designed to disrupt Supabase backend storage.',
        'AI Node processors (AI Generate, Summarize, Route) utilize Gemini and OpenAI endpoints. Prompt contexts must adhere to global safety criteria.',
        'Abusing high-frequency webhook triggers or running infinite logic loops can trigger automated platform rate-limiting and temporary flow suspension.'
      ]
    },
    ar: {
      title: 'عمليات التشغيل وأتمتة مسارات العمل',
      summary: 'الإرشادات التشغيلية المتعلقة بحدود التنفيذ، والتعليمات البرمجية المخصصة للعقد، ونطاقات المعالجة بالذكاء الاصطناعي.',
      details: [
        'تعتمد حدود تنفيذ سير العمل وحصص اتصالات الواجهات البرمجية (APIs) المتزامنة بدقة على فئة اشتراكك الفعالة.',
        'يجب ألا تحتوي البرمجيات النصية المخصصة (مثل نصوص خطوة معالجة البيانات) على تعليمات خبيثة مصممة لتعطيل سير خوادم المنصة.',
        'تستخدم عقد معالجة الذكاء الاصطناعي (توليد، تلخيص، توجيه) واجهات Gemini و OpenAI. يجب أن تلتزم النصوص المدخلة بمعايير السلامة العالمية.',
        'قد يؤدي إساءة استخدام مشغلات Webhook عالية التردد أو تشغيل حلقات تكرار منطقية لا نهائية إلى تفعيل نظام تخفيف المعدل التلقائي وإيقاف التدفق مؤقتاً.'
      ]
    }
  },
  {
    id: 'billing',
    iconName: 'CreditCard',
    en: {
      title: 'Billing, Upgrades, & Stripe Cancellations',
      summary: 'Rules governing payment processing, subscription tiers, pricing upgrades, and refund rules.',
      details: [
        'All subscription payments and upgrades are managed securely via Stripe Billing portals.',
        'Workspace seats are billed dynamically. Upgrading or adding new editor seats applies prorated charges immediately to the next billing cycle.',
        'Refund policies are subject to Stripe platform provisions. Workspace subscription cancellation blocks access to advanced AI tools at the end of the current cycle.',
        'Failure to process recurring payments automatically transitions your workspace to the Free Tier, temporarily locking workflows that exceed Free Tier node limits.'
      ]
    },
    ar: {
      title: 'الاشتراكات، الترقيات، وإجراءات الإلغاء عبر Stripe',
      summary: 'القوانين التي تنظم معالجة المدفوعات، فئات الاشتراك، ترقيات الأسعار، وقواعد استرداد الأموال.',
      details: [
        'تتم إدارة جميع مدفوعات الاشتراكات وترقيتها بأمان من خلال بوابة الفوترة والدفع الآمنة Stripe.',
        'يتم احتساب تكلفة مقاعد المتعاونين ديناميكياً. تؤدي ترقية المقاعد أو إضافتها إلى تطبيق رسوم تناسبية فوراً على دورة الفوترة التالية.',
        'تخضع سياسات استرداد الأموال لشروط منصة Stripe. يؤدي إلغاء الاشتراك إلى إيقاف الوصول للأدوات المتقدمة في نهاية الدورة الحالية.',
        'يؤدي فشل معالجة المدفوعات المتكررة إلى نقل مساحتك تلقائياً إلى الفئة المجانية، مما يغلق مؤقتاً المخططات التي تتجاوز حدود العقد المجانية.'
      ]
    }
  },
  {
    id: 'intellectual',
    iconName: 'BookOpen',
    en: {
      title: 'Data Ownership & Intellectual Property',
      summary: 'Clarification regarding who owns workflow structures, drawn canvas elements, and custom datasets.',
      details: [
        'Workspace owners retain complete ownership of all visual schemas, logic rules, exported PDFs, and whiteboard drawings.',
        'By deploying a custom public template, you grant the platform a non-exclusive license to showcase your layout to other workspace designers.',
        'All platform base designs, proprietary visual node components, canvas UI libraries, and the Antigravity system logic are owned exclusively by Visual Workflow SaaS.',
        'Reverse-engineering workflow execution logic or visual components for standalone commercial distributions is strictly forbidden.'
      ]
    },
    ar: {
      title: 'ملكية البيانات وحقوق الملكية الفكرية',
      summary: 'توضيح القوانين المتعلقة بملكية هياكل مسارات العمل، عناصر الرسم، ومجموعات البيانات المخصصة.',
      details: [
        'يحتفظ مالكو مساحة العمل بالملكية الكاملة لجميع المخططات المرئية، القواعد المنطقية، مستندات PDF المصدرة، ورسومات اللوحة.',
        'بإتاحتك لمخططك كقالب عام، فإنك تمنح المنصة ترخيصاً غير حصري لعرض تصميمك للمصممين الآخرين بهدف الاستلهام.',
        'جميع التصاميم الأساسية للمنصة، مكونات العقد الحصرية، ومكتبات لوحة العمل، مملوكة بالكامل وحصرياً لمنصة Visual Workflow.',
        'يُحظر تماماً الهندسة العكسية لمنطق تنفيذ سير العمل أو المكونات المرئية لإعادة توزيعها تجارياً بشكل مستقل.'
      ]
    }
  },
  {
    id: 'liability',
    iconName: 'Scale',
    en: {
      title: 'Limitation of Liability & Uptime Warranties',
      summary: 'Details regarding platform performance assurances, uptime limits, and third-party dependency exceptions.',
      details: [
        'The platform is provided "as is" and "as available". We do not guarantee continuous, uninterrupted workflow execution during upstream host drops.',
        'We are not liable for business losses, data corruption, or missed deadlines resulting from failing external REST API requests or custom script exceptions.',
        'We highly recommend configuring retry blocks (`Retry Block` nodes) and fallback paths (`Error Handler` nodes) to protect your systems against transient external failures.',
        'Antigravity core diagnostics check systems continuously to maintain high operational standards and secure maximum performance.'
      ]
    },
    ar: {
      title: 'إخلاء المسؤولية وحدود الضمان التشغيلي',
      summary: 'تفاصيل بشأن ضمانات أداء المنصة، ومستويات توفر الخدمة، واستثناءات تعطل الخدمات الخارجية.',
      details: [
        'يتم تقديم المنصة "كما هي" و"حسب توفرها". نحن لا نضمن تنفيذاً مستمراً وخالياً من الانقطاع في حال تعطل الخوادم السحابية الأساسية.',
        'نحن غير مسؤولين عن أي خسائر مالية، أو تلف للبيانات، أو فوات مواعيد نهائية ناتجة عن فشل طلبات APIs الخارجية أو أخطاء الأكواد.',
        'نوصي بشدة بتهيئة كتل إعادة المحاولة (عقد Retry Block) ومسارات الطوارئ (عقد Error Handler) لحماية نظامك من الأعطال الخارجية.',
        'تقوم أدوات الفحص البرمجي بفحص الأنظمة بشكل مستمر للحفاظ على أعلى معايير التشغيل وتأمين الكفاءة القصوى.'
      ]
    }
  }
];

export default function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isRtl = locale === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('accounts');

  const filteredSections = useMemo(() => {
    return TERMS_SECTIONS.filter((s) => {
      const title = isRtl ? s.ar.title : s.en.title;
      const summary = isRtl ? s.ar.summary : s.en.summary;
      return (
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery, isRtl]);

  const activeSection = useMemo(() => {
    return TERMS_SECTIONS.find((s) => s.id === activeSectionId) || TERMS_SECTIONS[0];
  }, [activeSectionId]);

  return (
    <div className="space-y-10 animate-fadeIn max-w-6xl mx-auto font-sans pb-16 text-foreground leading-normal" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* Premium Glassmorphic Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-linear-to-r from-zinc-950 via-zinc-900 to-indigo-950/20 p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-left rtl:text-right">
            <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] font-bold tracking-widest px-3 py-1 rounded-full mb-1">
              {isRtl ? 'وثيقة الأحكام القانونية' : 'Legal Terms Agreement'}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {isRtl ? 'شروط وأحكام الخدمة' : 'Terms of Service'}
            </h1>
            <p className="text-sm font-light text-zinc-400">
              {isRtl 
                ? 'يرجى مراجعة القواعد والسياسات التي تحكم استخدامك للمنصة، وتأمين مساحات العمل، وتفعيل أتمتة مسارات العمل.' 
                : 'Please review the regulations and operational policies governing your visual canvas workspace creation and automated orchestrations.'}
            </p>
          </div>
          
          <Link href={`/${locale}`} passHref>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-2xl cursor-pointer text-xs font-bold shrink-0 self-start md:self-auto gap-2 py-5 px-5 shadow-sm">
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {isRtl ? 'العودة للرئيسية' : 'Return to Home'}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left index & search column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative w-full">
            <Search className="absolute inset-s-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'ابحث في الشروط والأحكام...' : 'Search terms documents...'}
              className="ps-10 rounded-2xl border-border/80 bg-zinc-900/30 py-5 focus:ring-primary shadow-xs font-sans text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="px-1 text-left rtl:text-right">
              <h3 className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground/80">
                {isRtl ? 'أقسام وثيقة الشروط' : 'Terms Agreement Sections'}
              </h3>
            </div>
            
            {filteredSections.map((section) => {
              const isActive = section.id === activeSectionId;
              const title = isRtl ? section.ar.title : section.en.title;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`w-full text-left rtl:text-right p-4.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-4 hover:shadow-xs select-none ${
                    isActive 
                      ? 'bg-linear-to-r from-zinc-900 to-zinc-900/40 border-primary/50 ring-2 ring-primary/10 shadow-sm' 
                      : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-primary/20 text-primary' : 'bg-zinc-950 text-zinc-500 border border-zinc-800'}`}>
                    {section.iconName === 'Key' && <Key className="w-4 h-4" />}
                    {section.iconName === 'Activity' && <Activity className="w-4 h-4" />}
                    {section.iconName === 'CreditCard' && <CreditCard className="w-4 h-4" />}
                    {section.iconName === 'BookOpen' && <BookOpen className="w-4 h-4" />}
                    {section.iconName === 'Scale' && <Scale className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-foreground truncate">{title}</h4>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right detailed policy presentation card */}
        <Card className="lg:col-span-2 bg-zinc-900/35 border-border/80 rounded-3xl backdrop-blur-xs p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full filter blur-2xl pointer-events-none" />
          <div className="space-y-6">
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-foreground">
                {isRtl ? activeSection.ar.title : activeSection.en.title}
              </h2>
            </div>
            
            <p className="text-xs font-light text-muted-foreground border-b border-border/60 pb-4">
              {isRtl ? activeSection.ar.summary : activeSection.en.summary}
            </p>

            <div className="space-y-4">
              <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground/80">
                {isRtl ? 'البنود والأحكام التفصيلية' : 'Detailed Policy Agreements'}
              </h4>
              <div className="space-y-4">
                {(isRtl ? activeSection.ar.details : activeSection.en.details).map((detail, idx) => (
                  <div key={idx} className="flex gap-3.5 items-start text-xs leading-relaxed">
                    <span className="w-5.5 h-5.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[9px] font-bold text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {idx + 1}
                    </span>
                    <p className="text-zinc-300 font-light pt-0.5">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </Card>
      </div>

      {/* Accessible Consent Notice */}
      <div className="border-t border-border/60 pt-10 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-zinc-400">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-light">
            {isRtl 
              ? 'باستخدامك لمنصتنا، فإنك تقر وتوافق صراحة على شروط وأحكام الخدمة الواردة أعلاه.' 
              : 'By creating custom workspaces or executing workflow diagrams, you expressly accept these Terms of Service.'}
          </span>
        </div>
      </div>

    </div>
  );
}
