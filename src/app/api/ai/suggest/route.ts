import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkPlanLimit } from '@/lib/planLimits';

const SUGGEST_COST = 5;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Auth guard
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nodes, edges, workflowId, workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
    }

    // Create admin client to bypass RLS for billing and logging
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Credits check
    const creditCheck = await checkPlanLimit(supabaseAdmin, workspaceId, 'ai_credits');
    if (creditCheck.current + SUGGEST_COST > creditCheck.limit) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: `Insufficient AI credits. Used ${creditCheck.current}/${creditCheck.limit} this month.`,
        },
        { status: 403 }
      );
    }

    // 3. Build detailed workflow context for smart suggestions
    const workflowSummary = {
      nodeCount: nodes?.length ?? 0,
      edgeCount: edges?.length ?? 0,
      nodes: (nodes || []).map((n: { id: string; type: string; position: { x: number; y: number }; data: { label?: string; description?: string } }) => ({
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

    // Compute workflow characteristics for the prompt
    const nodeTypes = (nodes || []).map((n: { type: string }) => n.type);
    const hasParallel = nodeTypes.includes('parallel');
    const hasMerge = nodeTypes.includes('merge');
    const hasErrorHandler = nodeTypes.includes('error_handler') || nodeTypes.includes('retry');
    const hasAI = nodeTypes.some((t: string) => t.startsWith('ai_'));
    const hasApproval = nodeTypes.includes('approval');
    const apiCount = nodeTypes.filter((t: string) => t === 'api_request' || t === 'webhook').length;
    const branchCount = nodeTypes.filter((t: string) => ['if_else', 'decision', 'switch'].includes(t)).length;

    const systemPrompt = `You are a senior workflow architect providing ACTIONABLE, one-click-applicable improvement suggestions for visual workflow diagrams.

CURRENT WORKFLOW PROFILE:
- Nodes: ${workflowSummary.nodeCount} | Edges: ${workflowSummary.edgeCount}
- Has parallel processing: ${hasParallel ? 'Yes' : 'No'}
- Has merge nodes: ${hasMerge ? 'Yes' : 'No'}
- Has error handling: ${hasErrorHandler ? 'Yes' : 'No'}
- Has AI nodes: ${hasAI ? 'Yes' : 'No'}
- Has approval gates: ${hasApproval ? 'Yes' : 'No'}
- API/Webhook nodes: ${apiCount}
- Decision branches: ${branchCount}

Analyze the workflow and provide 4-8 ACTIONABLE improvement suggestions. Each suggestion MUST include concrete nodes and edges to add.

═══════════════════════════════════════════════════════
SUGGESTION CATEGORIES TO CONSIDER:
═══════════════════════════════════════════════════════

OPTIMIZATION:
- Replace sequential independent tasks with parallel + merge pattern
- Add caching before repeated API calls
- Consolidate redundant notification steps

SECURITY:
- Add approval gates before sensitive operations (payments, deletions, publishing)
- Add validation steps after user input
- Add authentication checks before API calls

RELIABILITY:
- Add retry logic for API calls
- Add error handlers for webhook receivers
- Add timeout/delay nodes for rate limiting
- Add fallback paths for critical operations

UX:
- Add notification steps (email/sms) for key milestones
- Add form steps for manual data collection
- Add checklist steps for compliance

PERFORMANCE:
- Identify parallelizable tasks
- Add data filtering before heavy processing
- Add caching with variable nodes

AI ENHANCEMENT:
- Add AI classification for routing decisions
- Add AI extraction for processing unstructured data
- Add AI summarization for report generation
- Add AI validation for data quality checks

For each suggestion, calculate where to place new nodes based on existing node positions. Place new nodes near the relevant existing nodes with appropriate offsets.

Respond ONLY with a JSON array (no markdown):
[
  {
    "type": "reliability",
    "priority": "high",
    "title": "Add Retry Logic for API Call",
    "description": "The REST API request node 'Fetch User Data' has no retry mechanism. If the API fails temporarily (network timeout, rate limit), the entire workflow fails. Adding a retry block with 3 attempts and exponential backoff will make this 10x more resilient.",
    "affected_node_id": "node_5",
    "affected_node_type": "api_request",
    "nodes_to_add": [
      {"id": "sug_retry_1", "type": "retry", "position": {"x": 700, "y": 500}, "data": {"label": "Retry API Call", "description": "Retry up to 3 times with exponential backoff"}}
    ],
    "edges_to_add": [
      {"id": "sug_edge_1", "source": "node_5", "target": "sug_retry_1", "sourceHandle": "error", "targetHandle": "in"},
      {"id": "sug_edge_2", "source": "sug_retry_1", "target": "node_5", "sourceHandle": "out", "targetHandle": "in"}
    ],
    "edges_to_remove": []
  }
]

Types: "optimization" | "security" | "reliability" | "ux" | "performance"
Priorities: "high" | "medium" | "low"

IMPORTANT: All node IDs in nodes_to_add must start with "sug_" prefix. All edge IDs must start with "sug_edge_". Position new nodes intelligently near the affected area.`;

    // 3. Call Gemini
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
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);

    // 4. Log usage
    const prompt_tokens = completion.response.usageMetadata?.promptTokenCount ?? 0;
    const completion_tokens = completion.response.usageMetadata?.candidatesTokenCount ?? 0;

    const aiRequestData = {
      workspace_id: workspaceId,
      user_id: user.id,
      workflow_id: workflowId || null,
      action: 'suggest',
      prompt_tokens,
      completion_tokens,
      credits_used: SUGGEST_COST,
      status: 'success',
    };

    await (supabaseAdmin.from('ai_requests') as unknown as {
      insert: (data: typeof aiRequestData) => Promise<{ error: { message: string } | null }>;
    }).insert(aiRequestData);

    return NextResponse.json({
      suggestions,
      creditsUsed: SUGGEST_COST,
      creditsRemaining: creditCheck.limit - creditCheck.current - SUGGEST_COST,
    });
  } catch (error) {
    console.error('[AI Suggest]', error);
    return NextResponse.json(
      { error: 'Suggestion generation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
