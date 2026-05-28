'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  Calendar,
  Layers,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import Link from 'next/link';

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived' | 'published';
  node_count: number;
  updated_at: string;
}

interface WorkflowsListProps {
  initialWorkflows: WorkflowItem[];
  workspaceId: string;
  locale: string;
}

export function WorkflowsList({ initialWorkflows, workspaceId, locale }: WorkflowsListProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const supabase = createClient();

  const [workflows, setWorkflows] = useState<WorkflowItem[]>(initialWorkflows);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'archived' | 'published'>('all');
  const [sortBy, setSortBy] = useState<'modified' | 'name' | 'nodes'>('modified');

  // Mutation Handlers
  const handleArchive = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'archived' ? 'draft' : 'archived';
    const { error } = await (supabase
      .from('workflows') as any)
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: nextStatus as any, updated_at: new Date().toISOString() } : w))
      );
    }
  };

  const handleDuplicate = async (workflow: WorkflowItem) => {
    const { data: userData } = await supabase.auth.getUser();
    
    // 1. Insert duplicated workflow
    const { data, error } = await (supabase
      .from('workflows') as any)
      .insert({
        workspace_id: workspaceId,
        name: `Copy of ${workflow.name}`,
        description: workflow.description,
        status: 'draft',
        node_count: workflow.node_count,
        created_by: userData.user?.id || null,
      })
      .select()
      .single();

    if (data && !error) {
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
      alert('Workflow successfully duplicated!');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this workflow? This action is irreversible.')) return;

    const { error } = await (supabase.from('workflows') as any).delete().eq('id', id);

    if (!error) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      alert('Workflow deleted.');
    }
  };

  // Filter & Sort Logic
  const filteredWorkflows = workflows
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
      active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      archived: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      published: 'bg-accent/10 text-accent border-accent/20',
    };
    return (
      <Badge variant="outline" className={`capitalize rounded-md font-semibold text-xs ${colors[status] || colors.draft}`}>
        {status}
      </Badge>
    );
  };

  const getCardThemeGradient = (id: string) => {
    const charCode = id.charCodeAt(0) || 0;
    const gradients = [
      'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
      'from-purple-500/10 to-pink-500/10 border-purple-500/20',
      'from-amber-500/10 to-orange-500/10 border-amber-500/20',
      'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
    ];
    return gradients[charCode % gradients.length];
  };

  return (
    <div className="space-y-6 mt-8">
      {/* Search, Filter, Sort and View Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="ps-10 py-6 rounded-xl border-border focus:ring-accent"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-xl text-sm font-semibold hover:bg-muted cursor-pointer transition-all focus:outline-hidden select-none">
              <span>Status: {statusFilter.toUpperCase()}</span>
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-md w-40">
              {['all', 'draft', 'active', 'archived', 'published'].map((st) => (
                <DropdownMenuItem
                  key={st}
                  onClick={() => setStatusFilter(st as any)}
                  className="cursor-pointer capitalize rounded-lg m-1 font-medium"
                >
                  {st}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-xl text-sm font-semibold hover:bg-muted cursor-pointer transition-all focus:outline-hidden select-none">
              <span>Sort by: {sortBy === 'modified' ? 'Modified' : sortBy === 'name' ? 'Name A-Z' : 'Node Count'}</span>
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-md w-44">
              <DropdownMenuItem onClick={() => setSortBy('modified')} className="cursor-pointer rounded-lg m-1 font-medium">
                Last Modified
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')} className="cursor-pointer rounded-lg m-1 font-medium">
                Name A-Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('nodes')} className="cursor-pointer rounded-lg m-1 font-medium">
                Node Count
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
        <Card className="border border-dashed border-border py-16 text-center rounded-2xl bg-background/20">
          <CardContent className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">{t('no_workflows')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto font-light">
              Press the &quot;+ New Workflow&quot; button at the top to draft your first automation canvas pipeline.
            </p>
          </CardContent>
        </Card>
      ) : (viewMode === 'grid' || !globalThis.window || window.innerWidth < 640) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((wf) => (
            <Card key={wf.id} className="bg-background/60 border border-border backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md hover:border-accent/40 group relative overflow-hidden flex flex-col justify-between">
              {/* Premium Gradient Header */}
              <div className={`h-24 bg-linear-to-tr ${getCardThemeGradient(wf.id)} flex items-center justify-center p-4 border-b transition-all duration-300 relative`}>
                <div className="absolute top-3 right-3">{getStatusBadge(wf.status)}</div>
                <WorkflowIcon className="w-8 h-8 opacity-45 group-hover:scale-110 group-hover:opacity-75 transition-all duration-300 text-accent" />
              </div>

              <CardHeader className="p-5 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/${locale}/workflows/${wf.id}`} className="hover:underline">
                    <CardTitle className="text-lg font-bold font-sans tracking-tight line-clamp-1">
                      {wf.name}
                    </CardTitle>
                  </Link>
                  {/* Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted shrink-0 cursor-pointer focus:outline-hidden">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg w-40">
                      <DropdownMenuItem onClick={() => router.push(`/workflows/${wf.id}`)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium">
                        <Edit2 className="w-4 h-4 text-muted-foreground" /> Edit Canvas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(wf)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium">
                        <Copy className="w-4 h-4 text-muted-foreground" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(wf.id, wf.status)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium">
                        <Archive className="w-4 h-4 text-muted-foreground" />
                        <span>{wf.status === 'archived' ? 'Restore Draft' : 'Archive'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(wf.id)} className="cursor-pointer gap-2 rounded-lg m-1 font-semibold text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
                        <Trash2 className="w-4 h-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="text-sm font-light text-muted-foreground line-clamp-2 h-10">
                  {wf.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-accent" />
                  {wf.node_count} nodes
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(wf.updated_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden shadow-sm bg-background/50 backdrop-blur-md">
          <div className="divide-y divide-border">
            {filteredWorkflows.map((wf) => (
              <div key={wf.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl bg-linear-to-tr ${getCardThemeGradient(wf.id)} flex items-center justify-center shrink-0 border`}>
                    <WorkflowIcon className="w-5 h-5 opacity-60 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <Link href={`/${locale}/workflows/${wf.id}`} className="hover:underline">
                      <h4 className="font-bold font-sans text-sm truncate">{wf.name}</h4>
                    </Link>
                    <p className="text-xs font-light text-muted-foreground truncate max-w-md">
                      {wf.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-sm">
                  {getStatusBadge(wf.status)}
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Play className="w-3.5 h-3.5 text-accent" />
                    {wf.node_count} nodes
                  </span>
                  <span className="text-muted-foreground text-xs hidden sm:inline">
                    Updated {new Date(wf.updated_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                  </span>

                  {/* Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted shrink-0 cursor-pointer focus:outline-hidden">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border border-border rounded-xl shadow-lg w-40">
                      <DropdownMenuItem onClick={() => router.push(`/workflows/${wf.id}`)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium">
                        <Edit2 className="w-4 h-4 text-muted-foreground" /> Edit Canvas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(wf)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium">
                        <Copy className="w-4 h-4 text-muted-foreground" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(wf.id, wf.status)} className="cursor-pointer gap-2 rounded-lg m-1 font-medium">
                        <Archive className="w-4 h-4 text-muted-foreground" />
                        <span>{wf.status === 'archived' ? 'Restore Draft' : 'Archive'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(wf.id)} className="cursor-pointer gap-2 rounded-lg m-1 font-semibold text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
                        <Trash2 className="w-4 h-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
