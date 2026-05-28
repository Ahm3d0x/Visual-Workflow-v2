import { NextResponse } from 'next/server';
import OpenAI from 'openai';
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

    // 3. Build OpenAI prompt
    const nodeTypesList = Object.keys(NODE_SCHEMAS)
      .map((k) => `- ${k}: ${NODE_SCHEMAS[k].label} (${NODE_SCHEMAS[k].description})`)
      .join('\n');

    const systemPrompt = `You are an expert workflow design assistant for a visual workflow builder. 
The user will describe a business process and you will create a visual workflow diagram.

Available node types:
${nodeTypesList}

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
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

Rules:
- Always start with exactly one "start" node and end with at least one "end" node
- Space nodes at least 150px apart vertically, 200px horizontally for branches
- Use appropriate node types matching the description
- Give meaningful, concise labels to each node (max 4 words)
- Connect ALL nodes logically with no orphan nodes
- For decision/if_else nodes, use handles "true" and "false"
- For loop nodes, use handles "loop" and "exit"
- For api_request nodes, use handles "success" and "error"
- For approval nodes, use handles "approve" and "reject"
- Aim for 5-15 nodes for most workflows`;

    // 4. Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.4,
    });

    const rawContent = completion.choices[0].message.content;
    if (!rawContent) throw new Error('Empty response from AI');

    const result = JSON.parse(rawContent);

    // Validate structure
    if (!result.nodes || !result.edges || !Array.isArray(result.nodes) || !Array.isArray(result.edges)) {
      throw new Error('Invalid workflow structure returned');
    }

    // 5. Log AI usage to database
    const aiRequestData = {
      workspace_id: workspaceId,
      user_id: user.id,
      workflow_id: workflowId || null,
      action: 'generate',
      prompt_tokens: completion.usage?.prompt_tokens ?? 0,
      completion_tokens: completion.usage?.completion_tokens ?? 0,
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
