'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GitBranch, Sparkles, Users, Layers, Award, ChevronDown } from 'lucide-react';
import { useParams } from 'next/navigation';

interface StatsBarProps {
  stats: {
    workflowsCount: number;
    customNodesCount: number;
    membersCount: number;
    aiCreditsUsed: number;
    plan: string;
    trialDaysRemaining: number;
  };
}

export function StatsBar({ stats }: StatsBarProps) {
  const [showMobileStats, setShowMobileStats] = useState(false);
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRtl = locale === 'ar';

  // Plan limits mapping based on standard tiers
  const planLimits: Record<string, { workflows: number; nodes: number; members: number; ai: number }> = {
    free: { workflows: 3, nodes: 2, members: 1, ai: 10 },
    warrior: { workflows: 10, nodes: 5, members: 2, ai: 50 },
    elite: { workflows: 25, nodes: 10, members: 5, ai: 200 },
    champion: { workflows: 100, nodes: 25, members: 10, ai: 1000 },
    legend: { workflows: 1000, nodes: 100, members: 50, ai: 10000 },
  };

  const limits = planLimits[stats.plan.toLowerCase()] || planLimits.free;

  const metrics = [
    {
      title: isRtl ? 'مخططات العمل' : 'Workflows',
      current: stats.workflowsCount,
      limit: limits.workflows,
      icon: GitBranch,
      color: 'text-node-data bg-node-data/10',
      glow: 'hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.06)]',
      progressBg: 'bg-blue-500',
    },
    {
      title: isRtl ? 'العناصر المخصصة' : 'Custom Elements',
      current: stats.customNodesCount,
      limit: limits.nodes,
      icon: Layers,
      color: 'text-node-ai bg-node-ai/10',
      glow: 'hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(124,58,237,0.06)]',
      progressBg: 'bg-purple-500',
    },
    {
      title: isRtl ? 'المتعاونون' : 'Collaborators',
      current: stats.membersCount,
      limit: limits.members,
      icon: Users,
      color: 'text-node-integration bg-node-integration/10',
      glow: 'hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)]',
      progressBg: 'bg-emerald-500',
    },
    {
      title: isRtl ? 'رصيد الذكاء الاصطناعي المستخدم' : 'AI Credits Used',
      current: stats.aiCreditsUsed,
      limit: limits.ai,
      icon: Sparkles,
      color: 'text-node-logic bg-node-logic/10',
      glow: 'hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)]',
      progressBg: 'bg-amber-500',
    },
  ];

  const getProgressColor = (percent: number, baseColorClass: string) => {
    if (percent >= 95) return 'bg-destructive';
    if (percent >= 80) return 'bg-node-logic';
    return baseColorClass;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Trial / Active Plan Banner */}
      {stats.trialDaysRemaining > 0 && (
        <div className="relative bg-zinc-950 border border-zinc-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden group">
          {/* Moving background glow effect */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl -z-10 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-linear-to-tr from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex items-center gap-4 text-center md:text-start z-10">
            <div className="bg-white/5 border border-white/10 p-3 rounded-full flex items-center justify-center relative shrink-0">
              <span className="absolute inset-0 bg-yellow-400/20 blur-sm rounded-full animate-pulse" />
              <Award className="w-8 h-8 text-yellow-300 relative animate-bounce" />
            </div>
            <div className="text-left rtl:text-right">
              <h3 className="font-extrabold text-lg text-zinc-100 flex items-center gap-2 flex-wrap">
                {isRtl ? '🎉 أنت في فترة تجريبية نشطة لباقة Legend!' : "🎉 You're on an active Legend trial!"}
              </h3>
              <p className="text-sm font-light text-zinc-400 mt-1 max-w-xl leading-relaxed">
                {isRtl ? 'لديك وصول غير محدود إلى جميع محرري اللوحات النخبة، ومصممي العناصر المخصصة، ولوحات اللعب المتعدد في الوقت الفعلي.' : 'You have unrestricted access to all elite canvas editors, custom element designers, and real-time multiplayer boards.'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-start z-10">
            <span className="font-bold text-xs bg-white/5 border border-white/10 text-zinc-200 px-4 py-2.5 rounded-xl">
              {isRtl ? `متبقي ${stats.trialDaysRemaining} أيام` : `${stats.trialDaysRemaining} days remaining`}
            </span>
            <button className="bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 transition-all duration-300 hover:scale-[1.03] cursor-pointer text-sm">
              {isRtl ? 'الترقية الآن' : 'Upgrade Now'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Mobile Collapsed Plan Trigger */}
      <div className="md:hidden">
        <div className="bg-background/60 border border-border backdrop-blur-md p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-left rtl:text-right">
              <span className="text-xs text-muted-foreground block font-light">{isRtl ? 'خطة مساحة العمل' : 'Workspace Plan'}</span>
              <span className="text-sm font-bold capitalize text-foreground">{isRtl ? `فئة ${stats.plan.toUpperCase()}` : `${stats.plan} Tier`}</span>
            </div>
          </div>
          <button
            onClick={() => setShowMobileStats(!showMobileStats)}
            className="text-xs font-bold text-accent flex items-center gap-1 hover:underline cursor-pointer py-1.5 px-3 rounded-lg hover:bg-accent/5 transition-colors focus:outline-hidden"
          >
            {showMobileStats ? (isRtl ? 'إخفاء الحدود' : 'Hide Limits') : (isRtl ? 'استخدام الباقة' : 'Plan Usage')}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showMobileStats ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Mobile stats deck accordion */}
        {showMobileStats && (
          <div className="grid grid-cols-1 gap-3 mt-3 animate-in fade-in slide-in-from-top-4 duration-300">
            {metrics.map((metric, idx) => {
              const percent = Math.min((metric.current / metric.limit) * 100, 100);
              return (
                <Card key={idx} className="bg-background/40 border border-border/80 backdrop-blur-xs rounded-xl shadow-xs">
                  <div className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${metric.color}`}>
                        <metric.icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold text-muted-foreground font-sans block">{metric.title}</span>
                        <span className="text-sm font-bold font-sans tracking-tight">
                          {metric.current} <span className="text-xs font-light text-muted-foreground">/ {metric.limit}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 w-24">
                      <span className="text-[10px] text-muted-foreground font-medium">{Math.round(percent)}%</span>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percent, metric.progressBg)}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Desktop Metrics Deck */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          const percent = Math.min((metric.current / metric.limit) * 100, 100);
          return (
            <Card key={idx} className={`bg-background/60 border border-border backdrop-blur-md shadow-xs rounded-2xl transition-all duration-300 ${metric.glow} group hover:-translate-y-1`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-bold text-muted-foreground font-sans">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-xl transition-all group-hover:scale-110 duration-300 ${metric.color}`}>
                  <metric.icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold font-sans tracking-tight">
                    {metric.current} <span className="text-sm font-light text-muted-foreground">/ {metric.limit}</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {Math.round(percent)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percent, metric.progressBg)}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
