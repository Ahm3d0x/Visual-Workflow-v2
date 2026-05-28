import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
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

    // 2. Credits check
    const creditCheck = await checkPlanLimit(supabase, workspaceId, 'ai_credits');
    if (creditCheck.current + SUGGEST_COST > creditCheck.limit) {
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: `Insufficient AI credits. Used ${creditCheck.current}/${creditCheck.limit} this month.`,
        },
        { status: 403 }
      );
    }

    const workflowSummary = {
      nodeCount: nodes?.length ?? 0,
      edgeCount: edges?.length ?? 0,
      nodeTypes: (nodes || []).map((n: { type: string; data: { label?: string } }) => ({
        type: n.type,
        label: n.data?.label,
      })),
    };

    const systemPrompt = `You are a senior workflow architect providing expert improvement suggestions for visual workflow diagrams.

Analyze the workflow structure and provide 3-5 actionable improvement suggestions.

Consider:
- Performance optimizations (parallel processing opportunities)
- Error handling gaps (API calls without error branches)
- User experience improvements (clearer labels, better flow)
- Missing validations or data checks
- Opportunities for automation or AI enhancement
- Security considerations (approval gates for sensitive operations)
- Scalability concerns (loops without exit conditions)

Respond ONLY with a JSON array (no markdown):
[
  {
    "type": "optimization",
    "priority": "high",
    "title": "Add parallel processing",
    "description": "The email and SMS notification steps could run in parallel using a Parallel node to reduce total execution time by ~50%.",
    "affected_node_type": "email"
  }
]

Types: "optimization" | "security" | "reliability" | "ux" | "performance"
Priorities: "high" | "medium" | "low"`;

    // 3. Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(workflowSummary) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.6,
    });

    const rawContent = completion.choices[0].message.content;
    if (!rawContent) throw new Error('Empty response from AI');

    const parsed = JSON.parse(rawContent);
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);

    // 4. Log usage
    const aiRequestData = {
      workspace_id: workspaceId,
      user_id: user.id,
      workflow_id: workflowId || null,
      action: 'suggest',
      prompt_tokens: completion.usage?.prompt_tokens ?? 0,
      completion_tokens: completion.usage?.completion_tokens ?? 0,
      credits_used: SUGGEST_COST,
      status: 'success',
    };

    await (supabase.from('ai_requests') as unknown as {
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
