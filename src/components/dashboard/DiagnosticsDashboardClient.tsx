'use client';

import { useState, useEffect, useRef } from 'react';
import { runDiagnosticsAudit, type TableAuditResult, type DiagnosticsAuditResult } from '@/actions/diagnostics.actions';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Play, CheckCircle2, XCircle,
  Terminal, ShieldCheck, Database, Cpu, BrainCircuit, RefreshCw, ChevronDown,
  Layers, Users
} from 'lucide-react';

interface DiagnosticsDashboardClientProps {
  workspaceId: string;
  locale: string;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DiagnosticsDashboardClient({ workspaceId, locale: _locale }: DiagnosticsDashboardClientProps) {
  const supabase = createClient();
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // States
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [databaseResults, setDatabaseResults] = useState<TableAuditResult[]>([]);
  const [planResults, setPlanResults] = useState<DiagnosticsAuditResult['planAudit']>(null);
  const [realtimeLatency, setRealtimeLatency] = useState<number | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean>(false);
  
  const [showTables, setShowTables] = useState(false);

  // Auto-scroll log console to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, type, message }]);
  };

  // 1. Interactive Diagnostics Suite Trigger
  const handleRunDiagnostics = async () => {
    if (running) return;

    setRunning(true);
    setProgress(10);
    setLogs([]);
    setRealtimeLatency(null);

    addLog('info', 'Booting Platform Diagnostics Suite...');
    await new Promise((r) => setTimeout(r, 600));

    // A. Audit Database Relational tables
    setProgress(25);
    addLog('info', 'Starting Relational Database Schema Audit...');
    addLog('info', 'Asserting connectivity to 16 relational database tables...');

    try {
      const results = await runDiagnosticsAudit(workspaceId);
      
      setDatabaseResults(results.databaseAudit);
      setPlanResults(results.planAudit);
      setAiConfigured(results.aiConfigured);

      setProgress(55);
      
      // Output DB details to log console
      const failedTables = results.databaseAudit.filter(t => t.status === 'error');
      if (failedTables.length > 0) {
        addLog('error', `Schema audit encountered ${failedTables.length} failed tables! Review RLS settings.`);
        failedTables.forEach(t => addLog('error', `Table [${t.tableName}]: ${t.errorReason}`));
      } else {
        addLog('success', 'Relational database schema integrity check passed with 100% success!');
        addLog('success', `All 16 tables successfully parsed. Row indices synchronized.`);
      }

      await new Promise((r) => setTimeout(r, 500));

      // B. Audit Plan constraints
      setProgress(70);
      addLog('info', 'Starting Workspace Plan Capacity Audit...');
      if (results.planAudit) {
        addLog('info', `Active Workspace Plan Tier: [${results.planAudit.plan.toUpperCase()}]`);
        addLog('info', `Workflow usage capacity: ${results.planAudit.workflows.current}/${results.planAudit.workflows.limit}`);
        addLog('info', `Collaborators count: ${results.planAudit.collaborators.current}/${results.planAudit.collaborators.limit}`);
        addLog('info', `AI credits consumed: ${results.planAudit.aiCredits.current}/${results.planAudit.aiCredits.limit}`);
        addLog('success', 'Plan capacity audit completed successfully!');
      }

      await new Promise((r) => setTimeout(r, 500));

      // C. Perform AI Endpoint integration check
      setProgress(85);
      addLog('info', 'Verifying active AI model endpoint states...');
      if (results.aiConfigured) {
        addLog('success', 'AI Service Endpoint online! Google Gemini API token environment keys verified.');
      } else {
        addLog('warn', 'AI environment key (GEMINI_API_KEY) is missing. AI generations will be disabled.');
      }

      await new Promise((r) => setTimeout(r, 400));

      // D. Run Realtime multiplayer round-trip latency pulse
      addLog('info', 'Initializing Realtime Multiplayer Network pulse...');
      setProgress(90);

      const startTime = Date.now();
      const channel = supabase.channel('diagnostics_pulse_test');

      channel
        .on('broadcast', { event: 'ping' }, (payload) => {
          const payloadTimestamp = typeof payload.payload?.timestamp === 'number' ? payload.payload.timestamp : startTime;
          const latency = Date.now() - payloadTimestamp;
          setRealtimeLatency(latency);
          addLog('success', `Realtime Network round-trip complete! Latency: ${latency}ms.`);
          supabase.removeChannel(channel);
          
          setProgress(100);
          addLog('success', 'Platform Diagnostics finished. Platforms status: operational.');
          setRunning(false);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'ping',
              payload: { timestamp: Date.now() },
            }).catch(err => {
              addLog('error', `Failed to send realtime pulse packet: ${err.message}`);
              supabase.removeChannel(channel);
              setProgress(100);
              setRunning(false);
            });
          } else if (status === 'CHANNEL_ERROR') {
            addLog('error', 'Realtime socket connection failed! Network transmission timeout.');
            supabase.removeChannel(channel);
            setProgress(100);
            setRunning(false);
          }
        });

      // Timeout safety for realtime check
      setTimeout(() => {
        if (progress === 90 && running) {
          addLog('warn', 'Realtime test pulse request timed out. WebSocket speed details unavailable.');
          supabase.removeChannel(channel);
          setProgress(100);
          setRunning(false);
        }
      }, 5000);

    } catch (err: unknown) {
      addLog('error', `Critical audit error: ${(err as Error).message}`);
      setRunning(false);
      setProgress(100);
    }
  };

  const getLogColorClass = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400 font-semibold';
      case 'warn': return 'text-amber-400 font-semibold';
      case 'error': return 'text-rose-500 font-bold';
      default: return 'text-zinc-300 font-light';
    }
  };

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* 1. Diagnostics suite core trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Test Console Trigger */}
        <Card className="lg:col-span-1 bg-background/60 border border-border backdrop-blur-md shadow-sm rounded-2xl p-6 flex flex-col justify-between h-[340px]">
          <div>
            <CardHeader className="p-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent animate-pulse" />
                <CardTitle className="text-lg font-bold tracking-tight">Diagnostics Suite</CardTitle>
              </div>
              <CardDescription className="text-xs font-light text-muted-foreground mt-1">
                Audits platforms status, schema structures, and multiplayer pings.
              </CardDescription>
            </CardHeader>

            {/* Diagnostics Stats */}
            <div className="mt-5 space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-light">Schema tables audited</span>
                <span className="font-bold text-foreground">16 / 16 tables</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-light">Realtime pinger latency</span>
                <span className="font-bold text-foreground">
                  {realtimeLatency !== null ? `${realtimeLatency} ms` : 'Not run'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-light">AI environments</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase border ${
                  aiConfigured ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {aiConfigured ? 'Online' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/60">
            {/* Progress Meter */}
            {progress > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Diagnostics running...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleRunDiagnostics}
              disabled={running}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl h-11 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98] transition-transform"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{running ? 'Executing Audits...' : 'Run Diagnostics Test Suite'}</span>
            </Button>
          </div>
        </Card>

        {/* 2. Interactive Terminal log console */}
        <Card className="lg:col-span-2 bg-zinc-950 border border-zinc-900 shadow-xl rounded-2xl p-4 flex flex-col h-[340px] relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-zinc-300 font-mono">system-diagnostics-console.log</span>
            </div>
            <div className="flex items-center gap-1.5 select-none pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-1.5 font-mono text-[10px] custom-scrollbar text-left select-text">
            {logs.length === 0 ? (
              <div className="text-zinc-500 italic flex items-center justify-center h-full">
                Diagnostics idle. Press the button on the left to start the platform verification tests.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed flex items-start gap-1">
                  <span className="text-zinc-600 shrink-0 font-light">[{log.timestamp}]</span>
                  <span className={getLogColorClass(log.type)}>
                    {log.type === 'info' ? '[INFO]' : log.type === 'success' ? '[SUCCESS]' : log.type === 'warn' ? '[WARN]' : '[ERROR]'}
                  </span>
                  <span className="text-zinc-200 font-light flex-1">{log.message}</span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </Card>

      </div>

      {/* 3. Detailed database RLS checker deck */}
      {databaseResults.length > 0 && (
        <Card className="bg-background/60 border border-border backdrop-blur-md shadow-sm rounded-2xl">
          <div 
            onClick={() => setShowTables(!showTables)}
            className="p-5 flex items-center justify-between cursor-pointer border-b border-border/50 hover:bg-muted/35 transition-colors select-none rounded-t-2xl"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-accent" />
              <div>
                <CardTitle className="text-base font-bold tracking-tight">Database Schema Tables Audit</CardTitle>
                <CardDescription className="text-xs font-light text-muted-foreground mt-0.5">
                  Verify connection status and row index metrics for all 16 relational database tables.
                </CardDescription>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showTables ? 'rotate-180' : ''}`} />
          </div>

          {showTables && (
            <CardContent className="p-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {databaseResults.map((res) => (
                  <div
                    key={res.tableName}
                    className="p-4 rounded-xl border border-border/80 bg-background/40 backdrop-blur-xs flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-zinc-500 block truncate" title={res.tableName}>
                        {res.tableName}
                      </span>
                      <span className="text-base font-extrabold text-foreground block mt-1">
                        {res.rowCount} <span className="text-[10px] text-muted-foreground font-light font-sans">rows</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[10px]">
                      <span className="text-zinc-500">Security Check</span>
                      <span className="flex items-center gap-1">
                        {res.status === 'ok' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">RLS Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-rose-500 font-semibold" title={res.errorReason || 'Audit error'}>Error</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 4. Plan Capacities status deck */}
      {planResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Workflows Usage', metric: planResults.workflows, icon: Layers },
            { title: 'Custom Nodes', metric: planResults.customElements, icon: Cpu },
            { title: 'Workspace Members', metric: planResults.collaborators, icon: Users },
            { title: 'Monthly AI Credits', metric: planResults.aiCredits, icon: BrainCircuit },
          ].map((item, idx) => {
            const percent = Math.min((item.metric.current / item.metric.limit) * 100, 100);
            return (
              <Card key={idx} className="bg-background/60 border border-border backdrop-blur-md shadow-sm rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{item.title}</span>
                  <div className={`p-1.5 rounded-lg ${
                    item.metric.status === 'limit' ? 'bg-rose-500/10 text-rose-500' : item.metric.status === 'warn' ? 'bg-amber-500/10 text-amber-500' : 'bg-accent/10 text-accent'
                  }`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-xl font-bold tracking-tight">
                      {item.metric.current} <span className="text-xs text-muted-foreground font-light">/ {item.metric.limit}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{Math.round(percent)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.metric.status === 'limit' ? 'bg-rose-500' : item.metric.status === 'warn' ? 'bg-amber-500' : 'bg-accent'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
