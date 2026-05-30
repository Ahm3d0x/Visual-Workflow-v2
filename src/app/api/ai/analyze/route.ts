import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkPlanLimit } from '@/lib/planLimits';

const ANALYZE_COST = 5;

interface AnalysisIssue {
  severity: 'error' | 'warning' | 'info';
  node_id: string | null;
  title: string;
  description: string;
  fix_suggestion?: string;
  fix_nodes?: Array<{ id: string; type: string; position: { x: number; y: number }; data: { label: string; description: string } }>;
  fix_edges?: Array<{ id: string; source: string; target: string; sourceHandle: string; targetHandle: string }>;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Auth guard
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nodes, edges, workflowId, workspaceId } = await request.json();

    if (!workspaceId || !nodes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ issues: [], healthScore: 0, message: 'Canvas is empty — add nodes to analyze.' });
    }

    // Create admin client to bypass RLS for billing and logging
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Credits check
    const creditCheck = await checkPlanLimit(supabaseAdmin, workspaceId, 'ai_credits');
    if (creditCheck.current + ANALYZE_COST > creditCheck.limit) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: `Insufficient AI credits. Used ${creditCheck.current}/${creditCheck.limit} this month.`,
        },
        { status: 403 }
      );
    }

    // 3. Build detailed workflow summary for analysis
    const workflowSummary = {
      nodeCount: nodes.length,
      edgeCount: edges?.length ?? 0,
      nodes: nodes.map((n: { id: string; type: string; position: { x: number; y: number }; data: { label?: string; description?: string } }) => ({
        id: n.id,
        type: n.type,
        label: n.data?.label,
        description: n.data?.description,
        position: n.position,
      })),
      edges: (edges || []).map((e: { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    };

    // Node type stats for complexity analysis
    const nodeTypes = nodes.map((n: { type: string }) => n.type);
    const uniqueNodeTypes = [...new Set(nodeTypes)];
    const branchNodes = nodes.filter((n: { type: string }) =>
      ['if_else', 'decision', 'switch', 'approval', 'error_handler', 'ai_route', 'filter'].includes(n.type)
    );
    const parallelNodes = nodes.filter((n: { type: string }) => n.type === 'parallel');
    const mergeNodes = nodes.filter((n: { type: string }) => n.type === 'merge');
    const errorHandlers = nodes.filter((n: { type: string }) => ['error_handler', 'retry'].includes(n.type));
    const apiNodes = nodes.filter((n: { type: string }) => ['api_request', 'webhook'].includes(n.type));

    const systemPrompt = `You are an expert workflow quality analyst and architect. You perform DEEP, production-grade analysis on visual workflow diagrams.

Analyze the provided workflow and return a comprehensive quality report.

═══════════════════════════════════════════════════════
ANALYSIS CATEGORIES — Check ALL of these exhaustively:
═══════════════════════════════════════════════════════

STRUCTURAL ISSUES (severity: "error"):
1. Dead-end nodes: Nodes with no outgoing edges (except "end" and "output" nodes)
2. Disconnected/orphan nodes: Nodes not reachable from any "start" or "input" node
3. Missing start: No "start" or "input" node exists
4. Missing end: No path terminates at an "end" or "output" node
5. Circular deadlocks: Loops with no exit condition
6. Isolated subgraphs: Groups of nodes completely disconnected from main flow
7. Invalid handle connections: Edges using handles that don't exist on the node type

RESILIENCE ISSUES (severity: "warning"):
8. Unprotected API calls: "api_request" or "webhook" nodes without error handling (their "error" output is not connected)
9. Missing retry logic: API calls without retry patterns
10. Approval without rejection path: "approval" nodes where the "reject" output goes nowhere
11. Decision without both branches: "if_else" or "decision" nodes missing a "true" or "false" branch
12. Parallel without merge: "parallel" nodes without a corresponding "merge" downstream
13. Missing error notification: Error paths that silently terminate without notification

OPTIMIZATION OPPORTUNITIES (severity: "info"):
14. Sequential tasks that could run in parallel
15. Redundant nodes: Multiple identical process steps that could be consolidated
16. Missing AI enhancement: Manual classification/extraction that could use AI nodes
17. Missing data validation: User inputs without validation steps
18. Low node diversity: Over-reliance on "process" nodes when specific types exist

For EACH issue, provide:
- A concrete "fix_suggestion" explaining exactly what to do
- When possible, provide "fix_nodes" (nodes to add) and "fix_edges" (edges to add) to fix the issue

HEALTH SCORE CALCULATION:
- Start at 100 points
- Each "error" deducts 15 points
- Each "warning" deducts 8 points  
- Each "info" deducts 3 points
- Minimum score is 0

COMPLEXITY RATING based on:
- Node count, unique types used, branching depth, parallel sections, error handling coverage

LARGE WORKFLOW CAPPING RULE (CRITICAL):
- If the total node count is large (> 40 nodes), focus strictly on the most critical structural errors (orphans, dead-ends) and high-priority resilience issues (unprotected API calls).
- Do not list minor or repetitive info items. CAP the returned "issues" array at a maximum of 12 items. This is essential to prevent long generations and timeouts on large workflows.

Context about this workflow:
- Total nodes: ${nodes.length} | Total edges: ${edges?.length ?? 0}
- Unique node types: ${uniqueNodeTypes.join(', ')}
- Branch nodes: ${branchNodes.length} | Parallel: ${parallelNodes.length} | Merge: ${mergeNodes.length}
- Error handlers: ${errorHandlers.length} | API/Webhook nodes: ${apiNodes.length}

Respond ONLY with a JSON object (no markdown):
{
  "healthScore": 85,
  "complexityRating": "moderate",
  "issues": [
    {
      "severity": "error",
      "node_id": "node_1",
      "title": "Dead-end node",
      "description": "Node 'Send Email' has no outgoing connections, creating a dead end.",
      "fix_suggestion": "Connect this node to an 'end' node or the next step in the workflow.",
      "fix_nodes": [
        {"id": "fix_end_1", "type": "end", "position": {"x": 250, "y": 800}, "data": {"label": "Flow Complete", "description": "Terminates this path"}}
      ],
      "fix_edges": [
        {"id": "fix_edge_1", "source": "node_1", "target": "fix_end_1", "sourceHandle": "out", "targetHandle": "in"}
      ]
    }
  ]
}

complexityRating options: "trivial" | "simple" | "moderate" | "complex" | "enterprise"`;

    // 4. Call Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const completion = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nWorkflow Data:\n${JSON.stringify(workflowSummary)}` }] }
      ]
    });

    const rawContent = completion.response.text();
    if (!rawContent) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(rawContent);

    // Normalize response format
    const issues: AnalysisIssue[] = parsed.issues || (Array.isArray(parsed) ? parsed : []);
    const healthScore = typeof parsed.healthScore === 'number' ? Math.max(0, Math.min(100, parsed.healthScore)) : null;
    const complexityRating = parsed.complexityRating || 'unknown';

    // If AI didn't compute health score, compute it ourselves
    const computedHealthScore = healthScore ?? Math.max(0, 100
      - issues.filter(i => i.severity === 'error').length * 15
      - issues.filter(i => i.severity === 'warning').length * 8
      - issues.filter(i => i.severity === 'info').length * 3
    );

    // 5. Log usage
    const prompt_tokens = completion.response.usageMetadata?.promptTokenCount ?? 0;
    const completion_tokens = completion.response.usageMetadata?.candidatesTokenCount ?? 0;

    const aiRequestData = {
      workspace_id: workspaceId,
      user_id: user.id,
      workflow_id: workflowId || null,
      action: 'analyze',
      prompt_tokens,
      completion_tokens,
      credits_used: ANALYZE_COST,
      status: 'success',
    };

    await (supabaseAdmin.from('ai_requests') as unknown as {
      insert: (data: typeof aiRequestData) => Promise<{ error: { message: string } | null }>;
    }).insert(aiRequestData);

    return NextResponse.json({
      issues,
      healthScore: computedHealthScore,
      complexityRating,
      stats: {
        errorCount: issues.filter(i => i.severity === 'error').length,
        warningCount: issues.filter(i => i.severity === 'warning').length,
        infoCount: issues.filter(i => i.severity === 'info').length,
        totalNodes: nodes.length,
        totalEdges: edges?.length ?? 0,
        uniqueTypes: uniqueNodeTypes.length,
        branchNodes: branchNodes.length,
        parallelNodes: parallelNodes.length,
        errorHandlers: errorHandlers.length,
      },
      creditsUsed: ANALYZE_COST,
      creditsRemaining: creditCheck.limit - creditCheck.current - ANALYZE_COST,
    });
  } catch (error) {
    console.error('[AI Analyze]', error);
    return NextResponse.json(
      { error: 'Workflow analysis failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
