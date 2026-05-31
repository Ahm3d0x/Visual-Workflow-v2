'use client';

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { nodeCatalog } from '../nodes/nodeTypes';
import { 
  Search, Sliders, Play, GitFork, ArrowRightLeft, 
  Send, BrainCircuit, X, ChevronLeft, ChevronRight,
  Star, Sparkles, AlertTriangle, StopCircle, Database, 
  CheckSquare, Clock, RefreshCw, Store, ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { CustomElementDesigner } from './CustomElementDesigner';
import { PLAN_LIMITS } from '@/lib/planLimits';
import { useDialogStore } from '@/stores/dialogStore';

interface LibrarySidebarProps {
  locale: string;
  onAddNode: (type: string, templateData?: unknown) => void;
  userRole: string;
  workspaceId: string;
}

interface CustomTemplate {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description: string | null;
  base_type: string;
  icon: string | null;
  color: string | null;
  default_data: {
    label: string;
    description?: string;
    customNode?: boolean;
    [key: string]: unknown;
  };
  default_style: {
    colorClass?: string;
    accentBar?: string;
    badgeColor?: string;
    iconName?: string;
  };
  handles: {
    inputsCount?: number;
    outputsCount?: number;
  };
  validation_schema: Record<string, unknown>;
  tags: string[];
  visibility: string;
  created_at: string;
}

const LOCALIZED_CATALOG: Record<string, { label: string; description: string }> = {
  board: { label: 'لوحة بيضاء', description: 'لوحة رسم تعاونية كاملة الميزات مع الأشكال والنصوص والرسم الحر والمزامنة الفورية.' },
  start: { label: 'مُشغّل البداية', description: 'مُشغّل نقطة البداية للمخطط البصري.' },
  process: { label: 'خطوة معالجة', description: 'تطبيق عملية حوسبة عامة أو منطقية.' },
  decision: { label: 'عقدة القرار', description: 'تقسيم التدفق بناءً على خيارات صحيحة/خاطئة.' },
  delay: { label: 'مؤقت التأخير', description: 'إيقاف المعالجة مؤقتاً لوقت محدد مجدول.' },
  note: { label: 'ملاحظة اللوحة', description: 'إضافة بطاقات نصوص/تنسيقات عائمة إلى اللوحة.' },
  end: { label: 'خطوة النهاية', description: 'إنهاء تدفق التنفيذ النشط بشكل آمن.' },
  if_else: { label: 'إذا / وإلا', description: 'توجيه المسارات بناءً على تقييم الشروط المخصصة.' },
  switch: { label: 'حالة التبديل (Switch)', description: 'توجيه المدخلات إلى قنوات متعددة تطابق حالات معينة.' },
  loop: { label: 'حلقة تكرار (Loop)', description: 'تكرار خطوات مصفوفة من البيانات بشكل متتابع.' },
  parallel: { label: 'تقسيم متوازي', description: 'تشغيل عدة خطوات بشكل متزامن ومتوازٍ.' },
  merge: { label: 'دمج المسارات', description: 'دمج قنوات متعددة وإعادتها إلى مسار واحد.' },
  retry: { label: 'إعادة المحاولة', description: 'إعادة محاولة العمليات تلقائياً عند حدوث فشل.' },
  input: { label: 'مدخلات JSON', description: 'تعريف خصائص البيانات الواردة في الطلب.' },
  output: { label: 'مخرجات JSON', description: 'هيكلة وتنسيق خصائص البيانات الصادرة.' },
  variable: { label: 'تعيين متغير', description: 'تخزين وتعيين متغيرات في ذاكرة الجلسة.' },
  transform: { label: 'تنسيق البيانات', description: 'إعادة صياغة الكائنات عبر صيغ تعيين بسيطة.' },
  filter: { label: 'تصفية القائمة', description: 'إزالة العناصر التي لا تطابق الشروط المحددة من القوائم.' },
  api_request: { label: 'REST API', description: 'تنفيذ استدعاءات بروتوكول HTTP الخارجية (GET/POST).' },
  webhook: { label: 'مُشغّل الويب هوك', description: 'انتظار استقبال تنبيهات ويب هوك ديناميكية بصيغة JSON.' },
  email: { label: 'إرسال بريد إلكتروني', description: 'إرسال إشعارات وتحديثات بريدية للمتعاونين.' },
  sms: { label: 'إرسال رسالة SMS', description: 'إرسال تنبيهات نصية قصيرة للهواتف الجوالة للجهات الإدارية.' },
  database: { label: 'استعلام قاعدة البيانات', description: 'تنفيذ استعلامات SQL وتحديثات مباشرة في الجداول.' },
  google_sheets: { label: 'جداول بيانات Google', description: 'إضافة صفوف أو جلب جداول كاملة من جداول بيانات Google.' },
  form_step: { label: 'انتظار النموذج', description: 'جمع مدخلات مخصصة من المستخدم عبر نماذج تفاعلية.' },
  approval: { label: 'انتظار الموافقة', description: 'حظر الخطوات مؤقتاً حتى يقوم المدير بالنقر على موافقة.' },
  checklist: { label: 'قائمة المهام', description: 'التحقق من قائمة المهام التشغيلية المطلوبة.' },
  signature: { label: 'توقيع المستند', description: 'فرض الموافقات الرقمية على المستندات والملفات.' },
  ai_generate: { label: 'توليد الذكاء الاصطناعي', description: 'توليد إجابات ونصوص ذكية فائقة الدقة باستخدام GPT.' },
  ai_classify: { label: 'تصنيف بالذكاء الاصطناعي', description: 'تصنيف المحتوى تلقائياً إلى فئات معرفة مسبقاً.' },
  ai_extract: { label: 'استخراج بالذكاء الاصطناعي', description: 'استخراج الكيانات والبيانات المهيكلة من النصوص غير المنظمة.' },
  ai_summarize: { label: 'تلخيص بالذكاء الاصطناعي', description: 'تلخيص وتكثيف الفقرات الطويلة إلى ملخصات موجزة.' },
  ai_route: { label: 'توجيه بالذكاء الاصطناعي', description: 'توجيه مسارات العمل بذكاء بناءً على شروط موجهة بالذكاء الاصطناعي.' }
};

export function LibrarySidebar({ locale, onAddNode, userRole, workspaceId }: LibrarySidebarProps) {
  const isRtl = locale === 'ar';
  const { panels, togglePanel } = useEditorStore();
  const isOpen = panels.library;

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'custom' | 'board' | 'basic' | 'human' | 'marketplace'>('all');

  // Supabase states
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<'free' | 'warrior' | 'elite' | 'champion' | 'legend'>('free');
  const [favorites, setFavorites] = useState<{ id: string; node_type: string | null; custom_node_template_id: string | null }[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [marketplaceInstalled, setMarketplaceInstalled] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [triggerFetchCount, setTriggerFetchCount] = useState(0);

  const canEdit = ['owner', 'admin', 'editor'].includes(userRole);

  // Group mappings
  const categories = [
    { id: 'all', label: isRtl ? 'الكل' : 'All', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'favorites', label: isRtl ? 'المفضلة' : 'Favorites', icon: <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> },
    { id: 'custom', label: isRtl ? 'مخصصة' : 'Custom', icon: <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" /> },
    { id: 'board', label: isRtl ? 'لوحات' : 'Boards', icon: <span className="text-[10px]">🎨</span> },
    { id: 'basic', label: isRtl ? 'أساسي' : 'Basic', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'human', label: isRtl ? 'بشري' : 'Human', icon: <CheckSquare className="w-3.5 h-3.5 text-teal-500" /> },
    { id: 'marketplace', label: isRtl ? 'المتجر' : 'Store', icon: <Store className="w-3.5 h-3.5 text-violet-500" /> },
  ] as const;

  // 1. Fetch Sidebar Data (Favorites, Subscriptions, Templates) asynchronously in useEffect
  useEffect(() => {
    let active = true;
    
    async function loadSidebarResources() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user || !active) return;
        setUserId(userData.user.id);

        // Fetch subscription tier details
        const { data: subData } = await (supabase
          .from('subscriptions')
          .select('plan')
          .eq('workspace_id', workspaceId)
          .maybeSingle() as unknown as Promise<{ data: { plan: string } | null }>);
        
        if (subData?.plan && active) {
          setActivePlan(subData.plan as 'free' | 'warrior' | 'elite' | 'champion' | 'legend');
        }

        // Fetch user's starred elements
        const { data: favs } = await (supabase
          .from('user_favorite_nodes')
          .select('id, node_type, custom_node_template_id')
          .eq('user_id', userData.user.id) as unknown as Promise<{
            data: { id: string; node_type: string | null; custom_node_template_id: string | null }[] | null;
          }>);
        
        if (favs && active) {
          setFavorites(favs);
        }

        // Fetch dynamic custom element templates
        const { data: templates } = await (supabase
          .from('custom_node_templates')
          .select('*')
          .eq('workspace_id', workspaceId) as unknown as Promise<{ data: CustomTemplate[] | null }>);
        
        if (templates && active) {
          setCustomTemplates(templates);
        }

        // Fetch installed marketplace nodes for this workspace
        const { data: installs } = await (supabase
          .from('marketplace_installs')
          .select('marketplace_node_id, marketplace_nodes(*)')
          .eq('workspace_id', workspaceId) as unknown as Promise<{ data: { marketplace_node_id: string; marketplace_nodes: Record<string, unknown> }[] | null }>);

        if (installs && active) {
          const installed = installs
            .filter(i => i.marketplace_nodes)
            .map(i => {
              const n = i.marketplace_nodes as Record<string, unknown>;
              return {
                id: n.id as string,
                workspace_id: workspaceId,
                created_by: n.author_id as string,
                name: n.name as string,
                description: n.description as string | null,
                base_type: n.base_type as string,
                icon: n.icon as string | null,
                color: n.color as string | null,
                default_data: {
                  label: n.name as string,
                  description: n.description as string,
                  customNode: true,
                },
                default_style: (n.default_style as CustomTemplate['default_style']) || {},
                handles: (n.handles as CustomTemplate['handles']) || {},
                validation_schema: {},
                tags: (n.tags as string[]) || [],
                visibility: n.visibility as string,
                created_at: n.created_at as string,
              } as CustomTemplate;
            });
          setMarketplaceInstalled(installed);
        }
      } catch (err) {
        console.error('Error loading library sidebar resources:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSidebarResources();

    return () => {
      active = false;
    };
  }, [workspaceId, supabase, triggerFetchCount]);

  // Handler to manually refresh resource lists
  const handleReloadResources = () => {
    setTriggerFetchCount(prev => prev + 1);
  };

  // 2. Favorite Toggle Action with plan limits validation
  const handleToggleFavorite = async (nodeType: string | null, customTemplateId: string | null) => {
    if (!userId) return;

    const isFav = favorites.find(
      f => (nodeType && f.node_type === nodeType) || (customTemplateId && f.custom_node_template_id === customTemplateId)
    );

    if (isFav) {
      // Delete favorite
      const { error } = await supabase
        .from('user_favorite_nodes')
        .delete()
        .eq('id', isFav.id);
      
      if (error) {
        console.error('Error deleting favorite node:', error.message);
      } else {
        setFavorites(prev => prev.filter(f => f.id !== isFav.id));
      }
    } else {
      // Validate plan limits
      const limit = PLAN_LIMITS[activePlan]?.max_favorites ?? 5;
      if (favorites.length >= limit) {
        setShowUpgradeBanner(true);
        const title = isRtl ? 'حماية باقة الاشتراك' : 'Subscription Guard';
        const msg = isRtl
          ? `تم الوصول للحد الأقصى: يمكنك الحصول على ما يصل إلى ${limit} من العناصر المفضلة في باقتك الحالية (${activePlan}). يرجى ترقية باقتك في قسم الفواتير لفتح المزيد.`
          : `Limit Reached: You can only have up to ${limit} favorites on your current ${activePlan} plan. Please upgrade your plan in the Billing section to unlock more favorites.`;
        useDialogStore.getState().showAlert(title, msg);
        return;
      }

      // Insert favorite in Supabase using type safe query cast
      const { data, error } = await (supabase.from('user_favorite_nodes') as unknown as {
        insert: (arg: Record<string, unknown>) => {
          select: (fields: string) => {
            single: () => Promise<{
              data: { id: string; node_type: string | null; custom_node_template_id: string | null } | null;
              error: { message: string } | null;
            }>;
          };
        };
      }).insert({
        user_id: userId,
        node_type: nodeType || null,
        custom_node_template_id: customTemplateId || null,
      }).select('id, node_type, custom_node_template_id').single();

      if (error) {
        console.error('Error adding favorite node:', error.message);
      } else if (data) {
        setFavorites(prev => [...prev, data]);
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: React.DragEvent, nodeType: string, templateData?: unknown) => {
    if (!canEdit) return;
    event.dataTransfer.setData('application/reactflow', nodeType);
    if (templateData) {
      event.dataTransfer.setData('application/custom-template-data', JSON.stringify(templateData));
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  // Helper to map dynamic icon names to Lucide icons
  const getCustomIconForSidebar = (iconName: string) => {
    if (iconName.startsWith('http://') || iconName.startsWith('https://') || iconName.startsWith('/')) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconName}
          alt="icon"
          className="w-3.5 h-3.5 object-contain"
        />
      );
    }
    
    switch (iconName) {
      case 'settings': return <Sliders className="w-3.5 h-3.5 text-zinc-500" />;
      case 'play': return <Play className="w-3.5 h-3.5 text-emerald-500" />;
      case 'stop': return <StopCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'branch': return <GitFork className="w-3.5 h-3.5 text-amber-500" />;
      case 'data': return <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500" />;
      case 'send': return <Send className="w-3.5 h-3.5 text-violet-500" />;
      case 'database': return <Database className="w-3.5 h-3.5 text-violet-500" />;
      case 'check': return <CheckSquare className="w-3.5 h-3.5 text-teal-500" />;
      case 'ai': return <BrainCircuit className="w-3.5 h-3.5 text-rose-500" />;
      case 'timer': return <Clock className="w-3.5 h-3.5 text-zinc-500" />;
      case 'loop': return <RefreshCw className="w-3.5 h-3.5 text-violet-500" />;
      default: return <span className="text-xs font-normal leading-none">{iconName}</span>;
    }
  };

  // Get color indicators by category
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'board': return 'bg-fuchsia-500';
      case 'basic': return 'bg-primary';
      case 'logic': return 'bg-amber-500';
      case 'data': return 'bg-sky-500';
      case 'integration': return 'bg-violet-500';
      case 'human': return 'bg-teal-500';
      case 'ai': return 'bg-rose-500';
      default: return 'bg-zinc-500';
    }
  };

  // Helper to render golden toggle star buttons
  const renderStarButton = (nodeType: string | null, customTemplateId: string | null) => {
    const isFav = favorites.some(
      f => (nodeType && f.node_type === nodeType) || (customTemplateId && f.custom_node_template_id === customTemplateId)
    );

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleToggleFavorite(nodeType, customTemplateId);
        }}
        className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-muted hover:scale-105 shrink-0 z-10 ${
          isFav 
            ? 'text-amber-500 scale-100 opacity-100' 
            : 'text-muted-foreground/45 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-amber-500'
        }`}
        title={isFav ? (isRtl ? 'إزالة من المفضلة' : 'Remove from Favorites') : (isRtl ? 'إضافة إلى المفضلة' : 'Add to Favorites')}
      >
        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
      </button>
    );
  };

  // Filter Catalog / Favorites
  const filteredCatalog = (activeTab === 'custom' || activeTab === 'marketplace')
    ? []
    : activeTab === 'favorites' 
      ? nodeCatalog.filter(item => 
          favorites.some(f => f.node_type === item.type) &&
          (item.label.toLowerCase().includes(search.toLowerCase()) || 
           item.description.toLowerCase().includes(search.toLowerCase()))
        )
      : nodeCatalog.filter((item) => {
          const matchesSearch = item.label.toLowerCase().includes(search.toLowerCase()) || 
                                item.description.toLowerCase().includes(search.toLowerCase()) ||
                                item.type.toLowerCase().includes(search.toLowerCase());
          const matchesTab = activeTab === 'all' || item.category === activeTab;
          return matchesSearch && matchesTab;
        });
 
  const filteredCustomTemplates = activeTab === 'custom'
    ? customTemplates.filter(tpl =>
        tpl.name.toLowerCase().includes(search.toLowerCase()) || 
        (tpl.description && tpl.description.toLowerCase().includes(search.toLowerCase()))
      )
    : activeTab === 'favorites'
      ? customTemplates.filter(tpl => 
          favorites.some(f => f.custom_node_template_id === tpl.id) &&
          (tpl.name.toLowerCase().includes(search.toLowerCase()) || 
           (tpl.description && tpl.description.toLowerCase().includes(search.toLowerCase())))
        )
      : []; // Custom templates are isolated completely and do not render in standard basic/logic categories!

  // Filter marketplace installed nodes
  const filteredMarketplace = (activeTab === 'marketplace' || activeTab === 'all')
    ? marketplaceInstalled.filter(tpl =>
        tpl.name.toLowerCase().includes(search.toLowerCase()) ||
        (tpl.description && tpl.description.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  if (!isOpen) {
    return (
      <button
        onClick={() => togglePanel('library')}
        className={`absolute top-20 ${
          isRtl ? 'right-4 animate-slideInRight' : 'left-4 animate-slideInLeft'
        } z-10 w-9 h-9 bg-background/95 border border-border shadow-md rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.03] focus:outline-hidden`}
        title={isRtl ? 'افتح المكتبة' : 'Open Library'}
      >
        {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <aside className={`w-72 border-y-0 border-border bg-background/95 backdrop-blur-md flex flex-col h-full z-30 shrink-0 shadow-xl transition-all duration-300 md:shadow-none absolute md:relative top-0 bottom-0 ${
      isRtl ? 'right-0 border-l' : 'left-0 border-r'
    }`}>
      {/* 1. Header with Title and Toggle */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <h2 className="font-bold text-sm font-sans tracking-tight">{isRtl ? 'مكتبة العقد' : 'Nodes Library'}</h2>
        </div>
        <button
          onClick={() => togglePanel('library')}
          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Upgrade Banner for Subscription Guard */}
      {showUpgradeBanner && (
        <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2 animate-fadeIn relative font-sans">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              {isRtl ? 'حماية باقة الاشتراك' : 'Subscription Guard'}
            </h4>
            <p className="text-[10px] text-muted-foreground font-light leading-snug">
              {isRtl 
                ? <>لقد وصلت إلى الحد الأقصى في باقتك الحالية <strong>{activePlan}</strong>. قم بالترقية لفتح مفضلات وعناصر مخصصة بلا حدود!</>
                : <>You&apos;ve hit the limits on your <strong>{activePlan}</strong> plan. Upgrade to unlock unlimited custom nodes & favorites!</>}
            </p>
          </div>
          <button 
            onClick={() => setShowUpgradeBanner(false)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Search Field */}
      <div className="p-3 border-b border-border bg-background/25">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRtl ? 'البحث عن عقد...' : 'Search nodes...'}
            className="h-9 pl-9 pr-3 rounded-xl border-border focus:ring-accent text-xs font-light"
          />
        </div>
      </div>

      {/* 3. Category Grid Tabs — 2 rows, no overflow */}
      <div className="border-b border-border bg-background/10 py-2 px-2">
        <div className="grid grid-cols-5 gap-1">
          {categories.map((cat) => {
            const isCustomTab = cat.id === 'custom';
            const isBoardTab = cat.id === 'board';
            const isActive = activeTab === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl text-[9px] font-semibold transition-all duration-150 cursor-pointer leading-none ${
                  isActive
                    ? isCustomTab
                      ? 'bg-purple-600 text-white shadow-md'
                      : isBoardTab
                        ? 'bg-fuchsia-500 text-white shadow-md'
                        : 'bg-accent text-accent-foreground shadow-sm'
                    : isCustomTab
                      ? 'border border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-950/30'
                      : isBoardTab
                        ? 'text-fuchsia-400/70 hover:bg-fuchsia-500/10 hover:text-fuchsia-400'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="flex items-center justify-center w-4 h-4">{cat.icon}</span>
                <span className="truncate w-full text-center">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. List of Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground font-light mt-2">{isRtl ? 'جاري تحميل عناصر المكتبة...' : 'Loading library elements...'}</p>
          </div>
        ) : (
          <>
            {/* Standard elements section */}
            <div className="space-y-3 font-sans">
              {filteredCatalog.length === 0 && filteredCustomTemplates.length === 0 ? (
                <div className="text-center py-12 space-y-1">
                  <Sliders className="w-8 h-8 mx-auto text-muted-foreground/35" />
                  <p className="text-xs text-muted-foreground font-light">{isRtl ? 'لم يتم العثور على عقد' : 'No node types found'}</p>
                </div>
              ) : (
                filteredCatalog.map((item) => (
                  <div
                    key={item.type}
                    draggable={canEdit}
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onClick={() => canEdit && onAddNode(item.type)}
                    className={`p-3 border border-border bg-background/60 hover:bg-muted/50 rounded-xl cursor-grab transition-all shadow-xs flex flex-col gap-1 relative overflow-hidden active:cursor-grabbing group ${
                      !canEdit ? 'opacity-65 cursor-not-allowed' : ''
                    }`}
                  >
                    {/* Category indicator line */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1 ${getCategoryColor(item.category)}`} />

                    <div className="flex items-center justify-between pl-1">
                      <span className="font-bold text-xs text-foreground group-hover:text-accent transition-colors pr-6">
                        {isRtl && LOCALIZED_CATALOG[item.type] ? LOCALIZED_CATALOG[item.type].label : item.label}
                      </span>
                      
                      {/* Star Favorite Action */}
                      <div className="absolute right-2 top-2">
                        {renderStarButton(item.type, null)}
                      </div>
                    </div>
                    <p className="text-[10px] font-light text-muted-foreground leading-tight pl-1 pr-6">
                      {isRtl && LOCALIZED_CATALOG[item.type] ? LOCALIZED_CATALOG[item.type].description : item.description}
                    </p>

                    <div className="mt-1 flex items-center justify-between pl-1">
                      <span className="text-[8px] font-mono text-muted-foreground bg-border/40 px-1.5 py-0.5 rounded-md capitalize">
                        {isRtl ? (categories.find(c => c.id === item.category)?.label || item.category) : item.category}
                      </span>
                      {canEdit && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-semibold text-accent uppercase tracking-wider">
                          {isRtl ? 'سحب / نقر +' : 'Drag / Click +'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Custom reusable nodes section */}
            {(activeTab === 'custom' || activeTab === 'all') && (
              <div className="pt-4 border-t border-border/60 space-y-3 font-sans">
                <div className="flex items-center justify-between pl-1">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>{isRtl ? 'عناصر مخصصة' : 'Custom Elements'}</span>
                  </h3>
                  <span className="text-[9px] font-mono text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-md">
                    {customTemplates.length} {isRtl ? 'قوالب' : 'templates'}
                  </span>
                </div>

                {/* Designer Trigger Modal */}
                {canEdit && (
                  <CustomElementDesigner 
                    workspaceId={workspaceId} 
                    onSaved={handleReloadResources} 
                    activePlan={activePlan}
                    customTemplatesCount={customTemplates.length}
                  />
                )}

                {filteredCustomTemplates.length === 0 ? (
                  <div className="text-center py-4 bg-muted/10 border border-dashed border-border/40 rounded-xl p-3">
                    <Sparkles className="w-5 h-5 mx-auto text-muted-foreground/25 mb-1" />
                    <p className="text-[10px] text-muted-foreground font-light leading-snug">
                      {isRtl 
                        ? 'لم يتم العثور على قوالب مخصصة. استخدم مصمم العناصر لإنشاء عقد مخصصة.'
                        : 'No custom templates found. Use the designer modal to construct customized nodes.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCustomTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, 'custom_template', tpl)}
                        onClick={() => canEdit && onAddNode('custom_template', tpl)}
                        className={`p-3 border border-border bg-background/60 hover:bg-muted/50 rounded-xl cursor-grab transition-all shadow-xs flex flex-col gap-1 relative overflow-hidden active:cursor-grabbing group ${
                          !canEdit ? 'opacity-65 cursor-not-allowed' : ''
                        }`}
                      >
                        {/* Custom dynamic accent color bar */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1 ${tpl.default_style?.accentBar || 'bg-accent'}`} />

                        <div className="flex items-center justify-between pl-1">
                          <div className="flex items-center gap-1.5 min-w-0 pr-6">
                            {/* Small preset icon */}
                            <div className="w-4.5 h-4.5 rounded-md bg-muted flex items-center justify-center border border-border/40 shrink-0 text-foreground">
                              {getCustomIconForSidebar(tpl.default_style?.iconName || 'settings')}
                            </div>
                            <span className="font-bold text-xs text-foreground group-hover:text-accent transition-colors truncate">
                              {tpl.name}
                            </span>
                          </div>
                          
                          {/* Star Action */}
                          <div className="absolute right-2 top-2">
                            {renderStarButton(null, tpl.id)}
                          </div>
                        </div>
                        <p className="text-[10px] font-light text-muted-foreground leading-tight pl-1 pr-6 line-clamp-2">
                          {tpl.description || (isRtl ? 'تم تكوين قالب مخصص.' : 'Custom configured template.')}
                        </p>

                        <div className="mt-1 flex items-center justify-between pl-1">
                          <span className={`text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${tpl.default_style?.badgeColor || 'bg-accent/10 text-accent'}`}>
                            {tpl.base_type}
                          </span>
                          
                          {canEdit && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-semibold text-accent uppercase tracking-wider">
                              {isRtl ? 'سحب / نقر +' : 'Drag / Click +'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* If we are on favorites and we have custom favorites, list them here */}
            {activeTab === 'favorites' && filteredCustomTemplates.length > 0 && (
              <div className="pt-4 border-t border-border/60 space-y-3 font-sans">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>{isRtl ? 'عناصر مخصصة مفضلة' : 'Favorite Custom Elements'}</span>
                </h3>
                <div className="space-y-3">
                  {filteredCustomTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, 'custom_template', tpl)}
                      onClick={() => canEdit && onAddNode('custom_template', tpl)}
                      className={`p-3 border border-border bg-background/60 hover:bg-muted/50 rounded-xl cursor-grab transition-all shadow-xs flex flex-col gap-1 relative overflow-hidden active:cursor-grabbing group ${
                        !canEdit ? 'opacity-65 cursor-not-allowed' : ''
                      }`}
                    >
                      {/* Custom dynamic accent color bar */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1 ${tpl.default_style?.accentBar || 'bg-accent'}`} />

                      <div className="flex items-center justify-between pl-1">
                        <div className="flex items-center gap-1.5 min-w-0 pr-6">
                          <div className="w-4.5 h-4.5 rounded-md bg-muted flex items-center justify-center border border-border/40 shrink-0 text-foreground">
                            {getCustomIconForSidebar(tpl.default_style?.iconName || 'settings')}
                          </div>
                          <span className="font-bold text-xs text-foreground group-hover:text-accent transition-colors truncate">
                            {tpl.name}
                          </span>
                        </div>
                        
                        {/* Star Action */}
                        <div className="absolute right-2 top-2">
                          {renderStarButton(null, tpl.id)}
                        </div>
                      </div>
                      <p className="text-[10px] font-light text-muted-foreground leading-tight pl-1 pr-6 line-clamp-2">
                        {tpl.description || (isRtl ? 'تم تكوين قالب مخصص.' : 'Custom configured template.')}
                      </p>

                      <div className="mt-1 flex items-center justify-between pl-1">
                        <span className={`text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${tpl.default_style?.badgeColor || 'bg-accent/10 text-accent'}`}>
                          {tpl.base_type}
                        </span>
                        
                        {canEdit && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-semibold text-accent uppercase tracking-wider">
                            {isRtl ? 'سحب / نقر +' : 'Drag / Click +'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Installed Marketplace elements section */}
            {(activeTab === 'marketplace' || activeTab === 'all') && (
              <div className="pt-4 border-t border-border/60 space-y-3 font-sans">
                <div className="flex items-center justify-between pl-1">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-violet-400" />
                    <span>{isRtl ? 'العقد المثبتة (المتجر)' : 'Installed Nodes (Store)'}</span>
                  </h3>
                  <button
                    onClick={() => window.open(`/${locale}/marketplace`, '_blank')}
                    className="text-[9px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-0.5 cursor-pointer bg-violet-500/10 px-2 py-0.5 rounded-md hover:bg-violet-500/20 transition-all"
                  >
                    <span>{isRtl ? 'تصفح المتجر' : 'Browse'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>

                {filteredMarketplace.length === 0 ? (
                  <div className="text-center py-4 bg-muted/10 border border-dashed border-border/40 rounded-xl p-3">
                    <Store className="w-5 h-5 mx-auto text-muted-foreground/25 mb-1" />
                    <p className="text-[10px] text-muted-foreground font-light leading-snug">
                      {isRtl 
                        ? 'لم يتم تثبيت أي عقد من المتجر بعد.'
                        : 'No installed marketplace nodes found.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMarketplace.map((tpl) => (
                      <div
                        key={tpl.id}
                        draggable={canEdit}
                        onDragStart={(e) => handleDragStart(e, 'custom_template', tpl)}
                        onClick={() => canEdit && onAddNode('custom_template', tpl)}
                        className={`p-3 border border-border bg-background/60 hover:bg-muted/50 rounded-xl cursor-grab transition-all shadow-xs flex flex-col gap-1 relative overflow-hidden active:cursor-grabbing group ${
                          !canEdit ? 'opacity-65 cursor-not-allowed' : ''
                        }`}
                      >
                        {/* Dynamic accent color bar */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1 ${tpl.default_style?.accentBar || 'bg-violet-500'}`} />

                        <div className="flex items-center justify-between pl-1">
                          <div className="flex items-center gap-1.5 min-w-0 pr-6">
                            {/* Small icon */}
                            <div className="w-4.5 h-4.5 rounded-md bg-muted flex items-center justify-center border border-border/40 shrink-0 text-foreground">
                              {getCustomIconForSidebar(tpl.default_style?.iconName || 'settings')}
                            </div>
                            <span className="font-bold text-xs text-foreground group-hover:text-accent transition-colors truncate">
                              {tpl.name}
                            </span>
                          </div>
                          
                          {/* Star Action */}
                          <div className="absolute right-2 top-2">
                            {renderStarButton(null, tpl.id)}
                          </div>
                        </div>
                        <p className="text-[10px] font-light text-muted-foreground leading-tight pl-1 pr-6 line-clamp-2">
                          {tpl.description || (isRtl ? 'لا يوجد وصف.' : 'No description.')}
                        </p>

                        <div className="mt-1 flex items-center justify-between pl-1">
                          <span className={`text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${tpl.default_style?.badgeColor || 'bg-violet-500/10 text-violet-400'}`}>
                            {tpl.base_type}
                          </span>
                          
                          {canEdit && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-semibold text-accent uppercase tracking-wider">
                              {isRtl ? 'سحب / نقر +' : 'Drag / Click +'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
