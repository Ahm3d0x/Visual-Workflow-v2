'use client';

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { nodeCatalog } from '../nodes/nodeTypes';
import { 
  Search, Sliders, Play, GitFork, ArrowRightLeft, 
  Send, BrainCircuit, X, ChevronLeft, ChevronRight,
  Star, Sparkles, AlertTriangle, StopCircle, Database, 
  CheckSquare, Clock, RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { CustomElementDesigner } from './CustomElementDesigner';
import { PLAN_LIMITS } from '@/lib/planLimits';

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

export function LibrarySidebar({ locale, onAddNode, userRole, workspaceId }: LibrarySidebarProps) {
  const isRtl = locale === 'ar';
  const { panels, togglePanel } = useEditorStore();
  const isOpen = panels.library;

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'basic' | 'logic' | 'data' | 'integration' | 'human' | 'ai'>('all');

  // Supabase states
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<'free' | 'warrior' | 'elite' | 'champion' | 'legend'>('free');
  const [favorites, setFavorites] = useState<{ id: string; node_type: string | null; custom_node_template_id: string | null }[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [triggerFetchCount, setTriggerFetchCount] = useState(0);

  const canEdit = ['owner', 'admin', 'editor'].includes(userRole);

  // Group mappings
  const categories = [
    { id: 'all', label: 'All', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'favorites', label: 'Favorites', icon: <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> },
    { id: 'basic', label: 'Basic', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'logic', label: 'Logic', icon: <GitFork className="w-3.5 h-3.5" /> },
    { id: 'data', label: 'Data', icon: <ArrowRightLeft className="w-3.5 h-3.5" /> },
    { id: 'integration', label: 'Integration', icon: <Send className="w-3.5 h-3.5" /> },
    { id: 'human', label: 'Human', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'ai', label: 'AI Agent', icon: <BrainCircuit className="w-3.5 h-3.5 text-rose-500" /> },
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
        alert(`Limit Reached: You can only have up to ${limit} favorites on your current ${activePlan} plan. Please upgrade your plan in the Billing section to unlock more favorites.`);
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
      default: return <Sliders className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  // Get color indicators by category
  const getCategoryColor = (cat: string) => {
    switch (cat) {
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
        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
      >
        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500' : ''}`} />
      </button>
    );
  };

  // Filter Catalog / Favorites
  const filteredCatalog = activeTab === 'favorites' 
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

  const filteredCustomTemplates = activeTab === 'favorites'
    ? customTemplates.filter(tpl => 
        favorites.some(f => f.custom_node_template_id === tpl.id) &&
        (tpl.name.toLowerCase().includes(search.toLowerCase()) || 
         (tpl.description && tpl.description.toLowerCase().includes(search.toLowerCase())))
      )
    : customTemplates.filter(tpl => {
        const matchesSearch = tpl.name.toLowerCase().includes(search.toLowerCase()) || 
                              (tpl.description && tpl.description.toLowerCase().includes(search.toLowerCase()));
        const matchesTab = activeTab === 'all' || tpl.base_type === activeTab;
        return matchesSearch && matchesTab;
      });

  if (!isOpen) {
    return (
      <button
        onClick={() => togglePanel('library')}
        className={`absolute top-20 ${
          isRtl ? 'right-4' : 'left-4'
        } z-10 w-9 h-9 bg-background/95 border border-border shadow-md rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.03] focus:outline-hidden`}
        title="Open Library"
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
          <h2 className="font-bold text-sm font-sans tracking-tight">Nodes Library</h2>
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
        <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2 animate-fadeIn relative">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Subscription Guard
            </h4>
            <p className="text-[10px] text-muted-foreground font-light leading-snug">
              You&apos;ve hit the limits on your <strong>{activePlan}</strong> plan. Upgrade to unlock unlimited custom nodes & favorites!
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
            placeholder="Search nodes..."
            className="h-9 pl-9 pr-3 rounded-xl border-border focus:ring-accent text-xs font-light"
          />
        </div>
      </div>

      {/* 3. Horizontal Scrollable Tabs */}
      <div className="border-b border-border bg-background/10 py-1.5 px-2 overflow-x-auto flex gap-1.5 scrollbar-thin select-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === cat.id
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 4. List of Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground font-light mt-2">Loading library elements...</p>
          </div>
        ) : (
          <>
            {/* Standard elements section */}
            <div className="space-y-3">
              {filteredCatalog.length === 0 && filteredCustomTemplates.length === 0 ? (
                <div className="text-center py-12 space-y-1">
                  <Sliders className="w-8 h-8 mx-auto text-muted-foreground/35" />
                  <p className="text-xs text-muted-foreground font-light">No node types found</p>
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
                      <span className="font-bold text-xs font-sans text-foreground group-hover:text-accent transition-colors pr-6">
                        {item.label}
                      </span>
                      
                      {/* Star Favorite Action */}
                      <div className="absolute right-2 top-2">
                        {renderStarButton(item.type, null)}
                      </div>
                    </div>
                    <p className="text-[10px] font-light text-muted-foreground leading-tight pl-1 pr-6">
                      {item.description}
                    </p>

                    <div className="mt-1 flex items-center justify-between pl-1">
                      <span className="text-[8px] font-mono text-muted-foreground bg-border/40 px-1.5 py-0.5 rounded-md capitalize">
                        {item.category}
                      </span>
                      {canEdit && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-semibold text-accent uppercase tracking-wider">
                          Drag / Click +
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Custom reusable nodes section */}
            {activeTab !== 'favorites' && (
              <div className="pt-4 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Custom Elements</span>
                  </h3>
                  <span className="text-[9px] font-mono text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-md">
                    {customTemplates.length} templates
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
                      No custom templates found. Use the designer modal to construct customized nodes.
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
                            <span className="font-bold text-xs font-sans text-foreground group-hover:text-accent transition-colors truncate">
                              {tpl.name}
                            </span>
                          </div>
                          
                          {/* Star Action */}
                          <div className="absolute right-2 top-2">
                            {renderStarButton(null, tpl.id)}
                          </div>
                        </div>
                        <p className="text-[10px] font-light text-muted-foreground leading-tight pl-1 pr-6 line-clamp-2">
                          {tpl.description || 'Custom configured template.'}
                        </p>

                        <div className="mt-1 flex items-center justify-between pl-1">
                          <span className={`text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${tpl.default_style?.badgeColor || 'bg-accent/10 text-accent'}`}>
                            {tpl.base_type}
                          </span>
                          
                          {canEdit && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-semibold text-accent uppercase tracking-wider">
                              Drag / Click +
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
              <div className="pt-4 border-t border-border/60 space-y-3">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Favorite Custom Elements</span>
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
                          <span className="font-bold text-xs font-sans text-foreground group-hover:text-accent transition-colors truncate">
                            {tpl.name}
                          </span>
                        </div>
                        
                        {/* Star Action */}
                        <div className="absolute right-2 top-2">
                          {renderStarButton(null, tpl.id)}
                        </div>
                      </div>
                      <p className="text-[10px] font-light text-muted-foreground leading-tight pl-1 pr-6 line-clamp-2">
                        {tpl.description || 'Custom configured template.'}
                      </p>

                      <div className="mt-1 flex items-center justify-between pl-1">
                        <span className={`text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${tpl.default_style?.badgeColor || 'bg-accent/10 text-accent'}`}>
                          {tpl.base_type}
                        </span>
                        
                        {canEdit && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-semibold text-accent uppercase tracking-wider">
                            Drag / Click +
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
