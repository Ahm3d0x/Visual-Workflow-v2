'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Bot
} from 'lucide-react';
import { useDialogStore, type NotificationType } from '@/stores/dialogStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ToastItem({ 
  message, 
  type, 
  duration = 4000, 
  onDismiss 
}: { 
  id: string; 
  message: string; 
  type: NotificationType; 
  duration?: number; 
  onDismiss: () => void; 
}) {
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    if (!duration || duration <= 0) return;
    const intervalTime = 40;
    const totalSteps = duration / intervalTime;
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      const nextProgress = Math.max(0, 100 - (currentStep / totalSteps) * 100);
      setProgress(nextProgress);
      if (nextProgress <= 0) {
        clearInterval(interval);
      }
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [duration]);

  const Icon = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }[type];

  const colors = {
    success: { text: 'text-emerald-400', border: 'border-emerald-500/20 bg-zinc-950/90 text-zinc-300', bar: 'bg-emerald-500' },
    error: { text: 'text-red-400', border: 'border-red-500/20 bg-zinc-950/90 text-zinc-300', bar: 'bg-red-500' },
    warning: { text: 'text-amber-400', border: 'border-amber-500/20 bg-zinc-950/90 text-zinc-300', bar: 'bg-amber-500' },
    info: { text: 'text-sky-400', border: 'border-sky-500/20 bg-zinc-950/90 text-zinc-300', bar: 'bg-sky-500' },
  }[type];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 flex items-center justify-between gap-3 w-full',
        colors.border,
        'animate-in slide-in-from-bottom-5 fade-in duration-200'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('w-5 h-5 shrink-0', colors.text)} />
        <p className="text-xs font-semibold text-zinc-200 leading-normal">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Shrinking progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/5">
          <div
            className={cn('h-full transition-all ease-linear', colors.bar)}
            style={{ width: `${progress}%`, transitionDuration: '40ms' }}
          />
        </div>
      )}
    </div>
  );
}

export function DialogAndNotificationContainer({ locale }: { locale: string }) {
  const isRtl = locale === 'ar';
  const { 
    dialog, 
    notifications, 
    confirmDialog, 
    cancelDialog, 
    dismissNotification 
  } = useDialogStore();

  // Handle keypresses: Enter to confirm, Escape to cancel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!dialog?.isOpen) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmDialog();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelDialog();
    }
  }, [dialog, confirmDialog, cancelDialog]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* ── Custom Alert & Confirm Modals ── */}
      {dialog?.isOpen && (
        <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className={cn(
              "bg-zinc-950/95 border border-white/10 shadow-2xl rounded-2xl max-w-md w-full overflow-hidden flex flex-col p-6 font-sans relative",
              "animate-in zoom-in-95 fade-in duration-200"
            )}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Upper Accent Bar */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1",
              dialog.type === 'confirm' ? "bg-linear-to-r from-purple-500 to-sky-500" : "bg-linear-to-r from-amber-500 to-rose-500"
            )} />

            {/* Icon & Title */}
            <div className="flex items-start gap-4 mb-4 mt-2">
              <div className={cn(
                "p-2.5 rounded-xl border shrink-0",
                dialog.type === 'confirm' 
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              )}>
                {dialog.type === 'confirm' ? (
                  <Bot className="w-5 h-5 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white tracking-tight leading-tight mb-1">
                  {dialog.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                  {dialog.message}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2.5 mt-2.5 shrink-0">
              {dialog.type === 'confirm' && (
                <Button
                  variant="ghost"
                  onClick={cancelDialog}
                  className="rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white font-semibold text-xs h-9 px-4 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer"
                >
                  {dialog.cancelText || (isRtl ? 'إلغاء' : 'Cancel')}
                </Button>
              )}
              <Button
                onClick={confirmDialog}
                className={cn(
                  "rounded-xl font-bold text-xs h-9 px-4 text-white shrink-0 active:scale-95 transition-all duration-150 cursor-pointer",
                  dialog.type === 'confirm' 
                    ? "bg-linear-to-br from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 shadow-md shadow-purple-500/15" 
                    : "bg-linear-to-br from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-md shadow-rose-500/15"
                )}
              >
                {dialog.confirmText || (isRtl ? 'حسناً' : 'OK')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Toasts notifications Stack ── */}
      {notifications.length > 0 && (
        <div 
          className={cn(
            "fixed bottom-4 z-9999 flex flex-col gap-2.5 max-w-sm md:max-w-md w-full px-4",
            isRtl ? "left-0" : "right-0"
          )}
        >
          {notifications.map((notif) => (
            <ToastItem
              key={notif.id}
              id={notif.id}
              message={notif.message}
              type={notif.type}
              duration={notif.duration}
              onDismiss={() => dismissNotification(notif.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
