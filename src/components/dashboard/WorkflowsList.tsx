/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useDialogStore } from '@/stores/dialogStore';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Search,
  Grid,
  List as ListIcon,
  MoreVertical,
  Edit2,
  Copy,
  Archive,
  Trash2,
  Play,
  ChevronDown,
  ChevronRight,
  Calendar,
  Layers,
  Workflow as WorkflowIcon,
  Loader2,
  Presentation,
} from 'lucide-react';
import Link from 'next/link';

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived' | 'published';
  node_count: number;
  updated_at: string;
  is_whiteboard?: boolean;
  board_data?: any;
}

interface SharedWorkflowItem extends WorkflowItem {
  role: string;
}

interface WorkflowsListProps {
  initialWorkflows: WorkflowItem[];
  initialWhiteboards: WorkflowItem[];
  sharedWorkflows?: SharedWorkflowItem[];
  sharedWhiteboards?: SharedWorkflowItem[];
  workspaceId: string;
  workspaces: Array<{ id: string; name: string; plan: string }>;
  locale: string;
}

export function WorkflowsList({
  initialWorkflows,
  initialWhiteboards,
  sharedWorkflows = [],
  sharedWhiteboards = [],
  workspaceId,
  workspaces,
  locale
}: WorkflowsListProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const supabase = createClient();

  const isRtl = locale === 'ar';

  const getStatusLabel = (st: string) => {
    if (isRtl) {
      if (st === 'all') return 'الكل';
      if (st === 'draft') return 'مسودة';
      if (st === 'active') return 'نشط';
      if (st === 'archived') return 'مؤرشف';
      if (st === 'published') return 'منشور';
    }
    return st;
  };

  const getSortLabel = (sortVal: string) => {
    if (isRtl) {
      if (sortVal === 'modified') return 'آخر تعديل';
      if (sortVal === 'name') return 'الاسم أ-ي';
      if (sortVal === 'nodes') return 'عدد العقد';
    }
    return sortVal === 'modified' ? 'Modified' : sortVal === 'name' ? 'Name A-Z' : 'Node Count';
  };

  const [workflows, setWorkflows] = useState<WorkflowItem[]>(initialWorkflows);
  const [whiteboards, setWhiteboards] = useState<WorkflowItem[]>(initialWhiteboards);
  const [activeTab, setActiveTab] = useState<'workflows' | 'whiteboards' | 'shared'>('workflows');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'archived' | 'published'>('all');
  const [sortBy, setSortBy] = useState<'modified' | 'name' | 'nodes'>('modified');

  // Copy/Move Portability States
  const [copyMoveOpen, setCopyMoveOpen] = useState(false);
  const [selectedWf, setSelectedWf] = useState<WorkflowItem | null>(null);
  const [copyMoveMode, setCopyMoveMode] = useState<'copy' | 'move'>('copy');
  const [targetWsId, setTargetWsId] = useState('');
  const [portingLoading, setPortingLoading] = useState(false);

  // Mutation Handlers
  const handleArchive = async (id: string, currentStatus: string) => {
    const isWb = activeTab === 'whiteboards';
    const nextStatus = currentStatus === 'archived' ? 'draft' : 'archived';
    const { error } = await (supabase
      .from('workflows') as any)
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      if (isWb) {
        setWhiteboards((prev) =>
          prev.map((w) => (w.id === id ? { ...w, status: nextStatus as any, updated_at: new Date().toISOString() } : w))
        );
      } else {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === id ? { ...w, status: nextStatus as any, updated_at: new Date().toISOString() } : w))
        );
      }
    }
  };

  const handleDuplicate = async (workflow: WorkflowItem) => {
    const { data: userData } = await supabase.auth.getUser();
    const isWb = (workflow as any).is_whiteboard;

    // 1. Insert duplicated workflow/whiteboard
    const { data, error } = await (supabase
      .from('workflows') as any)
      .insert({
        workspace_id: workspaceId,
        name: isRtl ? `نسخة من ${workflow.name}` : `Copy of ${workflow.name}`,
        description: workflow.description,
        status: 'draft',
        node_count: isWb ? 0 : workflow.node_count,
        is_whiteboard: isWb,
        board_data: isWb ? ((workflow as any).board_data || {}) : {},
        created_by: userData.user?.id || null,
      })
      .select()
      .single();

    if (data && !error) {
      if (isWb) {
        setWhiteboards((prev) => [data as any, ...prev]);
        useDialogStore.getState().showNotification(
          isRtl ? 'تم تكرار اللوحة البيضاء بنجاح!' : 'Whiteboard successfully duplicated!',
          'success'
        );
      } else {
        // 2. Fetch original nodes and duplicate them
        const { data: nodes } = await (supabase
          .from('workflow_nodes') as any)
          .select()
          .eq('workflow_id', workflow.id);

        if (nodes && nodes.length > 0) {
          const nodesToInsert = nodes.map((n: any) => ({
            workflow_id: data.id,
            type: n.type,
            position: n.position,
            data: n.data,
            style: n.style,
          }));
          await (supabase.from('workflow_nodes') as any).insert(nodesToInsert);
        }

        setWorkflows((prev) => [data as any, ...prev]);
        useDialogStore.getState().showNotification(
          isRtl ? 'تم تكرار سير العمل بنجاح!' : 'Workflow successfully duplicated!',
          'success'
        );
      }
    }
  };

  const handleDelete = async (id: string) => {
    const isWb = activeTab === 'whiteboards';
    const title = isWb ? (isRtl ? 'حذف اللوحة البيضاء' : 'Delete Whiteboard') : (isRtl ? 'حذف سير العمل' : 'Delete Workflow');
    const message = isWb
      ? (isRtl ? 'هل أنت متأكد أنك تريد حذف هذه اللوحة البيضاء نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to permanently delete this whiteboard? This action is irreversible.')
      : (isRtl ? 'هل أنت متأكد أنك تريد حذف مخطط سير العمل هذا نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to permanently delete this workflow? This action is irreversible.');

    const confirmed = await useDialogStore.getState().showConfirm(title, message, {
      confirmText: isRtl ? 'حذف نهائي' : 'Delete Permanently',
      cancelText: isRtl ? 'إلغاء' : 'Cancel'
    });
    if (!confirmed) return;

    const { error } = await (supabase.from('workflows') as any).delete().eq('id', id);

    if (!error) {
      if (isWb) {
        setWhiteboards((prev) => prev.filter((w) => w.id !== id));
        useDialogStore.getState().showNotification(
          isRtl ? 'تم حذف اللوحة البيضاء.' : 'Whiteboard deleted.',
          'success'
        );
      } else {
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        useDialogStore.getState().showNotification(
          isRtl ? 'تم حذف مخطط سير العمل.' : 'Workflow deleted.',
          'success'
        );
      }
    }
  };

  const handleCopyMoveWorkflowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWf || !targetWsId) return;

    setPortingLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const isWb = (selectedWf as any).is_whiteboard;

    if (copyMoveMode === 'copy') {
      // 1. Insert duplicated workflow/whiteboard in target workspace
      const { data: newWf, error: wfError } = await (supabase
        .from('workflows') as any)
        .insert({
          workspace_id: targetWsId,
          name: selectedWf.name,
          description: selectedWf.description,
          status: 'draft',
          node_count: isWb ? 0 : selectedWf.node_count,
          is_whiteboard: isWb,
          board_data: isWb ? ((selectedWf as any).board_data || {}) : {},
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (wfError || !newWf) {
        useDialogStore.getState().showAlert(
          isRtl ? 'خطأ' : 'Error',
          (isRtl ? 'فشل تكرار هيكل العمل: ' : 'Failed to duplicate structure: ') + wfError?.message
        );
        setPortingLoading(false);
        return;
      }

      if (!isWb) {
        // 2. Fetch original nodes & edges
        const { data: nodes } = await (supabase.from('workflow_nodes') as any).select().eq('workflow_id', selectedWf.id);
        const { data: edges } = await (supabase.from('workflow_edges') as any).select().eq('workflow_id', selectedWf.id);

        const nodeIdMap: Record<string, string> = {};

        // 3. Batch insert nodes sequentially to establish old-to-new ID map
        if (nodes && nodes.length > 0) {
          for (const node of nodes) {
            const { data: newNode, error: nodeErr } = await (supabase
              .from('workflow_nodes') as any)
              .insert({
                workflow_id: newWf.id,
                type: node.type,
                position: node.position,
                data: node.data,
                style: node.style,
              })
              .select('id')
              .single();

            if (newNode && !nodeErr) {
              nodeIdMap[node.id] = newNode.id;
            }
          }

          // Adjust parent nesting relationships for ReactFlow groupings
          for (const node of nodes) {
            if (node.parent_id && nodeIdMap[node.parent_id]) {
              await (supabase.from('workflow_nodes') as any)
                .update({ parent_id: nodeIdMap[node.parent_id] })
                .eq('id', nodeIdMap[node.id]);
            }
          }
        }

        // 4. Map and batch insert edges
        if (edges && edges.length > 0) {
          const edgesToInsert = edges
            .filter((e: any) => nodeIdMap[e.source_node_id] && nodeIdMap[e.target_node_id])
            .map((e: any) => ({
              workflow_id: newWf.id,
              source_node_id: nodeIdMap[e.source_node_id],
              target_node_id: nodeIdMap[e.target_node_id],
              source_handle: e.source_handle,
              target_handle: e.target_handle,
            }));

          if (edgesToInsert.length > 0) {
            await (supabase.from('workflow_edges') as any).insert(edgesToInsert);
          }
        }
      }

      // 5. Update local state list if target matches current active workspace
      if (targetWsId === workspaceId) {
        if (isWb) {
          setWhiteboards((prev) => [newWf as any, ...prev]);
        } else {
          setWorkflows((prev) => [newWf as any, ...prev]);
        }
      }

      useDialogStore.getState().showNotification(
        isWb
          ? (isRtl ? 'تم نسخ اللوحة البيضاء إلى مساحة العمل المستهدفة بنجاح!' : 'Whiteboard successfully copied to target workspace!')
          : (isRtl ? 'تم نسخ سير العمل إلى مساحة العمل المستهدفة بنجاح!' : 'Workflow successfully copied to target workspace!'),
        'success'
      );
    } else {
      // Move workflow/whiteboard: Update workspace_id
      const { error: moveError } = await (supabase
        .from('workflows') as any)
        .update({ workspace_id: targetWsId })
        .eq('id', selectedWf.id);

      if (moveError) {
        useDialogStore.getState().showAlert(
          isRtl ? 'خطأ' : 'Error',
          (isRtl ? 'فشل النقل: ' : 'Failed to transfer: ') + moveError.message
        );
      } else {
        // Remove from current local state list
        if (isWb) {
          setWhiteboards((prev) => prev.filter((w) => w.id !== selectedWf.id));
        } else {
          setWorkflows((prev) => prev.filter((w) => w.id !== selectedWf.id));
        }
        useDialogStore.getState().showNotification(
          isWb
            ? (isRtl ? 'تم نقل اللوحة البيضاء إلى مساحة العمل المستهدفة بنجاح!' : 'Whiteboard successfully transferred to target workspace!')
            : (isRtl ? 'تم نقل سير العمل إلى مساحة العمل المستهدفة بنجاح!' : 'Workflow successfully transferred to target workspace!'),
          'success'
        );
      }
    }

    setPortingLoading(false);
    setCopyMoveOpen(false);
  };

  // Filter & Sort Logic
  const listToRender =
    activeTab === 'workflows'
      ? workflows
      : activeTab === 'whiteboards'
      ? whiteboards
      : [...sharedWorkflows, ...sharedWhiteboards];

  const filteredWorkflows = listToRender
    .filter((w) => {
      const matchesSearch =
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'modified') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'nodes') {
        return b.node_count - a.node_count;
      }
      return 0;
    });

  const getShareRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      editor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      commenter: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      viewer: 'bg-zinc-500/10 text-zinc-400 border-white/10',
    };
    return (
      <Badge variant="outline" className={`rounded-md font-semibold text-[10px] uppercase px-2 py-0.5 ${colors[role] || colors.viewer}`}>
        {role}
      </Badge>
    );
  };

  const getMockNodesForWf = (wfId: string, nodeCount: number) => {
    if (nodeCount <= 0) return [];
    const charCode = wfId.charCodeAt(0) || 0;
    const nodeTypesPool = [
      { label: isRtl ? 'مشغل' : 'Trigger', color: 'bg-blue-500/15 border-blue-500/20 text-blue-500 dark:text-blue-400' },
      { label: isRtl ? 'منطق' : 'Condition', color: 'bg-amber-500/15 border-amber-500/20 text-amber-500 dark:text-amber-400' },
      { label: isRtl ? 'ذكاء' : 'AI Agent', color: 'bg-purple-500/15 border-purple-500/20 text-purple-500 dark:text-purple-400' },
      { label: isRtl ? 'إجراء' : 'Process', color: 'bg-zinc-500/15 border-zinc-500/20 text-zinc-500 dark:text-zinc-400' },
      { label: isRtl ? 'دمج' : 'API Sync', color: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-500 dark:text-emerald-400' },
    ];
    const items = [];
    // First is always trigger
    items.push(nodeTypesPool[0]);
    // Dynamic intermediate nodes
    for (let i = 1; i < Math.min(nodeCount, 3); i++) {
      const idx = ((charCode + i) % (nodeTypesPool.length - 1)) + 1;
      items.push(nodeTypesPool[idx]);
    }
    return items;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
      active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      archived: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      published: 'bg-accent/10 text-accent border-accent/20',
    };
    return (
      <Badge variant="outline" className={`capitalize rounded-md font-semibold text-xs flex items-center gap-1.5 ${colors[status] || colors.draft}`}>
        {status === 'active' && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        )}
        <span>{getStatusLabel(status)}</span>
      </Badge>
    );
  };

  const getCardThemeGradient = (id: string) => {
    const charCode = id.charCodeAt(0) || 0;
    const gradients = [
      'from-blue-500/15 via-indigo-500/5 to-purple-500/15 border-blue-500/25',
      'from-purple-500/15 via-pink-500/5 to-rose-500/15 border-purple-500/25',
      'from-amber-500/15 via-orange-500/5 to-yellow-500/15 border-amber-500/25',
      'from-emerald-500/15 via-teal-500/5 to-cyan-500/15 border-emerald-500/25',
    ];
    return gradients[charCode % gradients.length];
  };

  const getEditorLink = (wf: any) => {
    return wf.is_whiteboard
      ? `/${locale}/whiteboards/${wf.id}`
      : `/${locale}/workflows/${wf.id}`;
  };

  const getEditorRoute = (wf: any) => {
    return wf.is_whiteboard
      ? `/whiteboards/${wf.id}`
      : `/workflows/${wf.id}`;
  };

  return (
    <div className="space-y-6 mt-8 font-sans">
      {/* Tab Switcher */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'workflows'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>{isRtl ? 'مخططات سير العمل' : 'Workflows'}</span>
          {workflows.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 rounded-full text-[10px] bg-accent/10 text-accent font-semibold border border-accent/20">
              {workflows.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('whiteboards')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'whiteboards'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>{isRtl ? 'اللوحات البيضاء' : 'Whiteboards'}</span>
          {whiteboards.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 rounded-full text-[10px] bg-accent/10 text-accent font-semibold border border-accent/20">
              {whiteboards.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('shared')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'shared'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>{isRtl ? 'المشاركة معي' : 'Shared with me'}</span>
          {(sharedWorkflows.length + sharedWhiteboards.length) > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 rounded-full text-[10px] bg-accent/10 text-accent font-semibold border border-accent/20">
              {sharedWorkflows.length + sharedWhiteboards.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Search, Filter, Sort and View Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md group">
          <Search className="w-5 h-5 absolute left-3 rtl:right-3 rtl:left-auto top-3.5 text-muted-foreground transition-colors group-focus-within:text-accent" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'whiteboards'
                ? t('search_whiteboards_placeholder')
                : t('search_placeholder')
            }
            className="ps-10 pe-12 rtl:ps-4 rtl:pe-10 py-6 rounded-xl border-border focus:ring-accent bg-card/45 backdrop-blur-md transition-all duration-300"
          />
          <div className="absolute right-3 rtl:left-3 rtl:right-auto top-3.5 hidden sm:flex items-center gap-1 bg-muted/80 px-2 py-1 rounded-md border border-border/55 text-[10px] font-mono text-muted-foreground pointer-events-none">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-xl text-sm font-semibold hover:bg-muted cursor-pointer transition-all focus:outline-hidden select-none">
              <span>{isRtl ? `الحالة: ${getStatusLabel(statusFilter)}` : `Status: ${statusFilter.toUpperCase()}`}</span>
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-md w-40 font-sans">
              {['all', 'draft', 'active', 'archived', 'published'].map((st) => (
                <DropdownMenuItem
                  key={st}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => setStatusFilter(st as any)}
                  className="cursor-pointer capitalize rounded-lg m-1 font-medium text-xs"
                >
                  {getStatusLabel(st)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-xl text-sm font-semibold hover:bg-muted cursor-pointer transition-all focus:outline-hidden select-none">
              <span>{isRtl ? `ترتيب حسب: ${getSortLabel(sortBy)}` : `Sort by: ${sortBy === 'modified' ? 'Modified' : sortBy === 'name' ? 'Name A-Z' : 'Node Count'}`}</span>
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-md w-44 font-sans">
              <DropdownMenuItem onClick={() => setSortBy('modified')} className="cursor-pointer rounded-lg m-1 font-medium text-xs">
                {isRtl ? 'آخر تعديل' : 'Last Modified'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')} className="cursor-pointer rounded-lg m-1 font-medium text-xs">
                {isRtl ? 'الاسم أ-ي' : 'Name A-Z'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('nodes')} className="cursor-pointer rounded-lg m-1 font-medium text-xs">
                {isRtl ? 'عدد العقد' : 'Node Count'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggles */}
          <div className="hidden sm:flex border border-border rounded-xl overflow-hidden shadow-sm shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="w-10 h-10 rounded-none cursor-pointer"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="w-10 h-10 rounded-none cursor-pointer"
            >
              <ListIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Workflows Grid / List */}
      {filteredWorkflows.length === 0 ? (
        <Card className="border border-dashed border-border py-16 text-center rounded-2xl bg-background/20 font-sans">
          <CardContent className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
              {activeTab === 'whiteboards' ? (
                <Presentation className="w-6 h-6 text-emerald-500" />
              ) : (
                <Layers className="w-6 h-6" />
              )}
            </div>
            <h3 className="font-bold text-lg">
              {activeTab === 'whiteboards' ? t('no_whiteboards') : t('no_workflows')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto font-light">
              {activeTab === 'whiteboards'
                ? (isRtl ? 'اضغط على زر "لوحة بيضاء جديدة" في الأعلى للبدء بالرسم والكتابة.' : 'Press the "New Whiteboard" button at the top to draft your first drawing canvas.')
                : (isRtl ? 'اضغط على زر "+ سير عمل جديد" في الأعلى للبدء بصياغة مخطط الأتمتة الخاص بك.' : 'Press the "+ New Workflow" button at the top to draft your first automation canvas pipeline.')}
            </p>
          </CardContent>
        </Card>
      ) : (viewMode === 'grid' || !globalThis.window || window.innerWidth < 640) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((wf) => (
            <Card key={wf.id} className="bg-card/45 border border-border backdrop-blur-md shadow-xs rounded-2xl transition-all duration-300 hover:shadow-md hover:border-accent/30 group relative overflow-hidden flex flex-col justify-between hover:-translate-y-1">
              {/* Premium Gradient Header */}
              <div className={`h-24 bg-linear-to-tr ${getCardThemeGradient(wf.id)} flex items-center justify-center p-4 border-b transition-all duration-300 relative`}>
                <div className="absolute top-3 right-3 rtl:left-3 rtl:right-auto">{getStatusBadge(wf.status)}</div>
                {wf.is_whiteboard ? (
                  <Presentation className="w-8 h-8 opacity-45 group-hover:scale-110 group-hover:opacity-75 transition-all duration-300 text-emerald-500" />
                ) : (
                  <WorkflowIcon className="w-8 h-8 opacity-45 group-hover:scale-110 group-hover:opacity-75 transition-all duration-300 text-accent" />
                )}
              </div>

              <CardHeader className="p-5 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={getEditorLink(wf)} className="hover:underline">
                        <CardTitle className="text-lg font-bold font-sans tracking-tight line-clamp-1 text-start">
                          {wf.name}
                        </CardTitle>
                      </Link>
                      {activeTab === 'shared' && getShareRoleBadge((wf as SharedWorkflowItem).role)}
                    </div>
                  </div>
                  {/* Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted shrink-0 cursor-pointer focus:outline-hidden">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg w-44 font-sans">
                      {activeTab === 'shared' ? (
                        <DropdownMenuItem onClick={() => router.push(getEditorRoute(wf))} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                          <span>{isRtl ? (((wf as SharedWorkflowItem).role === 'editor' ? 'تعديل اللوحة' : 'فتح اللوحة')) : (((wf as SharedWorkflowItem).role === 'editor' ? 'Edit Canvas' : 'Open Canvas'))}</span>
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => router.push(getEditorRoute(wf))} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Edit2 className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'تعديل اللوحة' : 'Edit Canvas'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedWf(wf); setCopyMoveMode('copy'); setTargetWsId(workspaces[0]?.id || ''); setCopyMoveOpen(true); }} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Copy className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'نسخ إلى مساحة عمل' : 'Copy to Workspace'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedWf(wf); setCopyMoveMode('move'); setTargetWsId(workspaces[0]?.id || ''); setCopyMoveOpen(true); }} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Layers className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'نقل إلى مساحة عمل' : 'Move to Workspace'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(wf)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Copy className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'تكرار محلي' : 'Duplicate Local'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(wf.id, wf.status)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Archive className="w-4 h-4 text-muted-foreground" />
                            <span>{isRtl ? (wf.status === 'archived' ? 'استعادة المسودة' : 'أرشفة') : (wf.status === 'archived' ? 'Restore Draft' : 'Archive')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(wf.id)} className="cursor-pointer gap-2 rounded-lg m-1 font-semibold text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="w-4 h-4" /> {isRtl ? 'حذف' : 'Delete'}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="text-sm font-light text-muted-foreground line-clamp-2 h-10 mb-3 text-start">
                  {wf.description || (isRtl ? 'لا يوجد وصف.' : 'No description provided.')}
                </CardDescription>

                {/* Visual Node Chain Roadmap Preview */}
                {wf.node_count > 0 && (
                  <div className="flex items-center gap-1 py-1.5 px-2 bg-muted/40 dark:bg-zinc-900/40 border border-border/60 rounded-xl max-w-fit select-none">
                    {getMockNodesForWf(wf.id, wf.node_count).map((nNode, nIdx) => (
                      <div key={nIdx} className="flex items-center gap-1">
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md border ${nNode.color}`}>
                          {nNode.label}
                        </span>
                        {nIdx < Math.min(wf.node_count, 3) - 1 && (
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 rtl:rotate-180" />
                        )}
                      </div>
                    ))}
                    {wf.node_count > 3 && (
                      <span className="text-[9px] text-muted-foreground font-mono font-bold ps-1">
                        +{wf.node_count - 3}
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-5 pt-0 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-medium">
                {wf.is_whiteboard ? (
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <Presentation className="w-3.5 h-3.5" />
                    {isRtl ? 'لوحة رسم مستقلة' : 'Drawing Canvas'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-accent" />
                    {isRtl ? `${wf.node_count} عقد` : `${wf.node_count} nodes`}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(wf.updated_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden shadow-xs bg-background/50 backdrop-blur-md font-sans">
          <div className="divide-y divide-border">
            {filteredWorkflows.map((wf) => (
              <div key={wf.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/40 border-b border-border/80 last:border-b-0 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl bg-linear-to-tr ${getCardThemeGradient(wf.id)} flex items-center justify-center shrink-0 border`}>
                    {wf.is_whiteboard ? (
                      <Presentation className="w-5 h-5 opacity-60 text-emerald-500" />
                    ) : (
                      <WorkflowIcon className="w-5 h-5 opacity-60 text-accent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={getEditorLink(wf)} className="hover:underline">
                        <h4 className="font-bold font-sans text-sm truncate text-start">{wf.name}</h4>
                      </Link>
                      {activeTab === 'shared' && getShareRoleBadge((wf as SharedWorkflowItem).role)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs font-light text-muted-foreground truncate max-w-xs md:max-w-md text-start">
                        {wf.description || (isRtl ? 'لا يوجد وصف.' : 'No description provided.')}
                      </p>
                      {wf.node_count > 0 && (
                        <div className="hidden md:flex items-center gap-1 py-0.5 px-1.5 bg-muted/50 border border-border/40 rounded-lg select-none">
                          {getMockNodesForWf(wf.id, wf.node_count).map((nNode, nIdx) => (
                            <div key={nIdx} className="flex items-center gap-0.5">
                              <span className={`text-[7px] font-extrabold px-1.5 py-0.1 rounded-md border ${nNode.color}`}>
                                {nNode.label}
                              </span>
                              {nIdx < Math.min(wf.node_count, 3) - 1 && (
                                <ChevronRight className="w-2.5 h-2.5 text-muted-foreground shrink-0 rtl:rotate-180" />
                              )}
                            </div>
                          ))}
                          {wf.node_count > 3 && (
                            <span className="text-[8px] text-muted-foreground font-mono font-bold ps-0.5">
                              +{wf.node_count - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center pe-2 gap-6 shrink-0 text-sm">
                  {getStatusBadge(wf.status)}
                  {wf.is_whiteboard ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                      <Presentation className="w-3.5 h-3.5" />
                      {isRtl ? 'لوحة رسم مستقلة' : 'Drawing Canvas'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Play className="w-3.5 h-3.5 text-accent" />
                      {isRtl ? `${wf.node_count} عقد` : `${wf.node_count} nodes`}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs hidden sm:inline">
                    {isRtl ? 'تحديث' : 'Updated'} {new Date(wf.updated_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                  </span>

                  {/* Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted shrink-0 cursor-pointer focus:outline-hidden">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg w-44 font-sans">
                      {activeTab === 'shared' ? (
                        <DropdownMenuItem onClick={() => router.push(getEditorRoute(wf))} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                          <span>{isRtl ? (((wf as SharedWorkflowItem).role === 'editor' ? 'تعديل اللوحة' : 'فتح اللوحة')) : (((wf as SharedWorkflowItem).role === 'editor' ? 'Edit Canvas' : 'Open Canvas'))}</span>
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => router.push(getEditorRoute(wf))} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Edit2 className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'تعديل اللوحة' : 'Edit Canvas'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedWf(wf); setCopyMoveMode('copy'); setTargetWsId(workspaces[0]?.id || ''); setCopyMoveOpen(true); }} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Copy className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'نسخ إلى مساحة عمل' : 'Copy to Workspace'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedWf(wf); setCopyMoveMode('move'); setTargetWsId(workspaces[0]?.id || ''); setCopyMoveOpen(true); }} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Layers className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'نقل إلى مساحة عمل' : 'Move to Workspace'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(wf)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Copy className="w-4 h-4 text-muted-foreground" /> {isRtl ? 'تكرار محلي' : 'Duplicate Local'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(wf.id, wf.status)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium text-xs">
                            <Archive className="w-4 h-4 text-muted-foreground" />
                            <span>{isRtl ? (wf.status === 'archived' ? 'استعادة المسودة' : 'أرشفة') : (wf.status === 'archived' ? 'Restore Draft' : 'Archive')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(wf.id)} className="cursor-pointer gap-2 rounded-lg m-1 font-semibold text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="w-4 h-4" /> {isRtl ? 'حذف' : 'Delete'}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Copy / Move Workspace Selector Dialog */}
      <Dialog open={copyMoveOpen} onOpenChange={setCopyMoveOpen}>
        <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-md p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isRtl
                ? (copyMoveMode === 'copy' ? 'نسخ مخطط سير العمل' : 'نقل مخطط سير العمل')
                : (copyMoveMode.charAt(0).toUpperCase() + copyMoveMode.slice(1) + ' Workflow')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCopyMoveWorkflowSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">{isRtl ? 'اختر مساحة العمل المستهدفة' : 'Select Target Workspace'}</Label>
              <div className="flex flex-col gap-2 bg-background/55 border border-border p-2 rounded-2xl max-h-56 overflow-y-auto shadow-xs">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => setTargetWsId(ws.id)}
                    className={`flex items-center justify-between p-3 rounded-xl text-left rtl:text-right text-xs font-semibold cursor-pointer select-none transition-all ${
                      targetWsId === ws.id
                        ? 'bg-accent/15 border border-accent text-foreground'
                        : 'border border-transparent text-muted-foreground hover:bg-white/5'
                    }`}
                  >
                    <span>{ws.name}</span>
                    <span className="text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold">
                      {ws.plan}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setCopyMoveOpen(false)} className="rounded-xl border-border cursor-pointer">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={portingLoading || !targetWsId} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 cursor-pointer capitalize flex items-center gap-1.5">
                {portingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? (copyMoveMode === 'copy' ? 'نسخ' : 'نقل') : copyMoveMode)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
