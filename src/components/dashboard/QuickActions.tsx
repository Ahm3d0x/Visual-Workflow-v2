/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef } from 'react';
import { useDialogStore } from '@/stores/dialogStore';
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
import { Plus, FileJson, Layout, Loader2, Sparkles, BookOpen, Info, ChevronRight, Presentation } from 'lucide-react';

interface QuickActionsProps {
  workspaceId: string;
  locale: string;
}

interface GalleryTemplate {
  id: string;
  name: string;
  nameAr: string;
  desc: string;
  descAr: string;
  badge: string;
  badgeAr: string;
  colorClass: string;
  nodes: { type: string; position: { x: number; y: number }; data: Record<string, any> }[];
  edges: { sourceIndex: number; targetIndex: number; sourceHandle?: string; targetHandle?: string }[];
}

const GALLERY_TEMPLATES: GalleryTemplate[] = [
  {
    id: 'ai_chatbot',
    name: 'AI Agent Customer Assistant',
    nameAr: 'مساعد خدمة العملاء بالذكاء الاصطناعي',
    desc: 'Automates client request parsing, routes through AI Classifier, and triggers notifications via Email & Slack.',
    descAr: 'أتمتة تحليل طلبات العملاء وتصنيفها بالذكاء الاصطناعي وتنبيه الفريق عبر Slack والبريد الإلكتروني.',
    badge: 'AI & Automation',
    badgeAr: 'ذكاء اصطناعي وأتمتة',
    colorClass: 'from-pink-500/10 to-rose-500/10 border-rose-500/20 text-rose-400',
    nodes: [
      { type: 'start', position: { x: 100, y: 200 }, data: { label: 'Client Email Received / استقبال إيميل العميل' } },
      { type: 'ai_classify', position: { x: 300, y: 200 }, data: { label: 'AI Sentiment Classifier / مصنف المشاعر' } },
      { type: 'if_else', position: { x: 520, y: 200 }, data: { label: 'Is Urgent? / هل هو عاجل؟' } },
      { type: 'slack', position: { x: 740, y: 100 }, data: { label: 'Slack Alert to On-Call / تنبيه Slack' } },
      { type: 'email', position: { x: 740, y: 300 }, data: { label: 'Auto-Reply Acknowledgement / رد تلقائي' } },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1, sourceHandle: 'out', targetHandle: 'in' },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'out', targetHandle: 'in' },
      { sourceIndex: 2, targetIndex: 3, sourceHandle: 'out_true', targetHandle: 'in' },
      { sourceIndex: 2, targetIndex: 4, sourceHandle: 'out_false', targetHandle: 'in' },
    ],
  },
  {
    id: 'lead_nurturing',
    name: 'SaaS Lead Scoring & CRM Sync',
    nameAr: 'تقييم العملاء المحتملين ومزامنة CRM',
    desc: 'Captures new sign-ups, checks database history, applies lead scoring logic, and syncs automatically with CRM.',
    descAr: 'تسجيل الاشتراكات الجديدة، التحقق من قاعدة البيانات، تطبيق تقييم العملاء والمزامنة التلقائية مع لوحة CRM.',
    badge: 'Marketing & CRM',
    badgeAr: 'تسويق ومزامنة CRM',
    colorClass: 'from-blue-500/10 to-indigo-500/10 border-indigo-500/20 text-indigo-400',
    nodes: [
      { type: 'form_step', position: { x: 100, y: 200 }, data: { label: 'New Signup Form / استمارة تسجيل جديدة' } },
      { type: 'database', position: { x: 320, y: 200 }, data: { label: 'Fetch User Profile / جلب بيانات البروفايل' } },
      { type: 'transform', position: { x: 540, y: 200 }, data: { label: 'Calculate Lead Score / احتساب نقاط العميل' } },
      { type: 'crm', position: { x: 760, y: 200 }, data: { label: 'Sync with CRM Hub / مزامنة مع لوحة CRM' } },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1, sourceHandle: 'out', targetHandle: 'in' },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'out', targetHandle: 'in' },
      { sourceIndex: 2, targetIndex: 3, sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'data_pipeline',
    name: 'Scheduled Sheets to Database ETL',
    nameAr: 'مزامنة وتطهير البيانات المجدولة',
    desc: 'Runs on a cron timer, extracts Google Sheets records, filters and validates columns, and upserts into Postgres table.',
    descAr: 'تشغيل مجدول تلقائي، استخراج صفوف Google Sheets، تطهير البيانات وتحديث قاعدة بيانات Postgres.',
    badge: 'Data Pipeline',
    badgeAr: 'خط معالجة البيانات',
    colorClass: 'from-amber-500/10 to-orange-500/10 border-orange-500/20 text-orange-400',
    nodes: [
      { type: 'timer', position: { x: 100, y: 200 }, data: { label: 'Trigger Every 24h / تشغيل كل ٢٤ ساعة' } },
      { type: 'google_sheets', position: { x: 320, y: 200 }, data: { label: 'Fetch New Rows / جلب صفوف Sheets' } },
      { type: 'filter', position: { x: 540, y: 200 }, data: { label: 'Validate Columns / التحقق وتطهير البيانات' } },
      { type: 'database', position: { x: 760, y: 200 }, data: { label: 'Upsert into Postgres / تحديث قاعدة البيانات' } },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1, sourceHandle: 'out', targetHandle: 'in' },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'out', targetHandle: 'in' },
      { sourceIndex: 2, targetIndex: 3, sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'document_approval',
    name: 'Document Review & Approval Flow',
    nameAr: 'مسار مراجعة واعتماد المستندات',
    desc: 'Requires human approval on uploaded files, routes dynamically, and updates status values upon review comments.',
    descAr: 'طلب مراجعة واعتماد بشري على الملفات المرفوعة، توجيه ديناميكي وتحديث الحالات فور كتابة تعليق المراجعة.',
    badge: 'Operations',
    badgeAr: 'عمليات وتنسيق',
    colorClass: 'from-teal-500/10 to-emerald-500/10 border-emerald-500/20 text-emerald-400',
    nodes: [
      { type: 'file_upload', position: { x: 100, y: 200 }, data: { label: 'Contract PDF Uploaded / رفع العقد بصيغة PDF' } },
      { type: 'approval', position: { x: 320, y: 200 }, data: { label: 'Manager Review & Approval / مراجعة واعتماد المدير' } },
      { type: 'if_else', position: { x: 540, y: 200 }, data: { label: 'Is Approved? / هل تمت الموافقة؟' } },
      { type: 'webhook', position: { x: 760, y: 100 }, data: { label: 'Trigger Finance Webhook / تشغيل فينيانس ويبهوك' } },
      { type: 'sms', position: { x: 760, y: 300 }, data: { label: 'Notify Submitter to Revise / إشعار مقدم الطلب' } },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1, sourceHandle: 'out', targetHandle: 'in' },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'out', targetHandle: 'in' },
      { sourceIndex: 2, targetIndex: 3, sourceHandle: 'out_true', targetHandle: 'in' },
      { sourceIndex: 2, targetIndex: 4, sourceHandle: 'out_false', targetHandle: 'in' },
    ],
  }
];

export function QuickActions({ workspaceId, locale }: QuickActionsProps) {
  const isRtl = locale === 'ar';
  const router = useRouter();
  const t = useTranslations('dashboard');
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [wbOpen, setWbOpen] = useState(false);

  // Form State
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfTemplate, setWfTemplate] = useState('blank');
  const [wfLoading, setWfLoading] = useState(false);

  const [wbName, setWbName] = useState('');
  const [wbDesc, setWbDesc] = useState('');
  const [wbBg, setWbBg] = useState('#ffffff');

  // ─── Native Workflow Creation ──────────────────────────────────────────────
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
      } as any)
      .select('id')
      .single() as any);

    if (error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في إنشاء سير العمل' : 'Workflow Creation Error',
        (isRtl ? 'فشل إنشاء سير العمل: ' : 'Failed to create workflow: ') + error.message,
        isRtl ? 'حسناً' : 'OK'
      );
      setWfLoading(false);
    } else if (data) {
      // Insert mock preset nodes
      if (wfTemplate !== 'blank') {
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

  // ─── Native Whiteboard Creation ──────────────────────────────────────────────
  const handleCreateWhiteboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wbName.trim()) return;

    setWfLoading(true);
    const { data: userData } = await supabase.auth.getUser();

    // Insert new whiteboard record in public.workflows
    const { data, error } = await (supabase
      .from('workflows')
      .insert({
        workspace_id: workspaceId,
        name: wbName.trim(),
        description: wbDesc.trim() || null,
        status: 'draft',
        is_whiteboard: true,
        board_data: {
          boardStrokes: [],
          boardBg: wbBg,
          boardSheets: [],
          isSheetsMode: false
        },
        created_by: userData.user?.id || null,
      } as any)
      .select('id')
      .single() as any);

    if (error) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في إنشاء اللوحة البيضاء' : 'Whiteboard Creation Error',
        (isRtl ? 'فشل إنشاء اللوحة البيضاء: ' : 'Failed to create whiteboard: ') + error.message,
        isRtl ? 'حسناً' : 'OK'
      );
      setWfLoading(false);
    } else if (data) {
      setWbOpen(false);
      setWfLoading(false);
      setWbName('');
      setWbDesc('');
      router.push(`/whiteboards/${data.id}`);
    }
  };

  // ─── Import Workflow from JSON ─────────────────────────────────────────────
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.nodes || !Array.isArray(importData.nodes)) {
        useDialogStore.getState().showAlert(
          isRtl ? 'ملف غير صالح' : 'Invalid File',
          isRtl ? 'ملف JSON غير صالح: مصفوفة العقد مفقودة.' : 'Invalid JSON file: nodes array is missing.',
          isRtl ? 'حسناً' : 'OK'
        );
        return;
      }

      setWfLoading(true);
      const { data: userData } = await supabase.auth.getUser();

      const workflowName = importData.name || file.name.replace('.json', '');
      const { data: workflow, error: wfError } = await (supabase
        .from('workflows')
        .insert({
          workspace_id: workspaceId,
          name: workflowName.trim(),
          description: importData.description || (isRtl ? 'مستورد من ملف JSON' : 'Imported from JSON file'),
          status: 'draft',
          node_count: importData.nodes.length,
          created_by: userData.user?.id || null,
        } as any)
        .select('id')
        .single() as any);

      if (wfError || !workflow) {
        useDialogStore.getState().showAlert(
          isRtl ? 'خطأ في الاستيراد' : 'Import Error',
          (isRtl ? 'فشل إنشاء سير العمل المستورد: ' : 'Failed to create imported workflow: ') + wfError?.message,
          isRtl ? 'حسناً' : 'OK'
        );
        setWfLoading(false);
        return;
      }

      // Insert imported nodes (mapping original IDs to new unique UUIDs)
      const nodeIdMap: Record<string, string> = {};
      const nodesToInsert = importData.nodes.map((n: any) => {
        const newId = crypto.randomUUID();
        nodeIdMap[n.id] = newId;
        return {
          id: newId,
          workflow_id: workflow.id,
          type: n.type,
          position: n.position || { x: 100, y: 100 },
          data: n.data || {},
          style: n.style || {},
        };
      });

      const { error: nodesError } = await (supabase
        .from('workflow_nodes') as any)
        .insert(nodesToInsert);

      if (nodesError) {
        useDialogStore.getState().showAlert(
          isRtl ? 'خطأ في استيراد العقد' : 'Node Import Error',
          (isRtl ? 'فشل استيراد العقد: ' : 'Failed to import nodes: ') + nodesError.message,
          isRtl ? 'حسناً' : 'OK'
        );
        setWfLoading(false);
        return;
      }

      // Insert imported edges (mapping source and target to the new node UUIDs)
      if (importData.edges && Array.isArray(importData.edges) && importData.edges.length > 0) {
        const edgesToInsert = importData.edges
          .map((e: any) => {
            const sourceId = nodeIdMap[e.source];
            const targetId = nodeIdMap[e.target];
            if (!sourceId || !targetId) return null;
            return {
              workflow_id: workflow.id,
              source_node_id: sourceId,
              target_node_id: targetId,
              source_handle: e.sourceHandle || null,
              target_handle: e.targetHandle || null,
              data: e.data || {},
            };
          })
          .filter(Boolean);

        if (edgesToInsert.length > 0) {
          const { error: edgesError } = await (supabase
            .from('workflow_edges') as any)
            .insert(edgesToInsert);

          if (edgesError) {
            console.error('Failed to import edges:', edgesError.message);
          }
        }
      }

      setWfLoading(false);
      if (e.target) e.target.value = '';
      router.push(`/workflows/${workflow.id}`);
    } catch (err) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في قراءة الملف' : 'File Read Error',
        (isRtl ? 'حدث خطأ أثناء قراءة الملف: ' : 'Error reading file: ') + (err as Error).message,
        isRtl ? 'حسناً' : 'OK'
      );
      setWfLoading(false);
    }
  };

  // ─── Load Gallery Template ──────────────────────────────────────────────────
  const handleLoadTemplate = async (template: GalleryTemplate) => {
    setWfLoading(true);
    const { data: userData } = await supabase.auth.getUser();

    // Create a new workflow record
    const { data, error } = await (supabase
      .from('workflows')
      .insert({
        workspace_id: workspaceId,
        name: isRtl ? template.nameAr : template.name,
        description: isRtl ? template.descAr : template.desc,
        status: 'draft',
        node_count: template.nodes.length,
        created_by: userData.user?.id || null,
      } as any)
      .select('id')
      .single() as any);

    if (error || !data) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في إنشاء القالب' : 'Template Creation Error',
        (isRtl ? 'فشل إنشاء سير العمل من القالب: ' : 'Failed to create workflow from template: ') + error?.message,
        isRtl ? 'حسناً' : 'OK'
      );
      setWfLoading(false);
      return;
    }

    // Insert nodes (generating new UUIDs and mapping original indexes to UUIDs)
    const nodeIdList: string[] = [];
    const nodesToInsert = template.nodes.map((n) => {
      const newId = crypto.randomUUID();
      nodeIdList.push(newId);
      return {
        id: newId,
        workflow_id: data.id,
        type: n.type,
        position: n.position,
        data: n.data,
      };
    });

    const { error: nodesError } = await (supabase
      .from('workflow_nodes') as any)
      .insert(nodesToInsert);

    if (nodesError) {
      useDialogStore.getState().showAlert(
        isRtl ? 'خطأ في استيراد عقد القالب' : 'Template Node Import Error',
        (isRtl ? 'فشل استيراد عقد القالب: ' : 'Failed to import template nodes: ') + nodesError.message,
        isRtl ? 'حسناً' : 'OK'
      );
      setWfLoading(false);
      return;
    }

    // Insert edges (mapping sourceIndex and targetIndex to generated UUIDs)
    const edgesToInsert = template.edges.map((e) => {
      const sourceId = nodeIdList[e.sourceIndex];
      const targetId = nodeIdList[e.targetIndex];
      return {
        workflow_id: data.id,
        source_node_id: sourceId,
        target_node_id: targetId,
        source_handle: e.sourceHandle || null,
        target_handle: e.targetHandle || null,
        data: {},
      };
    });

    if (edgesToInsert.length > 0) {
      const { error: edgesError } = await (supabase
        .from('workflow_edges') as any)
        .insert(edgesToInsert);

      if (edgesError) {
        console.error('Failed to import template edges:', edgesError.message);
      }
    }

    setGalleryOpen(false);
    setWfLoading(false);
    router.push(`/workflows/${data.id}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-card/45 border border-border backdrop-blur-md p-4 rounded-2xl shadow-xs transition-all duration-300 hover:border-accent/20 font-sans">
      {/* Hidden File Input for JSON Import */}
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleImportJson}
        className="hidden"
        suppressHydrationWarning
      />

      {/* 1. Create Workflow Trigger Dialog */}
      <Dialog open={workflowOpen} onOpenChange={setWorkflowOpen}>
        <DialogTrigger className="inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/20 cursor-pointer gap-2 focus:outline-hidden text-sm h-10 select-none">
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

      {/* 1b. Create Whiteboard Trigger Dialog */}
      <Dialog open={wbOpen} onOpenChange={setWbOpen}>
        <DialogTrigger className="inline-flex items-center justify-center bg-secondary hover:bg-secondary/95 text-secondary-foreground font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer gap-2 focus:outline-hidden text-sm h-10 border border-border select-none">
          <Presentation className="w-4 h-4 text-emerald-500" />
          <span>{isRtl ? 'لوحة بيضاء جديدة' : 'New Whiteboard'}</span>
        </DialogTrigger>
        <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-md p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{isRtl ? 'إنشاء لوحة بيضاء جديدة' : 'Create Whiteboard'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWhiteboard} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wbName" className="font-semibold text-sm">
                {isRtl ? 'الاسم' : 'Name'}
              </Label>
              <Input
                id="wbName"
                value={wbName}
                onChange={(e) => setWbName(e.target.value)}
                placeholder={isRtl ? 'اسم اللوحة البيضاء' : 'Whiteboard name'}
                required
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wbDesc" className="font-semibold text-sm">
                {isRtl ? 'الوصف' : 'Description'}
              </Label>
              <Textarea
                id="wbDesc"
                value={wbDesc}
                onChange={(e) => setWbDesc(e.target.value)}
                placeholder={isRtl ? 'وصف للوحة البيضاء (اختياري)' : 'Description of the whiteboard (optional)'}
                className="rounded-xl border-border focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">{isRtl ? 'لون الخلفية الافتراضي' : 'Default Background'}</Label>
              <Select value={wbBg} onValueChange={(val) => setWbBg(val || '#ffffff')}>
                <SelectTrigger className="rounded-xl border-border">
                  <SelectValue placeholder={isRtl ? 'اختر لون الخلفية' : 'Select background'} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border rounded-xl">
                  <SelectItem value="#ffffff" className="cursor-pointer">{isRtl ? 'أبيض (White)' : 'White'}</SelectItem>
                  <SelectItem value="#121212" className="cursor-pointer">{isRtl ? 'أسود (Black)' : 'Black'}</SelectItem>
                  <SelectItem value="#f8f9fa" className="cursor-pointer">{isRtl ? 'رمادي فاتح (Light Gray)' : 'Light Gray'}</SelectItem>
                  <SelectItem value="#e7f5ff" className="cursor-pointer">{isRtl ? 'أزرق فاتح (Light Blue)' : 'Light Blue'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setWbOpen(false)} className="rounded-xl border-border cursor-pointer">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={wfLoading || !wbName.trim()} className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 cursor-pointer">
                {wfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRtl ? 'إنشاء' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Import JSON Feature */}
      <Button
        variant="ghost"
        onClick={() => !wfLoading && fileInputRef.current?.click()}
        disabled={wfLoading}
        className="text-muted-foreground hover:text-foreground font-semibold rounded-xl flex items-center gap-2 cursor-pointer h-10 border border-transparent hover:border-border/30 hover:bg-muted/40 transition-all duration-200 select-none"
      >
        {wfLoading ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <FileJson className="w-4 h-4 text-sky-500" />}
        <span>{isRtl ? 'استيراد ملف JSON' : 'Import JSON'}</span>
      </Button>

      {/* 3. Workflow Gallery Template Selector Dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogTrigger className="text-muted-foreground hover:text-foreground font-semibold rounded-xl flex items-center gap-2 cursor-pointer h-10 border border-transparent hover:border-border/30 hover:bg-muted/40 px-3 transition-all duration-200 select-none">
          <Layout className="w-4 h-4 text-purple-500" />
          <span>{isRtl ? 'تصفح المعرض' : 'Browse Gallery'}</span>
        </DialogTrigger>
        <DialogContent className="bg-zinc-950 border border-white/8 rounded-3xl shadow-2xl max-w-4xl p-6 font-sans overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="flex-row items-center gap-3 border-b border-white/6 pb-4 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <span>{isRtl ? 'معرض نماذج سير العمل' : 'Workflow Templates Gallery'}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/10">
                  {isRtl ? 'جاهز للاستخدام' : 'Production Ready'}
                </span>
              </DialogTitle>
              <p className="text-xs text-zinc-500 mt-0.5 font-light">
                {isRtl
                  ? 'اختر من بين القوالب المسبقة والمعدة باحترافية للبدء فوراً وتوفير الوقت.'
                  : 'Kickstart your workflow pipeline with professional pre-built automation blueprints in one click.'}
              </p>
            </div>
          </DialogHeader>

          {/* Grid layout cards */}
          <div className="overflow-y-auto py-6 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 pr-1" dir={isRtl ? 'rtl' : 'ltr'}>
            {GALLERY_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => !wfLoading && handleLoadTemplate(tmpl)}
                className="group relative border border-white/6 bg-white/2 hover:bg-white/4 rounded-2xl p-5 cursor-pointer flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:border-purple-500/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.08)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-linear-to-r ${tmpl.colorClass}`}>
                      {isRtl ? tmpl.badgeAr : tmpl.badge}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-400 transition-colors">
                      {tmpl.nodes.length} {isRtl ? 'عقد' : 'nodes'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-200 group-hover:text-purple-300 transition-colors text-start">
                    {isRtl ? tmpl.nameAr : tmpl.name}
                  </h3>
                  
                  <p className="text-[11px] text-zinc-400 leading-normal font-light text-start">
                    {isRtl ? tmpl.descAr : tmpl.desc}
                  </p>

                  {/* Node chain roadmap layout */}
                  <div className="flex flex-wrap items-center gap-1 bg-zinc-950/60 border border-white/5 p-2 rounded-xl mt-3 select-none">
                    {tmpl.nodes.map((node, nIdx) => (
                      <div key={nIdx} className="flex items-center gap-1">
                        <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 border border-white/5">
                          {isRtl 
                            ? (node.type === 'start' ? 'بداية' : node.type === 'end' ? 'نهاية' : node.type === 'if_else' ? 'شرط' : node.type)
                            : node.type}
                        </span>
                        {nIdx < tmpl.nodes.length - 1 && (
                          <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0 rtl:rotate-180" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/4 flex items-center justify-between text-[10px] text-zinc-500 font-bold group-hover:text-purple-400 transition-colors">
                  <div className="flex items-center gap-1.5 font-light">
                    <Info className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'يتضمن الربط التلقائي' : 'Includes auto-routing edges'}</span>
                  </div>
                  <span className="underline group-hover:no-underline">{isRtl ? 'تحميل القالب ←' : 'Load Blueprint →'}</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-white/6 pt-4 shrink-0 flex items-center justify-between">
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {isRtl ? 'سيتم حفظ القالب مباشرة وتوجيهك لصفحة التحرير.' : 'Blueprint is instantly saved in your active workspace dashboard.'}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setGalleryOpen(false)}
              className="rounded-xl border-white/8 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 cursor-pointer h-9 px-4 text-xs font-semibold"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
