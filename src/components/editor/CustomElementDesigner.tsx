'use client';

import { useState } from 'react';
import { 
  Sparkles, Sliders, Palette, ArrowRightLeft, 
  Play, StopCircle, Settings, GitFork, 
  Send, Database, CheckSquare, BrainCircuit, 
  Clock, RefreshCw, Loader2 
} from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';
import { PLAN_LIMITS } from '@/lib/planLimits';

interface CustomElementDesignerProps {
  workspaceId: string;
  onSaved: () => void;
  activePlan: 'free' | 'warrior' | 'elite' | 'champion' | 'legend';
  customTemplatesCount: number;
}

export function CustomElementDesigner({ 
  workspaceId, 
  onSaved, 
  activePlan, 
  customTemplatesCount 
}: CustomElementDesignerProps) {
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'basic' | 'logic' | 'data' | 'integration' | 'human' | 'ai'>('basic');
  const [iconName, setIconName] = useState('settings');
  const [colorClass, setColorClass] = useState('border-primary/20 bg-background/90 text-primary dark:border-primary/30');
  const [accentBar, setAccentBar] = useState('bg-primary');
  const [badgeColor, setBadgeColor] = useState('bg-primary/10 text-primary');
  
  // Port State
  const [inputsCount, setInputsCount] = useState(1);
  const [outputsCount, setOutputsCount] = useState(1);

  // Curated Preset Colors
  const colorsPresets = [
    {
      id: 'violet',
      label: 'Violet',
      color: 'bg-violet-500',
      colorClass: 'border-violet-500/20 bg-background/90 text-violet-600 dark:border-violet-500/40',
      accentBar: 'bg-violet-500',
      badgeColor: 'bg-violet-500/10 text-violet-600',
    },
    {
      id: 'rose',
      label: 'Rose',
      color: 'bg-rose-500',
      colorClass: 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40',
      accentBar: 'bg-rose-500',
      badgeColor: 'bg-rose-500/10 text-rose-600',
    },
    {
      id: 'emerald',
      label: 'Emerald',
      color: 'bg-emerald-500',
      colorClass: 'border-emerald-500/20 bg-background/90 text-emerald-600 dark:border-emerald-500/40',
      accentBar: 'bg-emerald-500',
      badgeColor: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      id: 'amber',
      label: 'Amber',
      color: 'bg-amber-500',
      colorClass: 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40',
      accentBar: 'bg-amber-500',
      badgeColor: 'bg-amber-500/10 text-amber-600',
    },
    {
      id: 'sky',
      label: 'Sky',
      color: 'bg-sky-500',
      colorClass: 'border-sky-500/20 bg-background/90 text-sky-600 dark:border-sky-500/40',
      accentBar: 'bg-sky-500',
      badgeColor: 'bg-sky-500/10 text-sky-600',
    },
  ];

  // Presets Icons
  const iconsPresets = [
    { name: 'settings', icon: <Settings className="w-4 h-4" /> },
    { name: 'play', icon: <Play className="w-4 h-4" /> },
    { name: 'stop', icon: <StopCircle className="w-4 h-4" /> },
    { name: 'branch', icon: <GitFork className="w-4 h-4" /> },
    { name: 'data', icon: <ArrowRightLeft className="w-4 h-4" /> },
    { name: 'send', icon: <Send className="w-4 h-4" /> },
    { name: 'database', icon: <Database className="w-4 h-4" /> },
    { name: 'check', icon: <CheckSquare className="w-4 h-4" /> },
    { name: 'ai', icon: <BrainCircuit className="w-4 h-4 text-rose-500" /> },
    { name: 'timer', icon: <Clock className="w-4 h-4" /> },
    { name: 'loop', icon: <RefreshCw className="w-4 h-4" /> },
  ];

  const getPresetIcon = (nameString: string) => {
    const matched = iconsPresets.find(i => i.name === nameString);
    return matched ? matched.icon : <Settings className="w-4 h-4" />;
  };

  const handleSaveElement = async () => {
    // 1. Check strict subscription plan-limit checks
    const limit = PLAN_LIMITS[activePlan]?.max_custom_elements ?? 2;
    if (customTemplatesCount >= limit) {
      alert(`You have reached the maximum number of custom elements (${limit}) for the ${activePlan} tier. Please upgrade to add more!`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const defaultData = {
        label: name.trim(),
        description: description.trim() || undefined,
        customNode: true,
      };

      const defaultStyle = {
        colorClass,
        accentBar,
        badgeColor,
        iconName,
      };

      const handles = {
        inputsCount,
        outputsCount,
      };

      const { error } = await (supabase.from('custom_node_templates') as unknown as {
        insert: (arg: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      }).insert({
        workspace_id: workspaceId,
        created_by: user.id,
        name: name.trim(),
        description: description.trim() || null,
        base_type: category,
        icon: iconName,
        color: accentBar,
        default_data: defaultData,
        default_style: defaultStyle,
        handles: handles,
        validation_schema: {},
        tags: [category],
        visibility: 'workspace',
      });

      if (error) throw new Error(error.message);

      alert('Custom element successfully saved!');
      setOpen(false);
      onSaved();
      
      // Reset forms
      setName('');
      setDescription('');
      setCategory('basic');
      setStep(1);
    } catch (err) {
      alert('Failed to save element: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-4 py-2.5 rounded-xl cursor-pointer gap-2 transition-transform hover:scale-[1.01] focus:outline-hidden text-xs">
        <Sparkles className="w-4 h-4" />
        <span>Create Reusable Custom Element</span>
      </DialogTrigger>
      
      <DialogContent className="bg-background border border-border rounded-2xl shadow-xl max-w-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-sans flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <span>Custom Reusable Element Designer</span>
          </DialogTitle>
        </DialogHeader>

        {/* Live Preview Bar */}
        <div className="bg-zinc-950/40 p-4 border border-border/40 rounded-2xl flex items-center justify-center min-h-[140px] relative overflow-hidden backdrop-blur-xs select-none">
          <div className="absolute top-2 left-2 text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground/60">
            Live Preview
          </div>
          
          <div className={`min-w-[190px] max-w-[240px] rounded-2xl border transition-all shadow-md relative bg-background/90 ${colorClass} scale-100`}>
            <div className={`absolute left-0 top-3 bottom-3 w-1.2 rounded-r-md ${accentBar}`} />
            <div className="p-4 pl-4.5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-6.5 h-6.5 rounded-lg bg-muted flex items-center justify-center border border-border/40 shrink-0">
                    {getPresetIcon(iconName)}
                  </div>
                  <h4 className="font-bold text-xs font-sans text-foreground line-clamp-1 leading-tight">
                    {name || 'My Reusable Node'}
                  </h4>
                </div>
              </div>
              <p className="text-[10px] font-light text-muted-foreground line-clamp-2 leading-tight">
                {description || 'Provide node parameters description step.'}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {category}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/40">node_1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi step form */}
        <div className="py-4 space-y-4">
          {/* Step 1: Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="customName" className="text-xs font-semibold">Element Name (reusable tag)</Label>
                <Input
                  id="customName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. HubSpot Sync CRM"
                  maxLength={40}
                  className="rounded-xl border-border focus:ring-accent text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customDesc" className="text-xs font-semibold">Description</Label>
                <Textarea
                  id="customDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what this customized reusable node operates..."
                  rows={2}
                  className="rounded-xl border-border focus:ring-accent text-xs font-light"
                />
              </div>
            </div>
          )}

          {/* Step 2: Visual presets */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Presets color selectors */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span>Choose Color Theme Preset</span>
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {colorsPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setColorClass(preset.colorClass);
                        setAccentBar(preset.accentBar);
                        setBadgeColor(preset.badgeColor);
                      }}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform border border-border/80 ${preset.color} ${
                        accentBar === preset.accentBar ? 'ring-2 ring-accent scale-110' : 'hover:scale-105'
                      }`}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              {/* Preset Icon Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-muted-foreground" />
                  <span>Choose Node Icon Style</span>
                </Label>
                <div className="flex flex-wrap items-center gap-2 bg-muted/20 p-3 rounded-2xl border border-border/20 max-h-[88px] overflow-y-auto custom-scrollbar">
                  {iconsPresets.map((icon) => (
                    <button
                      key={icon.name}
                      onClick={() => setIconName(icon.name)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border cursor-pointer transition-colors ${
                        iconName === icon.name 
                          ? 'bg-accent border-accent text-accent-foreground' 
                          : 'border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {icon.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Handles configuration */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inputsPort" className="text-xs font-semibold">Top Input Handles</Label>
                  <Input
                    id="inputsPort"
                    type="number"
                    min={0}
                    max={4}
                    value={inputsCount}
                    onChange={(e) => setInputsCount(Math.min(4, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="rounded-xl border-border focus:ring-accent text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground font-light leading-tight">
                    Number of targets handles distributed along top border.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outputsPort" className="text-xs font-semibold">Bottom Output Handles</Label>
                  <Input
                    id="outputsPort"
                    type="number"
                    min={0}
                    max={4}
                    value={outputsCount}
                    onChange={(e) => setOutputsCount(Math.min(4, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="rounded-xl border-border focus:ring-accent text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground font-light leading-tight">
                    Number of sources handles distributed along bottom border.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(prev => prev - 1)}
              className="rounded-xl border-border cursor-pointer h-9 px-4 text-xs font-semibold"
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep(prev => prev + 1)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl px-4 cursor-pointer h-9 text-xs font-semibold"
            >
              Next Step
            </Button>
          ) : (
            <Button
              type="button"
              disabled={loading || !name.trim()}
              onClick={handleSaveElement}
              className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-5 cursor-pointer h-9 text-xs font-semibold"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Reusable Element'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
