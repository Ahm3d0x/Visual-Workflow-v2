import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/planLimits';

const ANALYZE_COST = 5;

interface AnalysisIssue {
  severity: 'error' | 'warning' | 'info';
  node_id: string | null;
  title: string;
  description: string;
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
      return NextResponse.json({ issues: [], message: 'Canvas is empty — add nodes to analyze.' });
    }

    // 2. Credits check
    const creditCheck = await checkPlanLimit(supabase, workspaceId, 'ai_credits');
    if (creditCheck.current + ANALYZE_COST > creditCheck.limit) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: `Insufficient AI credits. Used ${creditCheck.current}/${creditCheck.limit} this month.`,
        },
        { status: 403 }
      );
    }

    // 3. Build workflow summary for analysis
    const workflowSummary = {
      nodeCount: nodes.length,
      edgeCount: edges?.length ?? 0,
      nodes: nodes.map((n: { id: string; type: string; data: { label?: string } }) => ({
        id: n.id,
        type: n.type,
        label: n.data?.label,
      })),
      edges: (edges || []).map((e: { id: string; source: string; target: string; sourceHandle?: string }) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        handle: e.sourceHandle,
      })),
    };

    const systemPrompt = `You are a workflow quality analyst specializing in visual workflow diagrams.
Analyze the provided workflow JSON and identify structural problems.

Look for these issues:
1. Dead-end nodes: nodes with no outgoing edges (except "end" nodes)
2. Disconnected nodes: nodes not reachable from a "start" node
3. Missing fallback: decision/if_else/switch nodes without both true and false branches
4. No start node: workflow has no starting point
5. No end node: workflow has no termination point  
6. Circular dependencies: edges that create unreachable loops
7. Isolated subgraphs: groups of nodes not connected to the main flow
8. Empty labels: nodes with missing or generic labels like "undefined"
9. Missing connections: API/webhook nodes without error handling branches

Respond ONLY with a JSON array (no markdown):
[
  {
    "severity": "error",
    "node_id": "node_1",
    "title": "Dead-end node",
    "description": "This node has no outgoing connections. Connect it to the next step or an end node."
  }
]

If no issues found, return an empty array: []`;

    // 4. Call Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    // Use gemini-2.5-flash for rapid, highly detailed quality analysis
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const completion = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nWorkflow Summary:\n${JSON.stringify(workflowSummary)}` }] }
      ]
    });

    const rawContent = completion.response.text();
    if (!rawContent) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(rawContent);
    // Handle both { issues: [...] } and [...] response formats
    const issues: AnalysisIssue[] = Array.isArray(parsed) ? parsed : (parsed.issues || []);

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

    await (supabase.from('ai_requests') as unknown as {
      insert: (data: typeof aiRequestData) => Promise<{ error: { message: string } | null }>;
    }).insert(aiRequestData);

    return NextResponse.json({
      issues,
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
