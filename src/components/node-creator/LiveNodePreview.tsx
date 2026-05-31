'use client';

import {
  Settings, Play, StopCircle, GitFork,
  ArrowRightLeft, Send, Database, CheckSquare,
  BrainCircuit, Clock, RefreshCw, Eye
} from 'lucide-react';

interface LiveNodePreviewProps {
  name: string;
  description: string;
  category: string;
  iconName: string;
  colorPreset: {
    colorClass: string;
    accentBar: string;
    badgeColor: string;
  };
  locale: string;
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

export function LiveNodePreview({
  name,
  description,
  category,
  iconName,
  colorPreset,
  locale,
}: LiveNodePreviewProps) {
  const isRtl = locale === 'ar';

  const renderIcon = () => {
    if (!iconName) return <Settings className="w-4 h-4" />;
    
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

  const icon = renderIcon();

  return (
    <div className="bg-background/80 border border-border/40 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <Eye className="w-3.5 h-3.5 text-fuchsia-400" />
        {isRtl ? 'معاينة حية' : 'Live Preview'}
      </div>

      {/* Dark canvas simulation */}
      <div className="bg-zinc-950/60 p-8 rounded-2xl border border-border/20 flex items-center justify-center min-h-[200px] relative overflow-hidden">
        {/* Grid dots */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, #666 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />

        {/* Node preview */}
        <div className={`min-w-[200px] max-w-[260px] rounded-2xl border transition-all shadow-lg relative bg-background/90 ${colorPreset.colorClass} scale-100`}>
          {/* Accent bar */}
          <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-md ${colorPreset.accentBar}`} />

          {/* Input handle */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-900 shadow-sm" />

          <div className="p-4 pl-5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center border border-border/30 shrink-0">
                {icon}
              </div>
              <h4 className="font-bold text-xs text-foreground line-clamp-1 leading-tight">
                {name || (isRtl ? 'اسم النود' : 'Node Name')}
              </h4>
            </div>
            <p className="text-[10px] font-light text-muted-foreground line-clamp-2 leading-relaxed">
              {description || (isRtl ? 'أضف وصفاً للنود...' : 'Add a node description...')}
            </p>
            <div className="mt-2.5 flex items-center justify-between">
              <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${colorPreset.badgeColor}`}>
                {category}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/40">node_1</span>
            </div>
          </div>

          {/* Output handle */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-zinc-900 shadow-sm" />
        </div>
      </div>

      {/* Quick info */}
      <div className="text-[10px] text-muted-foreground/50 text-center font-light">
        {isRtl ? 'هذه المعاينة تتحدث فوراً مع التغييرات' : 'This preview updates live with your changes'}
      </div>
    </div>
  );
}
