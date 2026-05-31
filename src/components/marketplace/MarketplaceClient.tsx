'use client';

import { useState, useMemo } from 'react';
import {
  Search, Store, Download, Filter,
  ArrowUpDown, Sparkles, X,
  Package, User, Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NodePreviewCard } from './NodePreviewCard';
import { NodeDetailModal } from './NodeDetailModal';
import { installMarketplaceNode, uninstallMarketplaceNode, rateMarketplaceNode } from '@/actions/marketplace.actions';
import { useDialogStore } from '@/stores/dialogStore';

interface MarketplaceNode {
  id: string;
  author_id: string;
  name: string;
  description: string | null;
  long_description: string | null;
  category: string;
  domain: string | null;
  tags: string[];
  icon: string | null;
  color: string | null;
  accent_bar: string | null;
  badge_color: string | null;
  color_class: string | null;
  base_type: string;
  install_count: number;
  avg_rating: number;
  rating_count: number;
  version: string;
  status: string;
  visibility: string;
  created_at: string;
  [key: string]: unknown;
}

interface MarketplaceClientProps {
  locale: string;
  nodes: Record<string, unknown>[];
  myNodes: Record<string, unknown>[];
  installedIds: string[];
  workspaceId: string;
  userId: string;
  userRatings: { marketplace_node_id: string; rating: number; review: string | null }[];
}

const CATEGORIES = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'logic', label: 'Logic', labelAr: 'المنطق' },
  { id: 'data', label: 'Data', labelAr: 'البيانات' },
  { id: 'integration', label: 'Integration', labelAr: 'التكامل' },
  { id: 'ai', label: 'AI', labelAr: 'ذكاء اصطناعي' },
  { id: 'human', label: 'Human', labelAr: 'بشري' },
  { id: 'general', label: 'General', labelAr: 'عام' },
];

const DOMAINS = [
  { id: 'all', label: 'All Domains', labelAr: 'كل المجالات' },
  { id: 'development', label: 'Development', labelAr: 'التطوير' },
  { id: 'marketing', label: 'Marketing', labelAr: 'التسويق' },
  { id: 'communication', label: 'Communication', labelAr: 'الاتصالات' },
  { id: 'productivity', label: 'Productivity', labelAr: 'الإنتاجية' },
  { id: 'artificial-intelligence', label: 'AI & ML', labelAr: 'الذكاء الاصطناعي' },
  { id: 'finance', label: 'Finance', labelAr: 'المالية' },
  { id: 'hr', label: 'HR', labelAr: 'الموارد البشرية' },
  { id: 'education', label: 'Education', labelAr: 'التعليم' },
];

type SortOption = 'popular' | 'newest' | 'rating';
type ViewTab = 'browse' | 'my-nodes';

export function MarketplaceClient({
  locale,
  nodes,
  myNodes,
  installedIds: initialInstalledIds,
  workspaceId,
  userRatings,
}: MarketplaceClientProps) {
  const isRtl = locale === 'ar';
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeDomain, setActiveDomain] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [activeTab, setActiveTab] = useState<ViewTab>('browse');
  const [installedIds, setInstalledIds] = useState<string[]>(initialInstalledIds);
  const [selectedNode, setSelectedNode] = useState<MarketplaceNode | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const typedNodes = nodes as unknown as MarketplaceNode[];
  const typedMyNodes = myNodes as unknown as MarketplaceNode[];

  // Filter and sort nodes
  const filteredNodes = useMemo(() => {
    const result = typedNodes.filter((node) => {
      const matchesSearch =
        !search ||
        node.name.toLowerCase().includes(search.toLowerCase()) ||
        (node.description && node.description.toLowerCase().includes(search.toLowerCase())) ||
        (node.tags && node.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

      const matchesCategory = activeCategory === 'all' || node.category === activeCategory;
      const matchesDomain = activeDomain === 'all' || node.domain === activeDomain;

      return matchesSearch && matchesCategory && matchesDomain;
    });

    // Sort
    if (sortBy === 'popular') {
      result.sort((a, b) => b.install_count - a.install_count);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.avg_rating - a.avg_rating);
    }

    return result;
  }, [typedNodes, search, activeCategory, activeDomain, sortBy]);

  // Install/uninstall handlers
  const handleInstall = async (nodeId: string) => {
    if (!workspaceId) {
      useDialogStore.getState().showAlert(
        isRtl ? 'اختيار مساحة العمل' : 'Select Workspace',
        isRtl ? 'يرجى اختيار مساحة عمل أولاً من القائمة العلوية.' : 'Please select a workspace first from the top bar.'
      );
      return;
    }
    setLoadingId(nodeId);
    const res = await installMarketplaceNode(workspaceId, nodeId);
    setLoadingId(null);

    if (res.error === 'PLAN_LIMIT_REACHED') {
      useDialogStore.getState().showAlert(
        isRtl ? 'حد الخطة' : 'Plan Limit',
        isRtl ? `لقد وصلت للحد الأقصى (${res.data?.limit}) من التثبيتات في خطتك الحالية. يرجى الترقية.` : `You've reached the maximum (${res.data?.limit}) installs on your current plan. Please upgrade.`
      );
    } else if (res.error) {
      useDialogStore.getState().showAlert(isRtl ? 'خطأ' : 'Error', res.error);
    } else {
      setInstalledIds(prev => [...prev, nodeId]);
      useDialogStore.getState().showNotification(
        isRtl ? 'تم تثبيت النود بنجاح!' : 'Node installed successfully!', 'success'
      );
    }
  };

  const handleUninstall = async (nodeId: string) => {
    if (!workspaceId) return;
    setLoadingId(nodeId);
    const res = await uninstallMarketplaceNode(workspaceId, nodeId);
    setLoadingId(null);

    if (res.error) {
      useDialogStore.getState().showAlert(isRtl ? 'خطأ' : 'Error', res.error);
    } else {
      setInstalledIds(prev => prev.filter(id => id !== nodeId));
      useDialogStore.getState().showNotification(
        isRtl ? 'تم إلغاء تثبيت النود.' : 'Node uninstalled.', 'success'
      );
    }
  };

  const handleRate = async (nodeId: string, rating: number, review?: string) => {
    const res = await rateMarketplaceNode(nodeId, rating, review);
    if (res.error) {
      useDialogStore.getState().showAlert(isRtl ? 'خطأ' : 'Error', res.error);
    } else {
      useDialogStore.getState().showNotification(
        isRtl ? 'تم حفظ تقييمك!' : 'Your rating has been saved!', 'success'
      );
    }
  };

  const totalInstalls = typedNodes.reduce((acc, n) => acc + n.install_count, 0);

  return (
    <div className="space-y-8 font-sans">
      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-violet-600/20 via-fuchsia-600/10 to-rose-600/10 border border-violet-500/20 p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Store className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                {isRtl ? 'متجر النودز' : 'Node Marketplace'}
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                {isRtl ? 'اكتشف وثبّت نودز متقدمة لتعزيز مخططات العمل الخاصة بك' : 'Discover and install advanced nodes to supercharge your workflows'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-foreground">{typedNodes.length}</span>
              <span className="text-muted-foreground font-light">{isRtl ? 'نود متاح' : 'nodes available'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-foreground">{totalInstalls}</span>
              <span className="text-muted-foreground font-light">{isRtl ? 'عملية تثبيت' : 'total installs'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-foreground">{installedIds.length}</span>
              <span className="text-muted-foreground font-light">{isRtl ? 'مثبّتة لديك' : 'installed by you'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'browse'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            {isRtl ? 'تصفح المتجر' : 'Browse Store'}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('my-nodes')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'my-nodes'
              ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/20'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {isRtl ? 'نودزي' : 'My Nodes'}
            {typedMyNodes.length > 0 && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">{typedMyNodes.length}</span>
            )}
          </span>
        </button>
      </div>

      {activeTab === 'browse' ? (
        <>
          {/* ── Search & Filters ── */}
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRtl ? 'ابحث عن نودز بالاسم أو التاجات...' : 'Search nodes by name or tags...'}
                className="h-11 pl-11 pr-4 rounded-xl border-border bg-background/80 backdrop-blur-sm text-sm font-light focus:ring-violet-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                  }`}
                >
                  {isRtl ? cat.labelAr : cat.label}
                </button>
              ))}
            </div>

            {/* Domain + Sort */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                {DOMAINS.slice(0, 6).map((dom) => (
                  <button
                    key={dom.id}
                    onClick={() => setActiveDomain(dom.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      activeDomain === dom.id
                        ? 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/25'
                        : 'text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/30 border border-transparent'
                    }`}
                  >
                    {isRtl ? dom.labelAr : dom.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                {(['popular', 'newest', 'rating'] as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-all ${
                      sortBy === opt
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {opt === 'popular' ? (isRtl ? 'الأكثر شعبية' : 'Popular') :
                     opt === 'newest' ? (isRtl ? 'الأحدث' : 'Newest') :
                     (isRtl ? 'الأعلى تقييماً' : 'Top Rated')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Results count ── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-light">
              {isRtl ? `عرض ${filteredNodes.length} من أصل ${typedNodes.length} نود` : `Showing ${filteredNodes.length} of ${typedNodes.length} nodes`}
            </p>
          </div>

          {/* ── Nodes Grid ── */}
          {filteredNodes.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Store className="w-12 h-12 mx-auto text-muted-foreground/30" />
              <h3 className="text-lg font-bold text-muted-foreground">
                {isRtl ? 'لم يتم العثور على نودز' : 'No nodes found'}
              </h3>
              <p className="text-sm text-muted-foreground/60 font-light">
                {isRtl ? 'جرب تعديل عوامل التصفية أو البحث بمصطلح مختلف' : 'Try adjusting your filters or search with different terms'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNodes.map((node) => (
                <NodePreviewCard
                  key={node.id}
                  node={node}
                  isInstalled={installedIds.includes(node.id)}
                  isLoading={loadingId === node.id}
                  locale={locale}
                  onInstall={() => handleInstall(node.id)}
                  onUninstall={() => handleUninstall(node.id)}
                  onClick={() => setSelectedNode(node)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── My Nodes Tab ── */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
              {isRtl ? 'النودز اللي أنشأتها' : 'Nodes You Created'}
            </h2>
            <a
              href={`/${locale}/node-creator${workspaceId ? `?w=${workspaceId}` : ''}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-600/90 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isRtl ? 'إنشاء نود جديد' : 'Create New Node'}
            </a>
          </div>

          {typedMyNodes.length === 0 ? (
            <div className="text-center py-16 space-y-3 border border-dashed border-border/50 rounded-2xl bg-muted/5">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <h3 className="font-bold text-muted-foreground">{isRtl ? 'لم تنشئ أي نود بعد' : 'No nodes created yet'}</h3>
              <p className="text-sm text-muted-foreground/60 font-light max-w-sm mx-auto">
                {isRtl
                  ? 'ابدأ بإنشاء نود مخصص من صفحة صانع النودز وشاركها مع المجتمع!'
                  : 'Start creating custom nodes from the Node Creator and share them with the community!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typedMyNodes.map((node) => (
                <NodePreviewCard
                  key={node.id}
                  node={node}
                  isInstalled={installedIds.includes(node.id)}
                  isLoading={loadingId === node.id}
                  locale={locale}
                  isOwner
                  onInstall={() => handleInstall(node.id)}
                  onUninstall={() => handleUninstall(node.id)}
                  onClick={() => setSelectedNode(node)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Node Detail Modal ── */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          isInstalled={installedIds.includes(selectedNode.id)}
          isLoading={loadingId === selectedNode.id}
          locale={locale}
          userRating={userRatings.find(r => r.marketplace_node_id === selectedNode.id)}
          onClose={() => setSelectedNode(null)}
          onInstall={() => handleInstall(selectedNode.id)}
          onUninstall={() => handleUninstall(selectedNode.id)}
          onRate={(rating: number, review?: string) => handleRate(selectedNode.id, rating, review)}
        />
      )}
    </div>
  );
}
