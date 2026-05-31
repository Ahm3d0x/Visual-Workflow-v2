'use client';

import { useState } from 'react';
import {
  X, Download, Check, Star, Tag, Package, Clock,
  Globe, Loader2,
  Settings, Play, StopCircle, GitFork, ArrowRightLeft,
  Send, Database, CheckSquare, BrainCircuit, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RatingStars } from './RatingStars';

interface NodeDetailModalProps {
  node: {
    id: string;
    name: string;
    description: string | null;
    long_description: string | null;
    category: string;
    domain: string | null;
    tags: string[];
    icon: string | null;
    accent_bar: string | null;
    badge_color: string | null;
    color_class: string | null;
    base_type: string;
    install_count: number;
    avg_rating: number;
    rating_count: number;
    version: string;
    created_at: string;
    is_free?: boolean;
    price?: number;
  };
  isInstalled: boolean;
  isLoading: boolean;
  locale: string;
  userRating?: { marketplace_node_id: string; rating: number; review: string | null };
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onRate: (rating: number, review?: string) => void;
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

export function NodeDetailModal({
  node,
  isInstalled,
  isLoading,
  locale,
  userRating,
  onClose,
  onInstall,
  onUninstall,
  onRate,
}: NodeDetailModalProps) {
  const isRtl = locale === 'ar';
  const [ratingValue, setRatingValue] = useState(userRating?.rating || 0);
  const [reviewText, setReviewText] = useState(userRating?.review || '');
  const [submittingRating, setSubmittingRating] = useState(false);

  const renderIcon = () => {
    const iconName = node.icon;
    if (!iconName) return <span className="text-lg uppercase font-bold">{node.name.charAt(0)}</span>;

    if (iconName.startsWith('http://') || iconName.startsWith('https://') || iconName.startsWith('/')) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconName}
          alt="icon"
          className="w-6 h-6 object-contain"
        />
      );
    }

    const mapped = iconMap[iconName];
    if (mapped) return mapped;

    return <span className="text-xs font-normal leading-none">{iconName}</span>;
  };

  const handleSubmitRating = async () => {
    if (ratingValue === 0) return;
    setSubmittingRating(true);
    await onRate(ratingValue, reviewText || undefined);
    setSubmittingRating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-background border border-border rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border p-6 rounded-t-3xl font-sans">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-border/40 shrink-0 overflow-hidden ${node.badge_color || 'bg-primary/10 text-primary'}`}>
                {renderIcon()}
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">{node.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${node.badge_color || 'bg-primary/10 text-primary'}`}>
                    {node.category}
                  </span>
                  {node.domain && (
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                      <Globe className="w-2.5 h-2.5" /> {node.domain}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    node.is_free !== false
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {node.is_free !== false ? (isRtl ? 'مجاني' : 'Free') : `$${node.price || 0.00}`}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">v{node.version}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-5 mt-4">
            <span className="flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">{node.install_count}</span>
              <span className="text-muted-foreground font-light">{isRtl ? 'تثبيت' : 'installs'}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="font-bold">{Number(node.avg_rating).toFixed(1)}</span>
              <span className="text-muted-foreground font-light">({node.rating_count} {isRtl ? 'تقييم' : 'ratings'})</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {new Date(node.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">{isRtl ? 'الوصف' : 'Description'}</h3>
            <p className="text-sm text-muted-foreground font-light leading-relaxed whitespace-pre-line">
              {node.long_description || node.description || (isRtl ? 'لا يوجد وصف مفصل.' : 'No detailed description available.')}
            </p>
          </div>

          {/* Tags */}
          {node.tags && node.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                {isRtl ? 'التصنيفات' : 'Tags'}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/50 text-[11px] text-muted-foreground font-medium border border-border/20"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Technical Info */}
          <div className="space-y-2 bg-muted/20 p-4 rounded-2xl border border-border/20">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              {isRtl ? 'معلومات تقنية' : 'Technical Info'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground/60 block">{isRtl ? 'النوع الأساسي' : 'Base Type'}</span>
                <span className="font-semibold capitalize">{node.base_type}</span>
              </div>
              <div>
                <span className="text-muted-foreground/60 block">{isRtl ? 'الفئة' : 'Category'}</span>
                <span className="font-semibold capitalize">{node.category}</span>
              </div>
            </div>
          </div>

          {/* Install action */}
          <div className="pt-2">
            <Button
              onClick={isInstalled ? onUninstall : onInstall}
              disabled={isLoading}
              className={`w-full py-5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                isInstalled
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/30'
                  : 'bg-violet-600 hover:bg-violet-600/90 text-white shadow-lg shadow-violet-600/20'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isInstalled ? (
                <span className="flex items-center gap-2 justify-center">
                  <Check className="w-4 h-4" />
                  {isRtl ? 'مثبّت — اضغط لإلغاء التثبيت' : 'Installed — Click to Uninstall'}
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <Download className="w-4 h-4" />
                  {isRtl ? 'تثبيت هذا النود' : 'Install This Node'}
                </span>
              )}
            </Button>
          </div>

          {/* Rating Section */}
          <div className="space-y-3 pt-4 border-t border-border/30">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              {isRtl ? 'تقييمك' : 'Your Rating'}
            </h3>

            <div className="space-y-3">
              <RatingStars value={ratingValue} onChange={setRatingValue} size="lg" />

              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={isRtl ? 'اكتب مراجعتك (اختياري)...' : 'Write your review (optional)...'}
                rows={3}
                className="rounded-xl border-border text-xs font-light focus:ring-violet-500"
              />

              <Button
                onClick={handleSubmitRating}
                disabled={ratingValue === 0 || submittingRating}
                className="bg-amber-500 hover:bg-amber-500/90 text-white rounded-xl px-5 font-semibold text-xs cursor-pointer"
              >
                {submittingRating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  isRtl ? 'إرسال التقييم' : 'Submit Rating'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
