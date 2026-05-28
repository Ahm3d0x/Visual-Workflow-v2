'use client';

import { useEditorStore } from '@/stores/editorStore';
import { 
  X, Info, Trash2, Settings, Type, AlignLeft, 
  ChevronLeft, ChevronRight 
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
  [key: string]: string | number | boolean | undefined;
}

interface PropertiesPanelProps {
  locale: string;
  userRole: string;
}

export function PropertiesPanel({ locale, userRole }: PropertiesPanelProps) {
  const isRtl = locale === 'ar';
  const { 
    nodes, 
    edges, 
    selectedNodeId, 
    selectedEdgeId, 
    setSelectedNode, 
    setSelectedEdge, 
    updateNode, 
    deleteNode, 
    deleteEdge, 
    panels, 
    togglePanel 
  } = useEditorStore();

  const isOpen = panels.properties;
  const canEdit = ['owner', 'admin', 'editor'].includes(userRole);

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

  const handleCustomParamChange = (key: string, val: string | number | boolean) => {
    if (!selectedNodeId) return;
    updateNode(selectedNodeId, { [key]: val });
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

            {/* Actions: Delete Node */}
            {canEdit && (
              <div className="pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    deleteNode(selectedNode.id);
                    setSelectedNode(null);
                  }}
                  className="w-full justify-center bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground rounded-xl font-semibold gap-1.5 h-9 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Node</span>
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
          <div className="text-center py-20 space-y-2">
            <Info className="w-8 h-8 mx-auto text-muted-foreground/35" />
            <p className="text-xs text-muted-foreground font-light max-w-[180px] mx-auto leading-relaxed">
              Select a node or connecting line link on the editor canvas to inspect and configure parameters.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
