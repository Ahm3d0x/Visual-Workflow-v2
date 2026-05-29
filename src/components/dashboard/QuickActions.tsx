'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, FileJson, Layout, Loader2 } from 'lucide-react';

interface QuickActionsProps {
  workspaceId: string;
  locale: string;
}

export function QuickActions({ workspaceId, locale }: QuickActionsProps) {
  const isRtl = locale === 'ar';
  const router = useRouter();
  const t = useTranslations('dashboard');
  const supabase = createClient();

  // Modals state
  const [workflowOpen, setWorkflowOpen] = useState(false);

  // Workflow Form State
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfTemplate, setWfTemplate] = useState('blank');
  const [wfLoading, setWfLoading] = useState(false);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfName.trim()) return;

    setWfLoading(true);
    const { data: userData } = await supabase.auth.getUser();

    // Insert new workflow record in public.workflows
    const { data, error } = await (supabase
      .from('workflows')
      .insert({
        workspace_id: workspaceId,
        name: wfName.trim(),
        description: wfDesc.trim() || null,
        status: 'draft',
        node_count: wfTemplate === 'blank' ? 0 : 3,
        created_by: userData.user?.id || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select('id')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as any);

    if (error) {
      alert('Failed to create workflow: ' + error.message);
      setWfLoading(false);
    } else if (data) {
      // Insert mock preset nodes
      if (wfTemplate !== 'blank') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('workflow_nodes') as any).insert([
          { workflow_id: data.id, type: 'start', position: { x: 100, y: 150 }, data: { label: isRtl ? 'مُشغل البداية' : 'Start Trigger' } },
          { workflow_id: data.id, type: 'process', position: { x: 300, y: 150 }, data: { label: isRtl ? 'إجراء معالجة' : 'Process Action' } },
          { workflow_id: data.id, type: 'end', position: { x: 500, y: 150 }, data: { label: isRtl ? 'خطوة النهاية' : 'End Step' } },
        ]);
      }

      setWorkflowOpen(false);
      setWfLoading(false);
      setWfName('');
      setWfDesc('');
      router.push(`/workflows/${data.id}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-background/40 border border-border backdrop-blur-md p-4 rounded-2xl shadow-sm font-sans">
      {/* 1. Create Workflow Trigger Dialog */}
      <Dialog open={workflowOpen} onOpenChange={setWorkflowOpen}>
        <DialogTrigger className="inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer gap-2 focus:outline-hidden text-sm">
          <Plus className="w-5 h-5" />
          <span>{t('new_workflow')}</span>
        </DialogTrigger>
        <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-md p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{isRtl ? 'إنشاء سير عمل جديد' : 'Create Workflow'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWorkflow} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wfName" className="font-semibold text-sm">
                {isRtl ? 'الاسم' : 'Name'}
              </Label>
              <Input
                id="wfName"
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                placeholder={isRtl ? 'اسم سير العمل' : 'Workflow name'}
                required
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wfDesc" className="font-semibold text-sm">
                {isRtl ? 'الوصف' : 'Description'}
              </Label>
              <Textarea
                id="wfDesc"
                value={wfDesc}
                onChange={(e) => setWfDesc(e.target.value)}
                placeholder={isRtl ? 'وصف خطوات سير العمل (اختياري)' : 'Description of workflow steps (optional)'}
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">{isRtl ? 'قالب البداية' : 'Starting Template'}</Label>
              <Select value={wfTemplate} onValueChange={(val) => setWfTemplate(val || 'blank')}>
                <SelectTrigger className="rounded-xl border-border">
                  <SelectValue placeholder={isRtl ? 'اختر قالباً' : 'Select template'} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border rounded-xl">
                  <SelectItem value="blank" className="cursor-pointer">{isRtl ? 'لوحة عمل فارغة (خالية)' : 'Blank Canvas (empty)'}</SelectItem>
                  <SelectItem value="basic" className="cursor-pointer">{isRtl ? 'مسار أساسي (٣ عقد)' : 'Basic Pipeline (3 nodes)'}</SelectItem>
                  <SelectItem value="ai" className="cursor-pointer">{isRtl ? 'مسار وكيل ذكاء اصطناعي (مسبق الضبط)' : 'AI Agent Route (Presets)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setWorkflowOpen(false)} className="rounded-xl border-border cursor-pointer">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={wfLoading || !wfName.trim()} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 cursor-pointer">
                {wfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? 'إنشاء' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
 
      {/* 3. Demo placeholders */}
      <Button variant="ghost" disabled className="text-muted-foreground opacity-60 font-medium rounded-xl flex items-center gap-2">
        <FileJson className="w-4 h-4" />
        <span>{isRtl ? 'استيراد ملف JSON' : 'Import JSON'}</span>
      </Button>
      <Button variant="ghost" disabled className="text-muted-foreground opacity-60 font-medium rounded-xl flex items-center gap-2">
        <Layout className="w-4 h-4" />
        <span>{isRtl ? 'تصفح المعرض' : 'Browse Gallery'}</span>
      </Button>
    </div>
  );
}
