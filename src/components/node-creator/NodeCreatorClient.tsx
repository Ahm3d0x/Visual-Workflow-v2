'use client';

import { useState } from 'react';
import {
  Sparkles, Settings, Play, StopCircle, GitFork,
  ArrowRightLeft, Send, Database, CheckSquare, BrainCircuit,
  Clock, RefreshCw, Palette, Sliders, Eye, Rocket,
  Plus, Trash2, Loader2, ChevronRight, ChevronLeft,
  Globe, Tag, Package, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { publishMarketplaceNode } from '@/actions/marketplace.actions';
import { useDialogStore } from '@/stores/dialogStore';
import { LiveNodePreview } from './LiveNodePreview';

interface NodeCreatorClientProps {
  locale: string;
  userId: string;
  workspaceId: string;
  existingNodes: Record<string, unknown>[];
}

const ICON_PRESETS = [
  { name: 'settings', icon: <Settings className="w-4 h-4" /> },
  { name: 'play', icon: <Play className="w-4 h-4 text-emerald-500" /> },
  { name: 'stop', icon: <StopCircle className="w-4 h-4 text-rose-500" /> },
  { name: 'branch', icon: <GitFork className="w-4 h-4 text-amber-500" /> },
  { name: 'data', icon: <ArrowRightLeft className="w-4 h-4 text-sky-500" /> },
  { name: 'send', icon: <Send className="w-4 h-4 text-violet-500" /> },
  { name: 'database', icon: <Database className="w-4 h-4 text-violet-500" /> },
  { name: 'check', icon: <CheckSquare className="w-4 h-4 text-teal-500" /> },
  { name: 'ai', icon: <BrainCircuit className="w-4 h-4 text-rose-500" /> },
  { name: 'timer', icon: <Clock className="w-4 h-4 text-zinc-500" /> },
  { name: 'loop', icon: <RefreshCw className="w-4 h-4 text-violet-500" /> },
];

const COLOR_PRESETS = [
  { id: 'violet', label: 'Violet', color: 'bg-violet-500', colorClass: 'border-violet-500/20 bg-background/90 text-violet-600 dark:border-violet-500/40', accentBar: 'bg-violet-500', badgeColor: 'bg-violet-500/10 text-violet-600' },
  { id: 'rose', label: 'Rose', color: 'bg-rose-500', colorClass: 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40', accentBar: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600' },
  { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500', colorClass: 'border-emerald-500/20 bg-background/90 text-emerald-600 dark:border-emerald-500/40', accentBar: 'bg-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600' },
  { id: 'amber', label: 'Amber', color: 'bg-amber-500', colorClass: 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40', accentBar: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600' },
  { id: 'sky', label: 'Sky', color: 'bg-sky-500', colorClass: 'border-sky-500/20 bg-background/90 text-sky-600 dark:border-sky-500/40', accentBar: 'bg-sky-500', badgeColor: 'bg-sky-500/10 text-sky-600' },
  { id: 'fuchsia', label: 'Fuchsia', color: 'bg-fuchsia-500', colorClass: 'border-fuchsia-500/20 bg-background/90 text-fuchsia-600 dark:border-fuchsia-500/40', accentBar: 'bg-fuchsia-500', badgeColor: 'bg-fuchsia-500/10 text-fuchsia-600' },
];

const CATEGORIES = ['general', 'logic', 'data', 'integration', 'ai', 'human'];
const DOMAINS = ['general', 'development', 'marketing', 'communication', 'productivity', 'artificial-intelligence', 'finance', 'hr', 'education'];

const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'boolean', 'json', 'url'];

interface CustomField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

export function NodeCreatorClient({ locale, userId, workspaceId, existingNodes }: NodeCreatorClientProps) {
  const isRtl = locale === 'ar';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [domain, setDomain] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Step 2: Appearance (Custom Icon/Emoji/URL selection)
  const [iconName, setIconName] = useState('settings');
  const [iconType, setIconType] = useState<'preset' | 'emoji' | 'url'>('preset');
  const [customEmoji, setCustomEmoji] = useState('');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [colorPreset, setColorPreset] = useState(COLOR_PRESETS[0]);

  // Step 3: Technical
  const [inputsCount, setInputsCount] = useState(1);
  const [outputsCount, setOutputsCount] = useState(1);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Step 4: Publish & Pricing
  const [visibility, setVisibility] = useState<'private' | 'workspace' | 'public'>('private');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(0.00);

  const totalSteps = 4;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddField = () => {
    setCustomFields([...customFields, {
      key: `field_${customFields.length + 1}`,
      label: '',
      type: 'text',
      required: false,
    }]);
  };

  const handleRemoveField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof CustomField, value: string | boolean) => {
    setCustomFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
  };

  const handlePublish = async () => {
    if (!name.trim()) return;
    setLoading(true);

    const res = await publishMarketplaceNode(workspaceId, {
      name: name.trim(),
      description: description.trim(),
      long_description: longDescription.trim() || undefined,
      category,
      domain: domain !== 'general' ? domain : undefined,
      tags,
      icon: iconName,
      color: colorPreset.color,
      accent_bar: colorPreset.accentBar,
      badge_color: colorPreset.badgeColor,
      color_class: colorPreset.colorClass,
      base_type: category,
      default_data: { label: name.trim(), description: description.trim() },
      default_style: { colorClass: colorPreset.colorClass, accentBar: colorPreset.accentBar, badgeColor: colorPreset.badgeColor, iconName },
      handles: { inputsCount, outputsCount },
      fields_schema: customFields as unknown as Record<string, unknown>[],
      visibility,
      is_free: isFree,
      price: isFree ? 0.00 : price,
    });

    setLoading(false);

    if (res.error) {
      if (res.error === 'PLAN_LIMIT_REACHED') {
        const limitMsg = isRtl
          ? `لقد وصلت إلى الحد الأقصى للباقة لإنشاء النودز (${res.data?.limit}). يرجى ترقية خطتك لإنشاء المزيد من النودز.`
          : `Limit Reached: You have reached the plan limit for creating custom nodes (${res.data?.limit}). Please upgrade your plan to create more nodes.`;
        useDialogStore.getState().showAlert(isRtl ? 'حماية باقة الاشتراك' : 'Subscription Guard', limitMsg);
      } else {
        useDialogStore.getState().showAlert(isRtl ? 'خطأ' : 'Error', res.error);
      }
    } else {
      useDialogStore.getState().showNotification(
        isRtl ? 'تم حفظ النود بنجاح! سيتم مراجعته قبل النشر العام.' : 'Node saved successfully! It will be reviewed before going public.',
        'success'
      );
      // Reset form
      setStep(1);
      setName('');
      setDescription('');
      setLongDescription('');
      setTags([]);
      setCustomFields([]);
      setIsFree(true);
      setPrice(0.00);
    }
  };

  const stepLabels = [
    { num: 1, label: isRtl ? 'المعلومات' : 'Info', icon: <Package className="w-4 h-4" /> },
    { num: 2, label: isRtl ? 'المظهر' : 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { num: 3, label: isRtl ? 'التقنية' : 'Technical', icon: <Sliders className="w-4 h-4" /> },
    { num: 4, label: isRtl ? 'النشر' : 'Publish', icon: <Rocket className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {isRtl ? 'صانع النودز' : 'Node Creator'}
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              {isRtl ? 'صمم نودز مخصصة وشاركها مع المجتمع' : 'Design custom nodes and share them with the community'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-muted/20 rounded-2xl p-3 border border-border/30">
        {stepLabels.map((s, i) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex-1 justify-center ${
              step === s.num
                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/20'
                : step > s.num
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {s.icon}
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">{s.num}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5 bg-background/80 border border-border/40 rounded-2xl p-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-fuchsia-400" />
                {isRtl ? 'المعلومات الأساسية' : 'Basic Information'}
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="customNodeName" className="text-xs font-semibold">{isRtl ? 'اسم النود' : 'Node Name'}</Label>
                <Input id="customNodeName" value={name} onChange={(e) => setName(e.target.value)} placeholder={isRtl ? 'مثال: إرسال إشعار Slack' : 'e.g. Slack Notification Sender'} maxLength={60} className="rounded-xl border-border text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nodeDesc" className="text-xs font-semibold">{isRtl ? 'الوصف القصير' : 'Short Description'}</Label>
                <Textarea id="nodeDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isRtl ? 'صف ما يفعله هذا النود...' : 'Describe what this node does...'} rows={2} className="rounded-xl border-border text-xs font-light" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nodeLong" className="text-xs font-semibold">{isRtl ? 'الوصف المفصل (اختياري)' : 'Detailed Description (optional)'}</Label>
                <Textarea id="nodeLong" value={longDescription} onChange={(e) => setLongDescription(e.target.value)} placeholder={isRtl ? 'أضف وصف مفصل بتنسيق Markdown...' : 'Add detailed markdown description...'} rows={4} className="rounded-xl border-border text-xs font-light" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{isRtl ? 'الفئة' : 'Category'}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setCategory(cat)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all capitalize ${category === cat ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'bg-muted/40 text-muted-foreground hover:bg-muted border border-transparent'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{isRtl ? 'المجال' : 'Domain'}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DOMAINS.slice(0, 5).map(d => (
                      <button key={d} onClick={() => setDomain(d)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all capitalize ${domain === d ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-muted/40 text-muted-foreground hover:bg-muted border border-transparent'}`}>{d}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {isRtl ? 'التاجات' : 'Tags'}</Label>
                <div className="flex items-center gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder={isRtl ? 'أضف تاج...' : 'Add tag...'} className="rounded-xl border-border text-xs flex-1" />
                  <Button type="button" onClick={handleAddTag} className="rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs cursor-pointer"><Plus className="w-3.5 h-3.5" /></Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 text-[10px] font-medium">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="cursor-pointer hover:text-rose-400"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Appearance */}
          {step === 2 && (
            <div className="space-y-5 bg-background/80 border border-border/40 rounded-2xl p-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Palette className="w-5 h-5 text-fuchsia-400" />
                {isRtl ? 'المظهر والتصميم' : 'Appearance & Design'}
              </h2>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">{isRtl ? 'لون النود' : 'Node Color'}</Label>
                <div className="flex items-center gap-2.5">
                  {COLOR_PRESETS.map(preset => (
                    <button key={preset.id} onClick={() => setColorPreset(preset)} className={`w-8 h-8 rounded-full cursor-pointer transition-transform border border-border/80 ${preset.color} ${colorPreset.id === preset.id ? 'ring-2 ring-accent scale-110' : 'hover:scale-105'}`} title={preset.label} />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold">{isRtl ? 'أيقونة النود' : 'Node Icon'}</Label>
                
                {/* Tabs to select icon type */}
                <div className="flex bg-muted/50 p-1 rounded-xl border border-border/20 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setIconType('preset')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${iconType === 'preset' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                  >
                    {isRtl ? 'أيقونات جاهزة' : 'Presets'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconType('emoji')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${iconType === 'emoji' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                  >
                    {isRtl ? 'رمز تعبيري' : 'Emoji'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconType('url')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${iconType === 'url' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                  >
                    {isRtl ? 'رابط صورة' : 'Image URL'}
                  </button>
                </div>

                {iconType === 'preset' && (
                  <div className="flex flex-wrap gap-2 bg-muted/20 p-3 rounded-2xl border border-border/20">
                    {ICON_PRESETS.map(icon => (
                      <button key={icon.name} type="button" onClick={() => setIconName(icon.name)} className={`w-8 h-8 rounded-lg flex items-center justify-center border cursor-pointer transition-colors ${iconName === icon.name ? 'bg-accent border-accent text-accent-foreground' : 'border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {icon.icon}
                      </button>
                    ))}
                  </div>
                )}

                {iconType === 'emoji' && (
                  <div className="space-y-1.5">
                    <Input
                      value={customEmoji}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomEmoji(val);
                        setIconName(val);
                      }}
                      placeholder={isRtl ? 'مثال: 🤖' : 'e.g. 🤖'}
                      maxLength={4}
                      className="rounded-xl border-border text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/60">{isRtl ? 'اكتب رمزاً تعبيرياً واحداً لتمثيل النود.' : 'Type a single emoji character for the node icon.'}</p>
                  </div>
                )}

                {iconType === 'url' && (
                  <div className="space-y-1.5">
                    <Input
                      value={customIconUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomIconUrl(val);
                        setIconName(val);
                      }}
                      placeholder={isRtl ? 'https://example.com/icon.png' : 'https://example.com/icon.png'}
                      className="rounded-xl border-border text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/60">{isRtl ? 'أدخل رابطاً مباشراً لصورة بصيغة PNG أو SVG.' : 'Provide a direct link to an SVG or PNG icon image.'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Technical */}
          {step === 3 && (
            <div className="space-y-5 bg-background/80 border border-border/40 rounded-2xl p-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-fuchsia-400" />
                {isRtl ? 'التكوين الفني' : 'Technical Configuration'}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{isRtl ? 'عدد المدخلات' : 'Input Handles'}</Label>
                  <Input type="number" min={0} max={4} value={inputsCount} onChange={(e) => setInputsCount(Math.min(4, Math.max(0, parseInt(e.target.value) || 0)))} className="rounded-xl border-border text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{isRtl ? 'عدد المخرجات' : 'Output Handles'}</Label>
                  <Input type="number" min={0} max={4} value={outputsCount} onChange={(e) => setOutputsCount(Math.min(4, Math.max(0, parseInt(e.target.value) || 0)))} className="rounded-xl border-border text-sm" />
                </div>
              </div>

              {/* Custom Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">{isRtl ? 'الحقول المخصصة' : 'Custom Fields'}</Label>
                  <Button type="button" onClick={handleAddField} className="text-xs rounded-xl bg-muted hover:bg-muted/80 text-foreground cursor-pointer h-8 px-3">
                    <Plus className="w-3 h-3 mr-1" /> {isRtl ? 'إضافة حقل' : 'Add Field'}
                  </Button>
                </div>

                {customFields.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground font-light bg-muted/20 p-3 rounded-xl border border-border/10">
                    {isRtl ? 'لا توجد حقول مخصصة. أضف حقول ليتمكن المستخدمون من تكوين النود.' : 'No custom fields yet. Add fields to let users configure this node.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customFields.map((field, idx) => (
                      <div key={idx} className="p-3 bg-muted/10 rounded-xl border border-border/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{isRtl ? `حقل ${idx + 1}` : `Field ${idx + 1}`}</span>
                          <button onClick={() => handleRemoveField(idx)} className="text-rose-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Input value={field.label} onChange={(e) => handleFieldChange(idx, 'label', e.target.value)} placeholder={isRtl ? 'العنوان' : 'Label'} className="rounded-lg border-border text-[11px]" />
                          <select value={field.type} onChange={(e) => handleFieldChange(idx, 'type', e.target.value)} className="rounded-lg border border-border bg-background text-[11px] px-2 py-1.5 cursor-pointer">
                            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                            <input type="checkbox" checked={field.required} onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)} className="rounded cursor-pointer" />
                            {isRtl ? 'مطلوب' : 'Required'}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Publish */}
          {step === 4 && (
            <div className="space-y-5 bg-background/80 border border-border/40 rounded-2xl p-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-fuchsia-400" />
                {isRtl ? 'النشر والمشاركة' : 'Publish & Share'}
              </h2>

              <div className="space-y-3">
                <Label className="text-xs font-semibold">{isRtl ? 'مستوى الظهور' : 'Visibility'}</Label>
                <div className="space-y-2">
                  {[
                    { id: 'private' as const, label: isRtl ? 'خاص — لي فقط' : 'Private — Only for me', desc: isRtl ? 'لن يراها أحد غيرك' : 'Only visible to you', icon: '🔒' },
                    { id: 'workspace' as const, label: isRtl ? 'مساحة العمل — للفريق' : 'Workspace — Team only', desc: isRtl ? 'مرئية لأعضاء مساحة العمل' : 'Visible to workspace members', icon: '👥' },
                    { id: 'public' as const, label: isRtl ? 'عام — الماركت بليس' : 'Public — Marketplace', desc: isRtl ? 'مرئية للجميع في المتجر (تتطلب مراجعة)' : 'Visible to everyone in the store (under review)', icon: '🌍' },
                  ].map(opt => (
                    <button key={opt.id} type="button" onClick={() => setVisibility(opt.id)} className={`w-full p-3.5 rounded-xl border text-left cursor-pointer transition-all ${visibility === opt.id ? 'border-fuchsia-500/40 bg-fuchsia-500/5 shadow-sm' : 'border-border/40 hover:border-border hover:bg-muted/20'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{opt.icon}</span>
                        <div>
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground font-light">{opt.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing selector */}
              <div className="space-y-3 pt-3 border-t border-border/20">
                <Label className="text-xs font-semibold">{isRtl ? 'نموذج التسعير' : 'Pricing Model'}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsFree(true); setPrice(0.00); }}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all text-xs font-bold ${
                      isFree
                        ? 'border-fuchsia-500/40 bg-fuchsia-500/5 text-fuchsia-400'
                        : 'border-border/40 hover:bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    {isRtl ? 'مجاني' : 'Free'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFree(false)}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all text-xs font-bold ${
                      !isFree
                        ? 'border-fuchsia-500/40 bg-fuchsia-500/5 text-fuchsia-400'
                        : 'border-border/40 hover:bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    {isRtl ? 'مدفوع' : 'Paid'}
                  </button>
                </div>

                {!isFree && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <Label htmlFor="nodePrice" className="text-xs font-semibold">{isRtl ? 'السعر ($)' : 'Price ($)'}</Label>
                    <Input
                      id="nodePrice"
                      type="number"
                      min={0.99}
                      step={0.01}
                      value={price}
                      onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0.00"
                      className="rounded-xl border-border text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-muted/20 p-4 rounded-2xl border border-border/20 space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{isRtl ? 'ملخص' : 'Summary'}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground/60">{isRtl ? 'الاسم:' : 'Name:'}</span> <span className="font-semibold">{name || '—'}</span></div>
                  <div><span className="text-muted-foreground/60">{isRtl ? 'الفئة:' : 'Category:'}</span> <span className="font-semibold capitalize">{category}</span></div>
                  <div><span className="text-muted-foreground/60">{isRtl ? 'الحقول:' : 'Fields:'}</span> <span className="font-semibold">{customFields.length}</span></div>
                  <div><span className="text-muted-foreground/60">{isRtl ? 'التسعير:' : 'Pricing:'}</span> <span className="font-semibold">{isFree ? (isRtl ? 'مجاني' : 'Free') : `$${price.toFixed(2)}`}</span></div>
                </div>
              </div>

              <Button
                onClick={handlePublish}
                disabled={loading || !name.trim()}
                className="w-full py-5 bg-linear-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-600/90 hover:to-violet-600/90 text-white rounded-2xl font-bold text-sm shadow-lg shadow-fuchsia-600/20 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span className="flex items-center gap-2 justify-center">
                    <Rocket className="w-4 h-4" />
                    {isRtl ? 'نشر النود' : 'Publish Node'}
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="rounded-xl border-border cursor-pointer px-5 text-xs font-semibold">
                {isRtl ? <ChevronRight className="w-4 h-4 mr-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
                {isRtl ? 'السابق' : 'Previous'}
              </Button>
            ) : <div />}
            {step < totalSteps && (
              <Button type="button" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !name.trim()} className="bg-fuchsia-600 hover:bg-fuchsia-600/90 text-white rounded-xl px-5 cursor-pointer text-xs font-semibold">
                {isRtl ? 'التالي' : 'Next'}
                {isRtl ? <ChevronLeft className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-24">
            <LiveNodePreview
              name={name}
              description={description}
              category={category}
              iconName={iconName}
              colorPreset={colorPreset}
              locale={locale}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
