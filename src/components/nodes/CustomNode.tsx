'use client';

import { 
  Play, StopCircle, Settings, GitFork, Clipboard,
  Send, Database, CheckSquare, BrainCircuit, 
  Clock, ArrowRightLeft, RefreshCw, Heart, Award,
  Shield, Cpu, Mail, Bell, Globe, User, Zap,
  Image as ImageIcon, Activity, Cloud, Code, Lock, Key
} from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { NODE_SCHEMAS } from '@/lib/nodeSchemas';

interface CustomNodeProps {
  id: string;
  type: string;
  data: {
    label: string;
    description?: string;
    customNode?: boolean;
    customStyle?: {
      colorClass?: string;
      accentBar?: string;
      badgeColor?: string;
      iconName?: string;
      imageUrl?: string;
    };
    customHandles?: {
      inputsCount?: number;
      outputsCount?: number;
    };
    handleConfig?: {
      inputCount?: number;
      inputPosition?: 'top' | 'bottom' | 'left' | 'right';
      inputColor?: string;
      outputCount?: number;
      outputPosition?: 'top' | 'bottom' | 'left' | 'right';
      outputColor?: string;
    };
    [key: string]: unknown;
  };
  selected?: boolean;
}

export function CustomNode({ id, type, data, selected }: CustomNodeProps) {
  // Helper to map dynamic icon names to Lucide icons
  const getCustomIcon = (nameString: string) => {
    switch (nameString) {
      case 'settings': return <Settings className="w-4 h-4" />;
      case 'play': return <Play className="w-4 h-4 text-emerald-500" />;
      case 'stop': return <StopCircle className="w-4 h-4 text-rose-500" />;
      case 'branch': return <GitFork className="w-4 h-4 text-amber-500" />;
      case 'data': return <ArrowRightLeft className="w-4 h-4 text-sky-500" />;
      case 'send': return <Send className="w-4 h-4 text-violet-500" />;
      case 'database': return <Database className="w-4 h-4 text-violet-500" />;
      case 'check': return <CheckSquare className="w-4 h-4 text-teal-500" />;
      case 'ai': return <BrainCircuit className="w-4 h-4 text-rose-500" />;
      case 'timer': return <Clock className="w-4 h-4 text-zinc-500" />;
      case 'loop': return <RefreshCw className="w-4 h-4 text-violet-500" />;
      case 'heart': return <Heart className="w-4 h-4 text-rose-500" />;
      case 'award': return <Award className="w-4 h-4 text-yellow-500" />;
      case 'shield': return <Shield className="w-4 h-4 text-emerald-500" />;
      case 'cpu': return <Cpu className="w-4 h-4 text-sky-500" />;
      case 'mail': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'bell': return <Bell className="w-4 h-4 text-amber-500" />;
      case 'globe': return <Globe className="w-4 h-4 text-cyan-500" />;
      case 'user': return <User className="w-4 h-4 text-indigo-500" />;
      case 'zap': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-pink-500" />;
      case 'activity': return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'cloud': return <Cloud className="w-4 h-4 text-sky-400" />;
      case 'code': return <Code className="w-4 h-4 text-amber-600" />;
      case 'lock': return <Lock className="w-4 h-4 text-rose-400" />;
      case 'key': return <Key className="w-4 h-4 text-yellow-600" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  // 1. Determine styles and icons based on category type
  let icon = <Settings className="w-4 h-4" />;
  let colorClass = 'border-primary/20 bg-background/90 text-primary dark:border-primary/30';
  let badgeColor = 'bg-primary/10 text-primary';
  let accentBar = 'bg-primary';

  // Basic Categories
  if (['start', 'end', 'process', 'decision', 'note', 'group', 'delay', 'connector'].includes(type)) {
    if (type === 'start') {
      icon = <Play className="w-4 h-4 text-emerald-500" />;
      colorClass = 'border-emerald-500/20 bg-background/90 text-emerald-600 dark:border-emerald-500/40';
      badgeColor = 'bg-emerald-500/10 text-emerald-600';
      accentBar = 'bg-emerald-500';
    } else if (type === 'end') {
      icon = <StopCircle className="w-4 h-4 text-rose-500" />;
      colorClass = 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40';
      badgeColor = 'bg-rose-500/10 text-rose-600';
      accentBar = 'bg-rose-500';
    } else if (type === 'delay') {
      icon = <Clock className="w-4 h-4 text-zinc-500" />;
      colorClass = 'border-zinc-500/20 bg-background/90 text-zinc-600 dark:border-zinc-500/40';
      badgeColor = 'bg-zinc-500/10 text-zinc-600';
      accentBar = 'bg-zinc-500';
    } else {
      icon = <Settings className="w-4 h-4 text-primary" />;
      colorClass = 'border-primary/20 bg-background/90 text-primary dark:border-primary/30';
      badgeColor = 'bg-primary/10 text-primary';
      accentBar = 'bg-primary';
    }
  }
  // Logic Categories
  else if (['if_else', 'switch', 'loop', 'parallel', 'merge', 'retry', 'error_handler'].includes(type)) {
    icon = <GitFork className="w-4 h-4 text-amber-500" />;
    colorClass = 'border-amber-500/20 bg-background/90 text-amber-600 dark:border-amber-500/40';
    badgeColor = 'bg-amber-500/10 text-amber-600';
    accentBar = 'bg-amber-500';
  }
  // Data Categories
  else if (['input', 'output', 'variable', 'transform', 'filter', 'mapper', 'table_lookup'].includes(type)) {
    icon = <ArrowRightLeft className="w-4 h-4 text-sky-500" />;
    colorClass = 'border-sky-500/20 bg-background/90 text-sky-600 dark:border-sky-500/40';
    badgeColor = 'bg-sky-500/10 text-sky-600';
    accentBar = 'bg-sky-500';
  }
  // Integration Categories
  else if (['api_request', 'webhook', 'email', 'sms', 'database', 'file_upload', 'google_sheets', 'slack', 'crm'].includes(type)) {
    if (type === 'database') icon = <Database className="w-4 h-4 text-violet-500" />;
    else if (type === 'email' || type === 'sms' || type === 'slack') icon = <Send className="w-4 h-4 text-violet-500" />;
    else icon = <RefreshCw className="w-4 h-4 text-violet-500" />;
    colorClass = 'border-violet-500/20 bg-background/90 text-violet-600 dark:border-violet-500/40';
    badgeColor = 'bg-violet-500/10 text-violet-600';
    accentBar = 'bg-violet-500';
  }
  // Human Categories
  else if (['form_step', 'approval', 'user_task', 'checklist', 'attachment', 'signature'].includes(type)) {
    if (type === 'checklist') icon = <CheckSquare className="w-4 h-4 text-teal-500" />;
    else icon = <Clipboard className="w-4 h-4 text-teal-500" />;
    colorClass = 'border-teal-500/20 bg-background/90 text-teal-600 dark:border-teal-500/40';
    badgeColor = 'bg-teal-500/10 text-teal-600';
    accentBar = 'bg-teal-500';
  }
  // AI Categories
  else if (['ai_generate', 'ai_classify', 'ai_extract', 'ai_summarize', 'ai_route', 'ai_validator', 'ai_assistant'].includes(type)) {
    icon = <BrainCircuit className="w-4 h-4 text-rose-500" />;
    colorClass = 'border-rose-500/20 bg-background/90 text-rose-600 dark:border-rose-500/40';
    badgeColor = 'bg-rose-500/10 text-rose-600';
    accentBar = 'bg-rose-500';
  }

  // Check if it's a dynamic custom template first OR if customStyle is provided dynamically to override styling!
  if (type === 'custom_template' || data.customNode || data.customStyle) {
    const customStyle = data.customStyle || {};
    colorClass = customStyle.colorClass || colorClass;
    accentBar = customStyle.accentBar || accentBar;
    badgeColor = customStyle.badgeColor || badgeColor;
    
    if (customStyle.imageUrl) {
      icon = <img src={customStyle.imageUrl} className="w-5.5 h-5.5 rounded-lg object-cover border border-border/20 shrink-0" alt="custom logo" />;
    } else if (customStyle.iconName) {
      icon = getCustomIcon(customStyle.iconName);
    }
  }

  // 2. Fetch connection handle structures dynamically
  const schema = NODE_SCHEMAS[type];
  let inputs = schema ? schema.inputs : [{ id: 'in', label: 'In' }];
  let outputs = schema ? schema.outputs : [{ id: 'out', label: 'Out' }];

  if (data.polarHandles) {
    inputs = [];
    outputs = [];
  } else if (data.handleConfig || type === 'custom_template' || data.customNode) {
    const handleConfig = data.handleConfig || {};
    const inputCount = typeof handleConfig.inputCount === 'number' ? handleConfig.inputCount : 1;
    const inputPosition = handleConfig.inputPosition || 'top';
    const inputColor = handleConfig.inputColor || '#10b981';
    
    const outputCount = typeof handleConfig.outputCount === 'number' ? handleConfig.outputCount : 1;
    const outputPosition = handleConfig.outputPosition || 'bottom';
    const outputColor = handleConfig.outputColor || '#ef4444';

    inputs = Array.from({ length: inputCount }, (_, i) => ({
      id: `in_${i}`,
      label: `Input ${i + 1}`,
      position: inputPosition === 'bottom' ? Position.Bottom : inputPosition === 'left' ? Position.Left : inputPosition === 'right' ? Position.Right : Position.Top,
      color: inputColor,
    }));
    
    outputs = Array.from({ length: outputCount }, (_, i) => ({
      id: `out_${i}`,
      label: `Output ${i + 1}`,
      position: outputPosition === 'top' ? Position.Top : outputPosition === 'left' ? Position.Left : outputPosition === 'right' ? Position.Right : Position.Bottom,
      color: outputColor,
    }));
  }

  return (
    <BaseNode
      id={id}
      type={type}
      data={data}
      selected={selected}
      color={colorClass}
      accentBar={accentBar}
      icon={icon}
      badgeColor={badgeColor}
      inputs={inputs}
      outputs={outputs}
    />
  );
}
