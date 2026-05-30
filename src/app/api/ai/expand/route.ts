import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkPlanLimit } from '@/lib/planLimits';
import { NODE_SCHEMAS } from '@/lib/nodeSchemas';

const EXPAND_COST = 10;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Auth guard
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { node, allNodes, allEdges, workflowId, workspaceId } = await request.json();

    if (!node || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields (node, workspaceId)' }, { status: 400 });
    }

    // Create admin client to bypass RLS for billing and logging
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Credits check
    const creditCheck = await checkPlanLimit(supabaseAdmin, workspaceId, 'ai_credits');
    if (creditCheck.current + EXPAND_COST > creditCheck.limit) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: `Insufficient AI credits. Used ${creditCheck.current}/${creditCheck.limit} this month.`,
        },
        { status: 403 }
      );
    }

    // 3. Build node reference
    const nodeTypesList = Object.keys(NODE_SCHEMAS)
      .map((k) => {
        const schema = NODE_SCHEMAS[k];
        const inputs = schema.inputs.map((i) => i.id).join(', ') || 'none';
        const outputs = schema.outputs.map((o) => o.id).join(', ') || 'none';
        return `- ${k}: ${schema.label} — ${schema.description} | inputs: [${inputs}] | outputs: [${outputs}]`;
      })
      .join('\n');

    // Find incoming and outgoing connections for this node
    const incomingEdges = (allEdges || []).filter((e: { target: string }) => e.target === node.id);
    const outgoingEdges = (allEdges || []).filter((e: { source: string }) => e.source === node.id);

    const incomingContext = incomingEdges.map((e: { source: string; sourceHandle?: string }) => {
      const sourceNode = (allNodes || []).find((n: { id: string }) => n.id === e.source);
      return `  - From "${sourceNode?.data?.label || e.source}" (${sourceNode?.type || 'unknown'}) via handle "${e.sourceHandle || 'out'}"`;
    }).join('\n') || '  (no incoming connections)';

    const outgoingContext = outgoingEdges.map((e: { target: string; sourceHandle?: string }) => {
      const targetNode = (allNodes || []).find((n: { id: string }) => n.id === e.target);
      return `  - To "${targetNode?.data?.label || e.target}" (${targetNode?.type || 'unknown'}) via handle "${e.sourceHandle || 'out'}"`;
    }).join('\n') || '  (no outgoing connections)';

    const systemPrompt = `You are an elite workflow architect. Your task is to EXPAND a single workflow node into a detailed sub-flow.

The user has selected a node and wants you to "zoom in" — replace it with a detailed sub-workflow that accomplishes the same goal but with proper branching, error handling, and granularity.

TARGET NODE TO EXPAND:
- ID: "${node.id}"
- Type: "${node.type}"
- Label: "${node.data?.label || 'Untitled'}"
- Description: "${node.data?.description || 'No description'}"

CONNECTIONS TO PRESERVE:
Incoming:
${incomingContext}

Outgoing:
${outgoingContext}

AVAILABLE NODE TYPES:
${nodeTypesList}

═══════════════════════════════════════════════════════
EXPANSION RULES:
═══════════════════════════════════════════════════════

1. Generate 6-15 nodes that detail what the original node did in one step.
2. The FIRST node in the sub-flow must have the same input handles as the original node so incoming edges still work.
3. The LAST node(s) in the sub-flow must have the same output handles as the original node so outgoing edges still work.
4. Include proper branching with if_else or decision nodes.
5. Include error handling for any API or integration steps.
6. Include at least one parallel section if the expanded process has independent sub-tasks.
7. ALL new node IDs must start with "exp_" to avoid conflicts.
8. Position the expanded sub-flow starting at x=${node.position?.x || 250}, y=${node.position?.y || 200}, and expand downward with 200px vertical spacing and appropriate horizontal spread for branches.

RESPONSE FORMAT — Return a JSON object:
{
  "expanded_nodes": [
    {"id": "exp_1", "type": "process", "position": {"x": 250, "y": 200}, "data": {"label": "Validate Input", "description": "Check all required fields are present"}}
  ],
  "expanded_edges": [
    {"id": "exp_edge_1", "source": "exp_1", "target": "exp_2", "sourceHandle": "out", "targetHandle": "in"}
  ],
  "reconnect_instructions": {
    "first_node_id": "exp_1",
    "last_node_ids": ["exp_8", "exp_12"],
    "description": "Connect incoming edges to exp_1's 'in' handle. Connect exp_8 and exp_12 to the original outgoing targets."
  }
}

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
        temperature: 0.8,
      },
    });

    const completion = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nExpand this node into a detailed sub-workflow.` }] }
      ]
    });

    const rawContent = completion.response.text();
    if (!rawContent) throw new Error('Empty response from Gemini');

    const result = JSON.parse(rawContent);

    if (!result.expanded_nodes || !result.expanded_edges) {
      throw new Error('Invalid expansion structure returned');
    }

    // 5. Log usage
    const prompt_tokens = completion.response.usageMetadata?.promptTokenCount ?? 0;
    const completion_tokens = completion.response.usageMetadata?.candidatesTokenCount ?? 0;

    const aiRequestData = {
      workspace_id: workspaceId,
      user_id: user.id,
      workflow_id: workflowId || null,
      action: 'expand',
      prompt_tokens,
      completion_tokens,
      credits_used: EXPAND_COST,
      status: 'success',
    };

    await (supabaseAdmin.from('ai_requests') as unknown as {
      insert: (data: typeof aiRequestData) => Promise<{ error: { message: string } | null }>;
    }).insert(aiRequestData);

    return NextResponse.json({
      ...result,
      originalNodeId: node.id,
      creditsUsed: EXPAND_COST,
      creditsRemaining: creditCheck.limit - creditCheck.current - EXPAND_COST,
    });
  } catch (error) {
    console.error('[AI Expand]', error);
    return NextResponse.json(
      { error: 'Node expansion failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
