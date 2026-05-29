import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/planLimits';
import { NODE_SCHEMAS } from '@/lib/nodeSchemas';

const GENERATE_COST = 10;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Auth guard
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, workflowId, workspaceId } = await request.json();

    if (!prompt || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Credits check
    const creditCheck = await checkPlanLimit(supabase, workspaceId, 'ai_credits');
    if (creditCheck.current + GENERATE_COST > creditCheck.limit) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: `Insufficient AI credits. Used ${creditCheck.current}/${creditCheck.limit} this month.`,
          creditsUsed: creditCheck.current,
          creditsLimit: creditCheck.limit,
        },
        { status: 403 }
      );
    }

    // 3. Build Gemini prompt
    const nodeTypesList = Object.keys(NODE_SCHEMAS)
      .map((k) => `- ${k}: ${NODE_SCHEMAS[k].label} (${NODE_SCHEMAS[k].description})`)
      .join('\n');

    const systemPrompt = `You are a world-class expert workflow architect.
Your task is to take a business problem or process described by the user and design a highly coherent, logically connected, and visually stunning visual workflow.

Available node types you can use in "nodes":
${nodeTypesList}

Rules for workflow construction:
1. Cohesion & Specificity:
   - Match the nodes and labels precisely to the problem domain (e.g., if it's marketing, use email, slack, delay, api_request nodes. If it's a software pipeline, use build, test, deploy nodes).
   - Node labels must be clear, professional, and action-oriented (max 4 words).

2. Logical Flow & Connectivity:
   - Always start with exactly one "start" node.
   - Terminate every logical path beautifully with at least one "end" node.
   - All intermediate nodes must be navigable and connected; DO NOT leave any orphan or disconnected nodes.
   - Connect handles perfectly:
     * "start" node has output "out".
     * Standard processes (process, delay, email, sms, slack, database, ai_generate, ai_classify, ai_extract, ai_summarize, form_step, user_task) have input "in" and output "out".
     * Decision/Conditional nodes (decision, if_else, filter, error_handler) have input "in" and output handles "true" and "false".
     * Loop/Parallel iteration nodes (loop, parallel) have input "in" and output handles "loop" and "exit".
     * Integration nodes with failure modes (api_request, webhook) have input "in" and output handles "success" and "error".
     * Approval gates (approval) have input "in" and output handles "approve" and "reject".

3. Visually Polished Grid Coordinates:
   - To make the diagram layout look beautiful and professional out-of-the-box:
     * Position the "start" node at {"x": 250, "y": 50}.
     * Advance subsequent linear steps vertically by adding 180px to the Y coordinate (e.g., 230, 410, 590).
     * When encountering a branch (e.g., if_else or approval), place the node at the center (e.g., x: 250), then shift the primary path ("true", "success", "approve") to the left (x: 50) and the alternate path ("false", "error", "reject") to the right (x: 450).
     * Subsequent nodes in each branch should continue down the Y axis (adding 180px for each step), and eventually merge back at the center (x: 250) or end in distinct "end" nodes to keep the diagram balanced and clear.

You MUST respond with a valid JSON object in this exact schema structure:
{
  "nodes": [
    {
      "id": "node_1",
      "type": "start",
      "position": {"x": 250, "y": 50},
      "data": {"label": "Start Trigger", "description": "Workflow begins here"}
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "sourceHandle": "out",
      "targetHandle": "in"
    }
  ]
}

DO NOT include any markdown code blocks, explanation, or HTML formatting. Return raw JSON only.`;

    // 4. Call Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    // Use gemini-1.5-pro for high-fidelity workflow design & layout planning
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const completion = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Process Description:\n${prompt}` }] }
      ]
    });

    const rawContent = completion.response.text();
    if (!rawContent) throw new Error('Empty response from Gemini');

    const result = JSON.parse(rawContent);

    // Validate structure
    if (!result.nodes || !result.edges || !Array.isArray(result.nodes) || !Array.isArray(result.edges)) {
      throw new Error('Invalid workflow structure returned');
    }

    // 5. Log AI usage to database
    const prompt_tokens = completion.response.usageMetadata?.promptTokenCount ?? 0;
    const completion_tokens = completion.response.usageMetadata?.candidatesTokenCount ?? 0;

    const aiRequestData = {
      workspace_id: workspaceId,
      user_id: user.id,
      workflow_id: workflowId || null,
      action: 'generate',
      prompt_tokens,
      completion_tokens,
      credits_used: GENERATE_COST,
      status: 'success',
    };

    await (supabase.from('ai_requests') as unknown as {
      insert: (data: typeof aiRequestData) => Promise<{ error: { message: string } | null }>;
    }).insert(aiRequestData);

    return NextResponse.json({
      ...result,
      creditsUsed: GENERATE_COST,
      creditsRemaining: creditCheck.limit - creditCheck.current - GENERATE_COST,
    });
  } catch (error) {
    console.error('[AI Generate]', error);
    return NextResponse.json(
      { error: 'AI generation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
