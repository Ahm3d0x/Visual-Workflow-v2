'use client';

import { useState, useMemo, use } from 'react';
import { 
  ArrowLeft, ArrowRight, Globe, Lock, Key, 
  Eye, Search, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface PrivacySection {
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

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'collection',
    iconName: 'Eye',
    en: {
      title: 'Information We Collect & Store',
      summary: 'Details regarding what customer metrics we collect, database configurations, and profile data.',
      details: [
        'User Profile Data: We record your full name, authenticated email, and custom avatar metadata to manage system access privileges.',
        'Workflow Layout Schemas: We save canvas node coordinate parameters, connected edge configurations, and visual styling properties securely.',
        'Transactional Details: Customer checkout IDs and active plans metrics are collected during your Stripe subscription activations.',
        'Session Analytics: We temporarily log execution timestamps, error rates, and API diagnostics logs to monitor platform performance.'
      ]
    },
    ar: {
      title: 'البيانات التي نجمعها ونحفظها',
      summary: 'تفاصيل بشأن مؤشرات العملاء التي نجمعها، وتهيئة قاعدة البيانات، وبيانات الملفات الشخصية.',
      details: [
        'بيانات الملف الشخصي: نقوم بتسجيل الاسم الكامل، البريد الإلكتروني المؤكد، ومعلومات الصورة الرمزية لإدارة صلاحيات الوصول.',
        'مخططات سير العمل: نحفظ معلمات إحداثيات عقد لوحة العمل، وتوصيلات الأسلاك، والخصائص المرئية للمخطط بشكل آمن.',
        'المعلومات المالية والفوترة: يتم جمع معرفات دفع العملاء وبيانات الباقات المشترك بها أثناء تفعيل اشتراك Stripe الخاص بك.',
        'تحليلات الجلسات: نسجل مؤقتاً الطوابع الزمنية للتنفيذ، ومعدلات الأخطاء، وسجلات فحص البرمجيات لمراقبة الأداء واستقرار المنصة.'
      ]
    }
  },
  {
    id: 'security',
    iconName: 'Lock',
    en: {
      title: 'Data Protection & Row-Level Security (RLS)',
      summary: 'Comprehensive security measures including Supabase RLS protocols, SSL data encryption, and access keys protection.',
      details: [
        'Postgres Row-Level Security: We enforce strict Supabase RLS policies. No member can query, read, or write to database tables belonging to other workspaces.',
        'Encryption in Transit & Rest: All dynamic workflow transactions are encrypted using TLS 1.3 in transit and AES-256 at rest.',
        'Secure Key Vaults: External API credentials and Stripe keys are stored in encrypted environments, isolated from direct client-side reads.',
        'Collaborator Tokens Isolation: Sharing links use advanced, unique UUID security hashes to prevent brute-force route guessing.'
      ]
    },
    ar: {
      title: 'حماية البيانات وأمان مستوى الصف (RLS)',
      summary: 'إجراءات الأمان الشاملة بما في ذلك بروتوكولات Supabase RLS، وتشفير البيانات عبر SSL، وحماية مفاتيح الوصول.',
      details: [
        'أمان مستوى الصف Postgres RLS: نطبق سياسات أمان RLS صارمة. لا يمكن لأي عضو الاستعلام أو تعديل الجداول التابعة لمساحات عمل أخرى.',
        'التشفير الآمن: يتم تشفير جميع حركات سير العمل التفاعلية باستخدام بروتوكول TLS 1.3 أثناء النقل و AES-256 أثناء السكون والخمول.',
        'خزائن المفاتيح الآمنة: يتم حفظ مفاتيح واجهات البرمجة الخارجية (APIs) ومفاتيح Stripe في بيئات مشفرة ومعزولة عن واجهة العميل.',
        'عزل روابط المشاركة: تستخدم روابط دعوات الانضمام معرفات UUID فريدة لمنع التخمين العشوائي للروابط وحماية مساحتك.'
      ]
    }
  },
  {
    id: 'third_party',
    iconName: 'Globe',
    en: {
      title: 'Usage of Third-Party Integrations',
      summary: 'Details regarding Stripe payment integrations and Gemini/OpenAI generative AI processing policies.',
      details: [
        'Stripe Payments: We do not save your credit card credentials directly. Stripe processes and governs all transactions under strict PCI-DSS guidelines.',
        'Generative AI Engines: When you execute AI Nodes (e.g. AI Summarize/Generate), text contexts are sent securely to Gemini or OpenAI APIs.',
        'Data Privacy Assurances: Third-party AI partners do not use your proprietary prompt structures or dataset variables to train external models.',
        'External REST APIs: Outbound REST API Request nodes communicate directly with your specified endpoints, inheriting your target auth headers.'
      ]
    },
    ar: {
      title: 'استخدام وتكامل الخدمات الخارجية والشركاء',
      summary: 'تفاصيل بشأن معالجة مدفوعات Stripe وسياسات المعالجة بالذكاء الاصطناعي التوليدي عبر Gemini و OpenAI.',
      details: [
        'مدفوعات Stripe: نحن لا نحفظ بيانات بطاقتك الائتمانية مطلقاً. تدير منصة Stripe المعاملات بالكامل تحت إرشادات PCI-DSS الصارمة.',
        'محركات الذكاء الاصطناعي: عند تشغيل عقد الذكاء الاصطناعي (مثل التلخيص/التوليد)، يتم إرسال النصوص بأمان لواجهات Gemini أو OpenAI.',
        'خصوصية التدريب: لا يستخدم شركاء الذكاء الاصطناعي بياناتك أو المتغيرات الخاصة بمسارات عملك لتدريب نماذجهم الخارجية.',
        'طلبات REST APIs الخارجية: تتصل عقد طلبات APIs الخارجية بنقاط النهاية التي تحددها أنت وتورث ترويسات الأمان الخاصة بك.'
      ]
    }
  },
  {
    id: 'control',
    iconName: 'Key',
    en: {
      title: 'Your Rights, GDPR & CCPA Compliance',
      summary: 'Your rights regarding updating or deleting profiles, downloading workspace metrics, and opting out of trackers.',
      details: [
        'Right to Erasure (Forget Me): Workspace Owners can permanently delete their profiles and associated workspaces directly from settings.',
        'Data Portability: You hold the right to export visual structures to JSON, print boards drawings to PNG, and download metrics checklists.',
        'Opt-Out Controls: Users can manage cookie trackers, configure locale language preferences, and toggle dark/light theme choices.',
        'Regulatory Compliance: We strictly adhere to GDPR, CCPA, and global privacy rules, guaranteeing safe data governance workflows.'
      ]
    },
    ar: {
      title: 'حقوقك والامتثال للـ GDPR والـ CCPA',
      summary: 'حقوقك المتعلقة بتحديث أو حذف الحسابات، وتحميل بيانات مساحتك، وإلغاء تتبع ملفات الارتباط.',
      details: [
        'حق المحو والحذف الكامل: يمكن لمالكي مساحة العمل حذف ملفاتهم الشخصية ومساحاتهم بشكل دائم ومباشر من لوحة الإعدادات.',
        'قابلية نقل البيانات: يحق لك تصدير الهياكل المرئية بصيغة JSON، وطباعة لوحة الرسم بصيغة PNG، وتحميل قوائم التحقق.',
        'عناصر التحكم والرفض: يمكن للمستخدمين التحكم بملفات تتبع الارتباط، وتهيئة لغة العرض، وتبديل سمات المظهر.',
        'الامتثال القانوني: نلتزم تماماً باللائحة العامة لحماية البيانات (GDPR) وقانون خصوصية المستهلك (CCPA) لحفظ حقوقك.'
      ]
    }
  }
];

export default function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isRtl = locale === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('collection');

  const filteredSections = useMemo(() => {
    return PRIVACY_SECTIONS.filter((s) => {
      const title = isRtl ? s.ar.title : s.en.title;
      const summary = isRtl ? s.ar.summary : s.en.summary;
      return (
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery, isRtl]);

  const activeSection = useMemo(() => {
    return PRIVACY_SECTIONS.find((s) => s.id === activeSectionId) || PRIVACY_SECTIONS[0];
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
              {isRtl ? 'وثيقة الخصوصية والأمان' : 'Privacy & Security Document'}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {isRtl ? 'سياسة خصوصية البيانات' : 'Privacy Policy'}
            </h1>
            <p className="text-sm font-light text-zinc-400">
              {isRtl 
                ? 'تعرف على كيفية تأمين وحماية بياناتك التشغيلية، ومزامنة لوحتك بمستوى حماية RLS الفائق من Supabase.' 
                : 'Learn how we secure your operational workflows, maintain Postgres RLS isolation, and respect user privacy rights.'}
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
              placeholder={isRtl ? 'ابحث في سياسة الخصوصية...' : 'Search privacy document...'}
              className="ps-10 rounded-2xl border-border bg-card py-5 focus:ring-primary shadow-xs font-sans text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="px-1 text-left rtl:text-right">
              <h3 className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground/80">
                {isRtl ? 'أقسام سياسة الخصوصية' : 'Privacy Policy Sections'}
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
                      ? 'bg-accent/15 border-primary/50 ring-2 ring-primary/10 shadow-sm' 
                      : 'bg-card/50 border-border hover:border-accent hover:bg-card/85'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground border border-border'}`}>
                    {section.iconName === 'Eye' && <Eye className="w-4 h-4" />}
                    {section.iconName === 'Lock' && <Lock className="w-4 h-4" />}
                    {section.iconName === 'Globe' && <Globe className="w-4 h-4" />}
                    {section.iconName === 'Key' && <Key className="w-4 h-4" />}
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
        <Card className="lg:col-span-2 bg-card border border-border rounded-3xl backdrop-blur-xs p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full filter blur-2xl pointer-events-none" />
          <div className="space-y-6">
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <Lock className="w-4 h-4" />
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
                {isRtl ? 'التفاصيل والضمانات الأمنية' : 'Security Assurances & Details'}
              </h4>
              <div className="space-y-4">
                {(isRtl ? activeSection.ar.details : activeSection.en.details).map((detail, idx) => (
                  <div key={idx} className="flex gap-3.5 items-start text-xs leading-relaxed">
                    <span className="w-5.5 h-5.5 rounded-lg bg-muted border border-border text-[9px] font-bold text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {idx + 1}
                    </span>
                    <p className="text-foreground/90 font-light pt-0.5">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </Card>
      </div>

      {/* Accessible Safety Notice */}
      <div className="border-t border-border/60 pt-10 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-zinc-400">
          <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="text-xs font-light">
            {isRtl 
              ? 'أمان بياناتك وخصوصيتها هي أولويتنا القصوى دوماً.' 
              : 'Your data privacy and Postgres RLS security are our absolute priority.'}
          </span>
        </div>
      </div>

    </div>
  );
}
