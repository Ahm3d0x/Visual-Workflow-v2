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

    // 3. Call Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    // Use gemini-2.5-flash for rapid, highly intelligent structural improvement advice
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
