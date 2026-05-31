'use client';

import { 
  Download, Check, Star, Tag, Loader2,
  Settings, Play, StopCircle, GitFork, ArrowRightLeft,
  Send, Database, CheckSquare, BrainCircuit, Clock, RefreshCw
} from 'lucide-react';

interface NodePreviewCardProps {
  node: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    domain: string | null;
    tags: string[];
    icon: string | null;
    accent_bar: string | null;
    badge_color: string | null;
    color_class: string | null;
    install_count: number;
    avg_rating: number;
    rating_count: number;
    version: string;
    status: string;
    is_free?: boolean;
    price?: number;
  };
  isInstalled: boolean;
  isLoading: boolean;
  isOwner?: boolean;
  locale: string;
  onInstall: () => void;
  onUninstall: () => void;
  onClick: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  settings: <Settings className="w-4 h-4" />,
  play: <Play className="w-4 h-4 text-emerald-500" />,
  stop: <StopCircle className="w-4 h-4 text-rose-500" />,
  branch: <GitFork className="w-4 h-4 text-amber-500" />,
  data: <ArrowRightLeft className="w-4 h-4 text-sky-500" />,
  send: <Send className="w-4 h-4 text-violet-500" />,
  database: <Database className="w-4 h-4 text-violet-500" />,
  check: <CheckSquare className="w-4 h-4 text-teal-500" />,
  ai: <BrainCircuit className="w-4 h-4 text-rose-500" />,
  timer: <Clock className="w-4 h-4 text-zinc-500" />,
  loop: <RefreshCw className="w-4 h-4 text-violet-500" />,
};

export function NodePreviewCard({
  node,
  isInstalled,
  isLoading,
  isOwner,
  locale,
  onInstall,
  onUninstall,
  onClick,
}: NodePreviewCardProps) {
  const isRtl = locale === 'ar';

  const renderIcon = () => {
    const iconName = node.icon;
    if (!iconName) return <span className="text-sm uppercase font-bold">{node.name.charAt(0)}</span>;

    if (iconName.startsWith('http://') || iconName.startsWith('https://') || iconName.startsWith('/')) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconName}
          alt="icon"
          className="w-4.5 h-4.5 object-contain"
        />
      );
    }

    const mapped = iconMap[iconName];
    if (mapped) return mapped;

    return <span className="text-xs font-normal leading-none">{iconName}</span>;
  };

  const statusColors: Record<string, string> = {
    published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    under_review: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    archived: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  };

  return (
    <div
      onClick={onClick}
      className="group relative p-4 rounded-2xl border border-border/60 bg-background/80 hover:bg-muted/30 hover:border-violet-500/30 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-violet-500/5"
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${node.accent_bar || 'bg-primary'} opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="space-y-3 pt-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border border-border/30 shrink-0 overflow-hidden ${node.badge_color || 'bg-primary/10 text-primary'}`}>
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground group-hover:text-violet-400 transition-colors truncate">
                {node.name}
              </h3>
              <p className="text-[10px] text-muted-foreground/60 font-light">v{node.version}</p>
            </div>
          </div>

          {/* Install button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isInstalled) {
                onUninstall();
              } else {
                onInstall();
              }
            }}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
              isInstalled
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/25'
                : 'bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isInstalled ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                {isRtl ? 'مثبّت' : 'Installed'}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {isRtl ? 'تثبيت' : 'Install'}
              </span>
            )}
          </button>
        </div>

        {/* Description */}
        <p className="text-[11px] text-muted-foreground font-light leading-relaxed line-clamp-2">
          {node.description || (isRtl ? 'لا يوجد وصف' : 'No description')}
        </p>

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {node.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-muted/50 text-[9px] text-muted-foreground font-medium"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            {node.tags.length > 3 && (
              <span className="text-[9px] text-muted-foreground/50">+{node.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Download className="w-3 h-3" />
              <span className="font-semibold">{node.install_count}</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] text-amber-500">
              <Star className="w-3 h-3 fill-amber-500" />
              <span className="font-semibold">{Number(node.avg_rating).toFixed(1)}</span>
              <span className="text-muted-foreground/50">({node.rating_count})</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${node.badge_color || 'bg-primary/10 text-primary'}`}>
              {node.category}
            </span>
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
              node.is_free !== false
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}>
              {node.is_free !== false ? (isRtl ? 'مجاني' : 'Free') : `$${node.price || 0.00}`}
            </span>
            {isOwner && (
              <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${statusColors[node.status] || statusColors.draft}`}>
                {node.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
