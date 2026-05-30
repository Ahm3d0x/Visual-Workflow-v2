import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkPlanLimit } from '@/lib/planLimits';
import { NODE_SCHEMAS } from '@/lib/nodeSchemas';

const AUTOCONNECT_COST = 5;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Auth guard
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nodes, edges, workflowId, workspaceId } = await request.json();

    if (!nodes || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (nodes.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 nodes to auto-connect' }, { status: 400 });
    }

    // Create admin client to bypass RLS for billing and logging
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Credits check
    const creditCheck = await checkPlanLimit(supabaseAdmin, workspaceId, 'ai_credits');
    if (creditCheck.current + AUTOCONNECT_COST > creditCheck.limit) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: `Insufficient AI credits. Used ${creditCheck.current}/${creditCheck.limit} this month.`,
        },
        { status: 403 }
      );
    }

    // 3. Build node handle reference
    const handleReference = Object.keys(NODE_SCHEMAS)
      .map((k) => {
        const schema = NODE_SCHEMAS[k];
        const inputs = schema.inputs.map((i) => i.id).join(', ') || 'none';
        const outputs = schema.outputs.map((o) => o.id).join(', ') || 'none';
        return `- ${k}: inputs=[${inputs}], outputs=[${outputs}]`;
      })
      .join('\n');

    const nodesContext = nodes.map((n: { id: string; type: string; position: { x: number; y: number }; data: { label?: string; description?: string } }) =>
      `  - id="${n.id}", type="${n.type}", label="${n.data?.label || 'Untitled'}", description="${n.data?.description || ''}", position={x:${n.position.x}, y:${n.position.y}}`
    ).join('\n');

    const existingEdgesContext = (edges || []).map((e: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) =>
      `  - ${e.source} → ${e.target} (sourceHandle: ${e.sourceHandle || 'out'}, targetHandle: ${e.targetHandle || 'in'})`
    ).join('\n') || '  (no existing edges)';

    const systemPrompt = `You are an intelligent workflow connection architect. Your task is to analyze disconnected or poorly-connected workflow nodes and intelligently CREATE EDGES to connect them into a coherent, logical workflow.

NODES ON CANVAS:
${nodesContext}

EXISTING EDGES (already connected):
${existingEdgesContext}

NODE TYPE HANDLE REFERENCE:
${handleReference}

═══════════════════════════════════════════════════════
ANALYSIS AND CONNECTION RULES:
═══════════════════════════════════════════════════════

1. Identify ORPHAN nodes (nodes with no incoming or outgoing edges) and connect them.
2. Identify LOGICAL FLOW based on:
   - Node types: "start" → processing → decisions → actions → "end"
   - Node labels: Infer sequence from action verbs and domain knowledge
   - Node positions: Top-to-bottom, left-to-right generally indicates flow order
3. NEVER create duplicate edges (check existing edges first).
4. Use the CORRECT handles:
   - For decisions/if_else: use "true" and "false" output handles
   - For api_request/webhook: use "success" and "error" output handles
   - For approval: use "approve" and "reject" output handles
   - For loop/parallel: use "loop" and "exit" output handles
   - For standard nodes: use "out" output and "in" input
5. If you need to add intermediary nodes to make the flow logical (e.g., a merge node after parallel branches), include them in "nodes_to_add".
6. Ensure EVERY path eventually reaches an "end" node. If none exists, add one.

RESPONSE FORMAT — Return a JSON object:
{
  "new_edges": [
    {"id": "ac_edge_1", "source": "node_1", "target": "node_2", "sourceHandle": "out", "targetHandle": "in"}
  ],
  "nodes_to_add": [
    {"id": "ac_merge_1", "type": "merge", "position": {"x": 400, "y": 900}, "data": {"label": "Merge Paths", "description": "Reconverge parallel branches"}}
  ],
  "reasoning": "Connected start → validate → process in a logical sequence based on node labels and positions. Added a merge node to reconverge the two decision branches."
}

All new edge IDs must start with "ac_edge_". All new node IDs must start with "ac_".
Return ONLY raw JSON. No markdown.`;

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
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nIntelligently connect these nodes into a coherent workflow.` }] }
      ]
    });

    const rawContent = completion.response.text();
    if (!rawContent) throw new Error('Empty response from Gemini');

    const result = JSON.parse(rawContent);

    // Validate no duplicate edges
    const existingEdgeKeys = new Set(
      (edges || []).map((e: { source: string; target: string }) => `${e.source}->${e.target}`)
    );
    if (result.new_edges) {
      result.new_edges = result.new_edges.filter((e: { source: string; target: string }) =>
        !existingEdgeKeys.has(`${e.source}->${e.target}`)
      );
    }

    // 5. Log usage
    const prompt_tokens = completion.response.usageMetadata?.promptTokenCount ?? 0;
    const completion_tokens = completion.response.usageMetadata?.candidatesTokenCount ?? 0;

    const aiRequestData = {
      workspace_id: workspaceId,
      user_id: user.id,
      workflow_id: workflowId || null,
      action: 'autoconnect',
      prompt_tokens,
      completion_tokens,
      credits_used: AUTOCONNECT_COST,
      status: 'success',
    };

    await (supabaseAdmin.from('ai_requests') as unknown as {
      insert: (data: typeof aiRequestData) => Promise<{ error: { message: string } | null }>;
    }).insert(aiRequestData);

    return NextResponse.json({
      ...result,
      creditsUsed: AUTOCONNECT_COST,
      creditsRemaining: creditCheck.limit - creditCheck.current - AUTOCONNECT_COST,
    });
  } catch (error) {
    console.error('[AI AutoConnect]', error);
    return NextResponse.json(
      { error: 'Auto-connect failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
