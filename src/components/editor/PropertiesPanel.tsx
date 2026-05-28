'use client';

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { 
  X, Info, Trash2, Settings, Type, AlignLeft, 
  ChevronLeft, ChevronRight, Sparkles, Sliders, User, 
  Zap, RefreshCw, Trash, Image as ImageIcon, Copy
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { NODE_SCHEMAS, type FieldSchema } from '@/lib/nodeSchemas';

interface CustomNodeData {
  label?: string;
  description?: string;
  delaySeconds?: number;
  httpMethod?: string;
  apiUrl?: string;
  sqlQuery?: string;
  aiModel?: string;
  aiPrompt?: string;
  customStyle?: {
    colorClass?: string;
    accentBar?: string;
    badgeColor?: string;
    iconName?: string;
    imageUrl?: string;
    hexBg?: string;
    hexBorder?: string;
    hexText?: string;
    borderRadius?: number;
    borderWidth?: number;
    width?: number;
    height?: number;
  };
  [key: string]: unknown;
}

interface PropertiesPanelProps {
  locale: string;
  userRole: string;
  workspaceId?: string;
  workflowId?: string;
  canvasBg?: 'zinc' | 'blue' | 'forest' | 'midnight';
  setCanvasBg?: (bg: 'zinc' | 'blue' | 'forest' | 'midnight') => void;
  canvasBgHex?: string | null;
  setCanvasBgHex?: (hex: string | null) => void;
  gridVariant?: 'dots' | 'lines' | 'none';
  setGridVariant?: (variant: 'dots' | 'lines' | 'none') => void;
}

const COLOR_PRESETS = [
  { name: 'Zinc Dark', key: 'zinc', colorClass: 'border-zinc-800 bg-zinc-950/90 text-zinc-100 dark:border-zinc-800/40', accentBar: 'bg-zinc-500', badgeColor: 'bg-zinc-500/10 text-zinc-400' },
  { name: 'Ocean Blue', key: 'blue', colorClass: 'border-blue-500/30 bg-blue-950/20 text-blue-400 dark:border-blue-500/40', accentBar: 'bg-blue-500', badgeColor: 'bg-blue-500/10 text-blue-400' },
  { name: 'Forest Emerald', key: 'emerald', colorClass: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400 dark:border-emerald-500/40', accentBar: 'bg-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-400' },
  { name: 'Amber Sunset', key: 'amber', colorClass: 'border-amber-500/30 bg-amber-950/20 text-amber-400 dark:border-amber-500/40', accentBar: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-400' },
  { name: 'Rose Fire', key: 'rose', colorClass: 'border-rose-500/30 bg-rose-950/20 text-rose-400 dark:border-rose-500/40', accentBar: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-400' },
  { name: 'Cosmic Purple', key: 'purple', colorClass: 'border-purple-500/30 bg-purple-950/20 text-purple-400 dark:border-purple-500/40', accentBar: 'bg-purple-500', badgeColor: 'bg-purple-500/10 text-purple-400' },
  { name: 'Cosmic Gold', key: 'gold', colorClass: 'border-yellow-500/30 bg-yellow-950/20 text-yellow-400 dark:border-yellow-500/40', accentBar: 'bg-yellow-500', badgeColor: 'bg-yellow-500/10 text-yellow-400' },
];

const ICON_PRESETS = [
  { label: 'Settings', value: 'settings' },
  { label: 'Play / Trigger', value: 'play' },
  { label: 'Stop / Terminal', value: 'stop' },
  { label: 'Branch / Fork', value: 'branch' },
  { label: 'Data Transform', value: 'data' },
  { label: 'API Send', value: 'send' },
  { label: 'Database Query', value: 'database' },
  { label: 'Checklist / Task', value: 'check' },
  { label: 'AI Agent Brain', value: 'ai' },
  { label: 'Timer Delay', value: 'timer' },
  { label: 'Loop Sync', value: 'loop' },
  { label: 'Heart', value: 'heart' },
  { label: 'Award', value: 'award' },
  { label: 'Shield / Security', value: 'shield' },
  { label: 'CPU / Process', value: 'cpu' },
  { label: 'Mail', value: 'mail' },
  { label: 'Notification Bell', value: 'bell' },
  { label: 'Global Network', value: 'globe' },
  { label: 'User Trigger', value: 'user' },
  { label: 'Power Zap', value: 'zap' },
  { label: 'Image Logo', value: 'image' },
  { label: 'Pulse Activity', value: 'activity' },
  { label: 'Cloud Function', value: 'cloud' },
  { label: 'Coding Script', value: 'code' },
  { label: 'Safe Lock', value: 'lock' },
  { label: 'Security Key', value: 'key' }
];

export function PropertiesPanel({ 
  locale, 
  userRole, 
  workspaceId,
  canvasBg = 'zinc',
  setCanvasBg,
  canvasBgHex = null,
  setCanvasBgHex,
  gridVariant = 'dots',
  setGridVariant
}: PropertiesPanelProps) {
  const isRtl = locale === 'ar';
  const supabase = createClient();
  
  const { 
    nodes, 
    edges, 
    selectedNodeId, 
    selectedEdgeId, 
    setSelectedNode, 
    setSelectedEdge, 
    updateNode, 
    addNode,
    deleteNode, 
    deleteEdge, 
    panels, 
    togglePanel 
  } = useEditorStore();

  const isOpen = panels.properties;
  const canEdit = ['owner', 'admin', 'editor'].includes(userRole);

  // Collaborators/members states
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current authenticated user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, [supabase]);

  // Fetch workspace members for Owner management panel
  useEffect(() => {
    const wsId = workspaceId;
    if (!wsId || !isOpen || selectedNodeId || selectedEdgeId) return;
    
    let active = true;
    async function fetchMembers() {
      setLoadingMembers(true);
      try {
        const { data, error } = await (supabase.from('workspace_members') as any)
          .select('user_id, role, joined_at, profiles:user_id (full_name, email, avatar_url)')
          .eq('workspace_id', wsId);
        
        if (data && active && !error) {
          setMembers(data);
        }
      } catch (e) {
        console.error('Failed to load workspace members:', e);
      } finally {
        if (active) setLoadingMembers(false);
      }
    }
    fetchMembers();
    
    return () => {
      active = false;
    };
  }, [workspaceId, isOpen, selectedNodeId, selectedEdgeId, supabase]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const nodeData = (selectedNode?.data || {}) as unknown as CustomNodeData;

  const schema = selectedNode && selectedNode.type ? NODE_SCHEMAS[selectedNode.type] : null;

  // Toggle drawer manually if not open
  if (!isOpen) {
    return (
      <button
        onClick={() => togglePanel('properties')}
        className={`absolute top-20 ${
          isRtl ? 'left-4' : 'right-4'
        } z-10 w-9 h-9 bg-background/95 border border-border shadow-md rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.03] focus:outline-hidden`}
        title="Open Inspector"
      >
        {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    );
  }

  // Handle updates to selected node fields
  const handleLabelChange = (val: string) => {
    if (!selectedNodeId) return;
    updateNode(selectedNodeId, { label: val });
  };

  const handleDescChange = (val: string) => {
    if (!selectedNodeId) return;
    updateNode(selectedNodeId, { description: val });
  };

  const handleCustomParamChange = (key: string, val: unknown) => {
    if (!selectedNodeId) return;
    updateNode(selectedNodeId, { [key]: val });
  };

  // Handle premium customization styling overrides
  const handleStyleChange = (preset: typeof COLOR_PRESETS[0]) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        colorClass: preset.colorClass,
        accentBar: preset.accentBar,
        badgeColor: preset.badgeColor,
      }
    });
  };

  const handleIconChange = (iconName: string) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        iconName,
      }
    });
  };

  const handleImageUrlChange = (imageUrl: string) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        imageUrl: imageUrl || undefined,
      }
    });
  };

  const handleHexBgChange = (hexBg: string) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        hexBg: hexBg || undefined,
      }
    });
  };

  const handleHexBorderChange = (hexBorder: string) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        hexBorder: hexBorder || undefined,
      }
    });
  };

  const handleHexTextChange = (hexText: string) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        hexText: hexText || undefined,
      }
    });
  };

  const handleBorderRadiusChange = (borderRadius: number) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        borderRadius,
      }
    });
  };

  const handleBorderWidthChange = (borderWidth: number) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        borderWidth,
      }
    });
  };

  const handleWidthChange = (width: number) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        width: width || undefined,
      }
    });
  };

  const handleHeightChange = (height: number) => {
    if (!selectedNodeId) return;
    const currentStyle = nodeData.customStyle || {};
    updateNode(selectedNodeId, {
      customStyle: {
        ...currentStyle,
        height: height || undefined,
      }
    });
  };

  const handleDuplicateNode = () => {
    if (!selectedNode || !canEdit) return;
    const clonedNode = {
      ...selectedNode,
      id: crypto.randomUUID(),
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
      selected: false,
    };
    addNode(clonedNode);
  };

  const handleTransferOwnership = async (targetUserId: string, targetName: string) => {
    if (userRole !== 'owner' || !workspaceId) {
      alert('Only the workspace owner can transfer ownership.');
      return;
    }
    const message = `WARNING: Are you sure you want to transfer ownership of this workspace to ${targetName}?\n\nYou will be downgraded to 'admin' and they will become the new sole 'owner' of this workspace. This action is irreversible.`;
    if (!confirm(message)) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('No authenticated user found');
      const currentUserId = userData.user.id;

      // Update workspace owner_id
      const { error: wsError } = await (supabase.from('workspaces') as any)
        .update({ owner_id: targetUserId })
        .eq('id', workspaceId);

      if (wsError) throw wsError;

      // Update target member role to owner
      const { error: targetError } = await (supabase.from('workspace_members') as any)
        .update({ role: 'owner' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUserId);

      if (targetError) throw targetError;

      // Update current user role to admin
      const { error: selfError } = await (supabase.from('workspace_members') as any)
        .update({ role: 'admin' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', currentUserId);

      if (selfError) throw selfError;

      alert('Ownership successfully transferred! The workspace will reload.');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err: any) {
      alert('Failed to transfer ownership: ' + (err.message || err));
      console.error('Transfer ownership failed:', err);
    }
  };

  // Manage workspace members
  const handleUpdateMemberRole = async (targetUserId: string, newRole: string) => {
    if (!canEdit || !workspaceId) return;
    const { error } = await (supabase.from('workspace_members') as any)
      .update({ role: newRole })
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);
    
    if (!error) {
      setMembers((prev) => prev.map((m) => m.user_id === targetUserId ? { ...m, role: newRole } : m));
      alert('Collaborator role successfully updated!');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (userRole !== 'owner' || !workspaceId) {
      alert('Only workspace owners can revoke access.');
      return;
    }
    if (!confirm('Are you sure you want to revoke access for this collaborator?')) return;
    
    const { error } = await (supabase.from('workspace_members') as any)
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);
    
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
      alert('Collaborator access successfully revoked.');
    }
  };

  // Filter configuration fields (everything except label and description)
  const configFields = schema 
    ? schema.fields.filter((f: FieldSchema) => f.key !== 'label' && f.key !== 'description') 
    : [];

  return (
    <aside className={`w-80 border-y-0 border-border bg-background/95 backdrop-blur-md flex flex-col h-full z-30 shrink-0 shadow-xl transition-all duration-300 md:shadow-none absolute md:relative top-0 bottom-0 ${
      isRtl ? 'left-0 border-r' : 'right-0 border-l'
    }`}>
      {/* 1. Header with Close Trigger */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-accent" />
          <h2 className="font-bold text-sm font-sans tracking-tight">Inspector Panel</h2>
        </div>
        <button
          onClick={() => togglePanel('properties')}
          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Main content based on selection */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {selectedNode ? (
          <div className="space-y-6">
            {/* Category header */}
            <div className="bg-muted/40 p-3 rounded-2xl border border-border/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent text-accent-foreground font-bold flex items-center justify-center uppercase text-sm">
                {selectedNode.type ? selectedNode.type.charAt(0) : 'N'}
              </div>
              <div>
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">
                  Node Class
                </h3>
                <p className="text-xs font-semibold capitalize text-foreground">
                  {selectedNode.type?.replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Core parameters Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nodeLabel" className="text-xs font-semibold flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Node Title</span>
                </Label>
                <Input
                  id="nodeLabel"
                  value={nodeData.label || ''}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  disabled={!canEdit}
                  className="rounded-xl border-border focus:ring-accent text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nodeDesc" className="text-xs font-semibold flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Description</span>
                </Label>
                <Textarea
                  id="nodeDesc"
                  value={nodeData.description || ''}
                  onChange={(e) => handleDescChange(e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                  className="rounded-xl border-border focus:ring-accent text-xs font-light"
                />
              </div>
            </div>

            <hr className="border-border" />

            {/* Node type specific custom parameters dynamically compiled */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-sans flex items-center gap-1 text-accent uppercase tracking-wider">
                Custom Configuration
              </h4>

              {configFields.length > 0 ? (
                configFields.map((field: FieldSchema) => {
                  const val = nodeData[field.key];
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={field.key} className="text-xs font-semibold">
                        {field.label}
                      </Label>

                      {field.type === 'text' && (
                        <Input
                          id={field.key}
                          value={String(val || field.default || '')}
                          onChange={(e) => handleCustomParamChange(field.key, e.target.value)}
                          disabled={!canEdit}
                          placeholder={field.placeholder}
                          className="rounded-xl border-border focus:ring-accent text-xs"
                        />
                      )}

                      {field.type === 'url' && (
                        <Input
                          id={field.key}
                          value={String(val || field.default || '')}
                          onChange={(e) => handleCustomParamChange(field.key, e.target.value)}
                          disabled={!canEdit}
                          type="url"
                          placeholder={field.placeholder}
                          className="rounded-xl border-border focus:ring-accent text-xs"
                        />
                      )}

                      {field.type === 'number' && (
                        <Input
                          id={field.key}
                          value={Number(val ?? field.default ?? 0)}
                          onChange={(e) => handleCustomParamChange(field.key, parseInt(e.target.value) || 0)}
                          disabled={!canEdit}
                          type="number"
                          placeholder={field.placeholder}
                          className="rounded-xl border-border focus:ring-accent text-xs"
                        />
                      )}

                      {field.type === 'textarea' && (
                        <Textarea
                          id={field.key}
                          value={String(val || field.default || '')}
                          onChange={(e) => handleCustomParamChange(field.key, e.target.value)}
                          disabled={!canEdit}
                          placeholder={field.placeholder}
                          rows={4}
                          className="rounded-xl border-border focus:ring-accent text-xs font-light"
                        />
                      )}

                      {field.type === 'select' && (
                        <Select
                          value={String(val || field.default || '')}
                          onValueChange={(value) => handleCustomParamChange(field.key, value || '')}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className="rounded-xl border-border text-xs">
                            <SelectValue placeholder={field.placeholder || "Select option"} />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border rounded-xl">
                            {field.options?.map((opt: { label: string; value: string }) => (
                              <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Fallback for JSON / Key-Value */}
                      {['json', 'key-value'].includes(field.type) && (
                        <Textarea
                          id={field.key}
                          value={typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '')}
                          onChange={(e) => {
                            if (field.type === 'json') {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                handleCustomParamChange(field.key, parsed as unknown as string);
                              } catch {
                                handleCustomParamChange(field.key, e.target.value);
                              }
                            } else {
                              handleCustomParamChange(field.key, e.target.value);
                            }
                          }}
                          disabled={!canEdit}
                          placeholder="{}"
                          rows={4}
                          className="font-mono text-[10px] rounded-xl border-border focus:ring-accent"
                        />
                      )}

                      {field.helpText && (
                        <p className="text-[10px] text-muted-foreground/60 font-light mt-0.5">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-[11px] font-light text-muted-foreground flex items-start gap-1.5 bg-muted/20 p-2.5 rounded-xl border border-border/10">
                  <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <span>No complex custom fields required. Standard operational details are used.</span>
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* Premium Style and Appearance controls */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-sans flex items-center gap-1.5 text-accent uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Style & Appearance</span>
              </h4>

              {/* Node background color selectors */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Background Theme Preset</Label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = nodeData.customStyle?.colorClass === preset.colorClass;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => canEdit && handleStyleChange(preset)}
                        disabled={!canEdit}
                        className={`h-7 rounded-lg border flex items-center justify-center text-[10px] font-semibold transition-all hover:scale-105 cursor-pointer ${preset.colorClass} ${
                          isSelected ? 'ring-2 ring-accent ring-offset-1 scale-105' : 'opacity-85 hover:opacity-100'
                        }`}
                        title={preset.name}
                      >
                        {preset.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex Color Pickers */}
              <div className="space-y-2.5 border-t border-border/40 pt-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Custom Color Pickers</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1 items-center bg-muted/20 p-2 rounded-xl border border-border/10">
                    <span className="text-[9px] text-muted-foreground font-semibold">Background</span>
                    <input
                      type="color"
                      value={nodeData.customStyle?.hexBg || '#0a0a0a'}
                      onChange={(e) => canEdit && handleHexBgChange(e.target.value)}
                      disabled={!canEdit}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-border/30 bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-1 items-center bg-muted/20 p-2 rounded-xl border border-border/10">
                    <span className="text-[9px] text-muted-foreground font-semibold">Border</span>
                    <input
                      type="color"
                      value={nodeData.customStyle?.hexBorder || '#27272a'}
                      onChange={(e) => canEdit && handleHexBorderChange(e.target.value)}
                      disabled={!canEdit}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-border/30 bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-1 items-center bg-muted/20 p-2 rounded-xl border border-border/10">
                    <span className="text-[9px] text-muted-foreground font-semibold">Text</span>
                    <input
                      type="color"
                      value={nodeData.customStyle?.hexText || '#ffffff'}
                      onChange={(e) => canEdit && handleHexTextChange(e.target.value)}
                      disabled={!canEdit}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-border/30 bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Layout & Geometry sliders */}
              <div className="space-y-3.5 border-t border-border/40 pt-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Layout & Geometry</Label>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Width ({nodeData.customStyle?.width || 220}px)</span>
                    <span>150 - 400</span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={400}
                    value={nodeData.customStyle?.width || 220}
                    onChange={(e) => canEdit && handleWidthChange(parseInt(e.target.value))}
                    disabled={!canEdit}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Height ({nodeData.customStyle?.height || 90}px)</span>
                    <span>60 - 300</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={300}
                    value={nodeData.customStyle?.height || 90}
                    onChange={(e) => canEdit && handleHeightChange(parseInt(e.target.value))}
                    disabled={!canEdit}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Border Radius ({nodeData.customStyle?.borderRadius ?? 16}px)</span>
                    <span>0 - 40</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={nodeData.customStyle?.borderRadius ?? 16}
                    onChange={(e) => canEdit && handleBorderRadiusChange(parseInt(e.target.value))}
                    disabled={!canEdit}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Border Width ({nodeData.customStyle?.borderWidth ?? 1}px)</span>
                    <span>0 - 10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={nodeData.customStyle?.borderWidth ?? 1}
                    onChange={(e) => canEdit && handleBorderWidthChange(parseInt(e.target.value))}
                    disabled={!canEdit}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>

              {/* Icon presets */}
              <div className="space-y-2 border-t border-border/40 pt-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Lucide Symbol Icon</Label>
                <Select
                  value={(nodeData.customStyle?.iconName || 'settings') as string}
                  onValueChange={(val) => canEdit && handleIconChange(val || 'settings')}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="rounded-xl border-border text-xs">
                    <SelectValue placeholder="Choose icon..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border rounded-xl">
                    {ICON_PRESETS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="cursor-pointer capitalize text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Image URL */}
              <div className="space-y-1.5">
                <Label htmlFor="nodeImageUrl" className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Custom Image Logo URL</span>
                </Label>
                <Input
                  id="nodeImageUrl"
                  value={nodeData.customStyle?.imageUrl || ''}
                  onChange={(e) => canEdit && handleImageUrlChange(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://example.com/logo.svg"
                  type="url"
                  className="rounded-xl border-border focus:ring-accent text-xs"
                />
                <p className="text-[9px] text-muted-foreground/60 leading-tight">
                  Input a direct URL to an image or custom SVG vector. Overrides the Lucide icon preset automatically!
                </p>
              </div>
            </div>

            {/* Actions: Duplicate / Delete Node */}
            {canEdit && (
              <div className="pt-4 border-t border-border flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDuplicateNode}
                  className="flex-1 justify-center bg-accent/10 border-accent/20 hover:bg-accent hover:text-accent-foreground text-accent rounded-xl font-semibold gap-1.5 h-9 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Duplicate</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    deleteNode(selectedNode.id);
                    setSelectedNode(null);
                  }}
                  className="flex-1 justify-center bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground rounded-xl font-semibold gap-1.5 h-9 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            )}
          </div>
        ) : selectedEdge ? (
          <div className="space-y-6">
            <div className="bg-muted/40 p-3 rounded-2xl border border-border/30">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">
                Connecting Edge
              </h3>
              <p className="text-xs font-mono text-foreground mt-0.5">
                {selectedEdge.source.slice(0, 5)} → {selectedEdge.target.slice(0, 5)}
              </p>
            </div>

            <div className="text-xs font-light text-muted-foreground space-y-2">
              <p>This line links the outputs of the source node directly to the inputs of the target node.</p>
              <p>Type: <span className="font-mono text-foreground font-semibold">Bezier Line</span></p>
            </div>

            {/* Actions: Delete Edge */}
            {canEdit && (
              <div className="pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    deleteEdge(selectedEdge.id);
                    setSelectedEdge(null);
                  }}
                  className="w-full justify-center bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground rounded-xl font-semibold gap-1.5 h-9 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Link</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ── CANVAS & COLLABORATORS SYSTEM PANEL (WHEN NO NODE SELECTED) ── */
          <div className="space-y-6">
            <div className="bg-muted/40 p-3 rounded-2xl border border-border/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent text-accent-foreground font-bold flex items-center justify-center">
                <Sliders className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">
                  Canvas Inspector
                </h3>
                <p className="text-[10px] text-muted-foreground/60 leading-snug">Configure workspace theme & manage collaborators.</p>
              </div>
            </div>

            {/* A. Canvas Styling */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-sans flex items-center gap-1.5 text-accent uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Canvas Themes</span>
              </h4>

              {/* Background radial glows triggers */}
              {setCanvasBg && (
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Canvas Background Glow</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'zinc', name: 'Dark Zinc', style: 'bg-zinc-900 text-zinc-100' },
                      { key: 'blue', name: 'Ocean Blue', style: 'bg-blue-950/40 text-blue-400 border-blue-500/20' },
                      { key: 'forest', name: 'Forest Emerald', style: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' },
                      { key: 'midnight', name: 'Cosmic Purple', style: 'bg-violet-950/40 text-violet-400 border-violet-500/20' }
                    ].map((theme) => {
                      const isSelected = !canvasBgHex && canvasBg === theme.key;
                      return (
                        <button
                          key={theme.key}
                          onClick={() => {
                            if (setCanvasBgHex) setCanvasBgHex(null);
                            setCanvasBg(theme.key as any);
                          }}
                          className={`h-9 px-2 rounded-xl border flex items-center justify-center text-xs font-bold transition-all hover:scale-105 cursor-pointer ${theme.style} ${
                            isSelected ? 'ring-2 ring-accent ring-offset-1 scale-105' : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          {theme.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Canvas Hex Color Picker */}
              {setCanvasBgHex && (
                <div className="space-y-2 border-t border-border/40 pt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Custom Space Glow Hex</Label>
                    <p className="text-[9px] text-muted-foreground/60 leading-tight">Pick a custom color aura for your radial canvas grid</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canvasBgHex && (
                      <button 
                        onClick={() => setCanvasBgHex(null)}
                        className="text-[9px] font-bold text-rose-500 border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 rounded-md hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <input
                      type="color"
                      value={canvasBgHex || '#000000'}
                      onChange={(e) => setCanvasBgHex(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-border/30 bg-transparent shrink-0"
                    />
                  </div>
                </div>
              )}

              {/* Grid design selector */}
              {setGridVariant && (
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Grid Design Style</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'dots', name: 'Dots' },
                      { key: 'lines', name: 'Lines' },
                      { key: 'none', name: 'Blank' }
                    ].map((variant) => {
                      const isSelected = gridVariant === variant.key;
                      return (
                        <button
                          key={variant.key}
                          onClick={() => setGridVariant(variant.key as any)}
                          className={`h-8 rounded-xl border border-border text-xs font-semibold bg-background hover:bg-muted transition-all cursor-pointer ${
                            isSelected ? 'ring-2 ring-accent text-accent border-accent/20 bg-accent/5' : 'text-muted-foreground'
                          }`}
                        >
                          {variant.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* B. Collaboration & Members Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-sans flex items-center gap-1.5 text-accent uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  <span>Workspace Members</span>
                </h4>
                {members.length > 0 && (
                  <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-muted border border-border/40 text-muted-foreground">
                    {members.length} active
                  </span>
                )}
              </div>

              {loadingMembers ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-light flex items-center justify-center gap-2">
                  <RefreshCw className="w-4.5 h-4.5 animate-spin text-accent" />
                  <span>Syncing collaborators list...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="text-[11px] font-light text-muted-foreground flex items-start gap-1.5 bg-muted/20 p-3 rounded-2xl border border-border/10">
                  <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <span>No guest collaborators in this workspace. Copy your share link from the toolbar above to invite players!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((memberRecord) => {
                    const isSelf = memberRecord.user_id === currentUserId;
                    const profile = memberRecord.profiles || {};
                    const fullName = profile.full_name || 'Collaborator';
                    const email = profile.email || '';
                    
                    return (
                      <div 
                        key={memberRecord.user_id} 
                        className="p-3 border border-border bg-background/50 backdrop-blur-xs rounded-2xl flex flex-col gap-2 relative overflow-hidden group shadow-xs hover:border-accent/20 transition-all"
                      >
                        {/* Member general profile info */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} className="w-8 h-8 rounded-full border border-border shrink-0 object-cover" alt="avatar" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-extrabold flex items-center justify-center shrink-0 uppercase text-xs">
                              {fullName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs font-sans text-foreground truncate">
                              {fullName} {isSelf && <span className="text-[10px] font-normal text-muted-foreground/60">({locale === 'ar' ? 'أنت' : 'You'})</span>}
                            </h4>
                            <p className="text-[9px] font-light text-muted-foreground truncate leading-none mt-0.5">{email}</p>
                          </div>
                        </div>

                        {/* Interactive Role Management & Revocation */}
                        <div className="flex items-center justify-between gap-3 mt-1 pt-2 border-t border-border/40">
                          {/* Role selector dropdown */}
                          <div className="flex-1">
                            {canEdit && memberRecord.role !== 'owner' ? (
                              <Select
                                value={memberRecord.role || 'viewer'}
                                onValueChange={(val) => handleUpdateMemberRole(memberRecord.user_id, val)}
                              >
                                <SelectTrigger className="h-7 rounded-lg border-border text-[10px] font-semibold bg-background py-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background border border-border rounded-xl">
                                  {['editor', 'commenter', 'viewer'].map((roleKey) => (
                                    <SelectItem key={roleKey} value={roleKey} className="cursor-pointer capitalize text-[10px]">
                                      {roleKey}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 pl-1.5">
                                {memberRecord.role || ''}
                              </span>
                            )}
                          </div>

                          {/* Revoke & Transfer actions (Owner only, can't revoke owner) */}
                          {userRole === 'owner' && memberRecord.role !== 'owner' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleTransferOwnership(memberRecord.user_id, fullName)}
                                className="h-7 px-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500 hover:text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                                title="Transfer Ownership"
                              >
                                <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                                <span>Transfer</span>
                              </button>
                              
                              <button
                                onClick={() => handleRemoveMember(memberRecord.user_id)}
                                className="h-7 px-2.5 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.02]"
                                title="Revoke access"
                              >
                                <Trash className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
