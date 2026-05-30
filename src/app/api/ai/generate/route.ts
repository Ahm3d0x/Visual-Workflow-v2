import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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

    const { prompt, workflowId, workspaceId, complexity, existingNodes, existingEdges } = await request.json();

    if (!prompt || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create admin client to bypass RLS for billing and logging
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Credits check
    const creditCheck = await checkPlanLimit(supabaseAdmin, workspaceId, 'ai_credits');
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

    // 3. Build full node-type reference with handle specifications
    const nodeTypesList = Object.keys(NODE_SCHEMAS)
      .map((k) => {
        const schema = NODE_SCHEMAS[k];
        const inputs = schema.inputs.map((i) => i.id).join(', ') || 'none';
        const outputs = schema.outputs.map((o) => o.id).join(', ') || 'none';
        return `- ${k}: ${schema.label} — ${schema.description} | inputs: [${inputs}] | outputs: [${outputs}]`;
      })
      .join('\n');

    // 4. Determine complexity tier
    const complexityTier = complexity || 'standard';
    const complexityGuide: Record<string, { minNodes: number; maxNodes: number; branches: number; description: string }> = {
      simple: { minNodes: 5, maxNodes: 10, branches: 1, description: 'A clean, linear workflow with minimal branching. Good for simple sequential processes.' },
      standard: { minNodes: 10, maxNodes: 20, branches: 3, description: 'A well-structured workflow with multiple decision branches, error handling, and at least one parallel section.' },
      complex: { minNodes: 18, maxNodes: 35, branches: 5, description: 'A deeply interconnected workflow with nested decision trees, multiple parallel execution paths, comprehensive error handling chains, retry logic, and approval gates.' },
      enterprise: { minNodes: 25, maxNodes: 50, branches: 8, description: 'A production-grade enterprise workflow with exhaustive branching, multi-level approval chains, parallel processing with merges, full error handling with retries and fallbacks, AI-powered routing, and monitoring checkpoints.' },
    };
    const tier = complexityGuide[complexityTier] || complexityGuide.standard;

    // 5. Build context from existing canvas (if provided)
    let contextSection = '';
    if (existingNodes && existingNodes.length > 0) {
      const existingSummary = existingNodes.map((n: { id: string; type: string; data: { label?: string } }) =>
        `  - ${n.id} (${n.type}): "${n.data?.label || 'Untitled'}"`
      ).join('\n');
      const existingEdgeSummary = (existingEdges || []).map((e: { source: string; target: string; sourceHandle?: string }) =>
        `  - ${e.source} → ${e.target} (handle: ${e.sourceHandle || 'out'})`
      ).join('\n');
      contextSection = `
EXISTING CANVAS CONTEXT — The user already has these nodes and edges on their canvas. Your generated workflow should CONNECT TO and EXTEND the existing flow where it makes logical sense. Use the existing node IDs when creating edges that connect to them.

Existing Nodes:
${existingSummary}

Existing Edges:
${existingEdgeSummary || '  (no edges yet)'}

When generating the new workflow:
- If the existing canvas has a logical endpoint, connect your new "start" to it (or omit the start node and begin from the existing endpoint).
- If the existing canvas is empty or has no clear endpoint, generate a fully standalone workflow with its own start node.
- Prefix all NEW node IDs with "ai_" to avoid ID conflicts with existing nodes.
`;
    }

    // 6. Build the massively enhanced system prompt
    const systemPrompt = `You are an ELITE workflow architect with deep expertise in business process automation, system design, and enterprise workflow patterns. You design workflows that are production-ready, resilient, and deeply interconnected.

COMPLEXITY TARGET: ${tier.description}
- Generate between ${tier.minNodes} and ${tier.maxNodes} nodes
- Include at least ${tier.branches} branching decision points
- EVERY workflow must demonstrate real-world resilience patterns

AVAILABLE NODE TYPES (with their exact input/output handle IDs):
${nodeTypesList}

${contextSection}

═══════════════════════════════════════════════════════════
MANDATORY ARCHITECTURE RULES — FOLLOW ALL OF THESE:
═══════════════════════════════════════════════════════════

1. DEEP BRANCHING (CRITICAL):
   - NEVER create purely linear chains of more than 3 nodes without a branch.
   - Use "if_else" nodes to branch on conditions (e.g., "Is valid?", "Amount > $500?", "User exists?").
   - Use "switch" nodes when routing to 3+ paths.
   - Use "approval" nodes before sensitive operations (finance, deletion, publishing).
   - Both branches of every decision MUST lead somewhere meaningful — never leave a branch empty.
   - Create NESTED branches: a branch from one decision can lead to another decision node.

2. PARALLEL PROCESSING (REQUIRED for standard+ complexity):
   - Identify tasks that can run simultaneously and wrap them in a "parallel" node.
   - After parallel tasks complete, ALWAYS merge with a "merge" node.
   - Examples: sending email AND SMS simultaneously, checking inventory AND validating payment.

3. ERROR HANDLING CHAINS (REQUIRED):
   - EVERY "api_request" node MUST have its "error" output connected to either:
     (a) a "retry" node → then back to the api_request, OR
     (b) an "error_handler" node → then to a notification step.
   - EVERY "webhook" node MUST have its "error" output handled.
   - Use "error_handler" nodes with both "true" (recoverable) and "false" (fatal) paths.

4. CONNECTOR HANDLE RULES (CRITICAL — FOLLOW EXACTLY):
   - "start": outputs ["out"]. No inputs.
   - "end": inputs ["in"]. No outputs.
   - "process", "delay", "email", "sms", "slack", "database", "ai_generate", "ai_classify", "ai_extract", "ai_summarize", "form_step", "user_task", "variable", "transform", "merge", "file_upload", "google_sheets", "checklist", "signature": inputs ["in"], outputs ["out"].
   - "decision", "if_else", "filter", "error_handler", "ai_route", "ai_validator", "switch": inputs ["in"], outputs ["true", "false"].
   - "loop", "parallel": inputs ["in"], outputs ["loop", "exit"].
   - "api_request", "webhook": inputs ["in"], outputs ["success", "error"].
   - "approval": inputs ["in"], outputs ["approve", "reject"].
   - "input": No inputs, outputs ["out"].
   - "output": inputs ["in"], No outputs.

5. VISUAL LAYOUT RULES:
   - Start node: position {"x": 400, "y": 50}
   - Each subsequent vertical step: add 200px to Y
   - When branching:
     * Center decision at x=400
     * Left branch (true/success/approve): x=100
     * Right branch (false/error/reject): x=700
     * For 3-way splits: x=100, x=400, x=700
   - Parallel branches: spread horizontally (x=100, x=400, x=700)
   - Merge/convergence points: bring back to x=400
   - Nested branches: offset deeper branches by ±150px from parent branch
   - Keep the layout balanced and symmetrical

6. PROFESSIONAL LABELS:
   - Every node label must be a specific, actionable phrase (3-5 words max).
   - BAD: "Process", "Step 1", "Check"
   - GOOD: "Validate Payment Info", "Route to Sales Team", "Send Welcome Email"
   - Every node MUST have a meaningful "description" field explaining what it does.

7. NODE DIVERSITY (REQUIRED):
   - Use at LEAST 6 different node types in every workflow.
   - Don't overuse "process" nodes — use specific types (email, database, api_request, etc.).
   - Include at least one AI node (ai_classify, ai_extract, ai_summarize, or ai_route) for intelligent processing where appropriate.

8. COMPLETENESS:
   - EVERY path must terminate at an "end" node. No dead ends.
   - ZERO orphan nodes — every node must be connected.
   - Every edge must reference valid source and target node IDs.
   - sourceHandle and targetHandle must match the exact handle IDs listed above.

═══════════════════════════════════════════════════════════
DOMAIN-SPECIFIC PATTERNS (use when relevant):
═══════════════════════════════════════════════════════════

HR/Onboarding: start → form_step (collect info) → if_else (background check?) → parallel [email welcome + create accounts + assign equipment] → merge → approval (manager) → [approve: user_task (orientation)] / [reject: email (rejection notice)] → end

E-Commerce: start → input (order data) → if_else (in stock?) → [true: parallel [api_request (charge payment) + database (reserve inventory)] → merge → if_else (payment success?) → ...] / [false: email (out of stock)] → end

CI/CD: start → webhook (git push) → api_request (run tests) → [success: if_else (branch=main?) → ...] / [error: email (test failure)] → end

Customer Support: start → ai_classify (categorize ticket) → switch (priority) → [high: approval (escalate)] / [medium: ai_route (assign team)] / [low: ai_generate (auto-reply)] → end

═══════════════════════════════════════════════════════════

You MUST respond with a valid JSON object in this EXACT structure:
{
  "nodes": [
    {
      "id": "ai_node_1",
      "type": "start",
      "position": {"x": 400, "y": 50},
      "data": {"label": "Start Trigger", "description": "Workflow begins when a new request is received"}
    }
  ],
  "edges": [
    {
      "id": "ai_edge_1",
      "source": "ai_node_1",
      "target": "ai_node_2",
      "sourceHandle": "out",
      "targetHandle": "in"
    }
  ]
}

DO NOT include any markdown, explanation, or HTML. Return ONLY raw JSON.`;

    // 7. Call Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 1.0,
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

    // Post-process: ensure all node IDs are prefixed to avoid conflicts
    const nodeIds = new Set(result.nodes.map((n: { id: string }) => n.id));
    const edgeSourceTargets = result.edges.map((e: { source: string; target: string }) => [e.source, e.target]).flat();
    const danglingEdges = edgeSourceTargets.filter((id: string) => !nodeIds.has(id));

    // If there are dangling edges referencing existing canvas nodes, that's OK
    const existingNodeIds = new Set((existingNodes || []).map((n: { id: string }) => n.id));
    const trulyDangling = danglingEdges.filter((id: string) => !existingNodeIds.has(id));

    if (trulyDangling.length > 0) {
      console.warn(`[AI Generate] ${trulyDangling.length} dangling edge references cleaned up:`, trulyDangling);
      // Remove edges with invalid references
      result.edges = result.edges.filter((e: { source: string; target: string }) =>
        (nodeIds.has(e.source) || existingNodeIds.has(e.source)) &&
        (nodeIds.has(e.target) || existingNodeIds.has(e.target))
      );
    }

    // Compute stats for the response
    const nodeTypeCount: Record<string, number> = {};
    for (const n of result.nodes) {
      nodeTypeCount[n.type] = (nodeTypeCount[n.type] || 0) + 1;
    }
    const branchCount = result.nodes.filter((n: { type: string }) =>
      ['if_else', 'decision', 'switch', 'approval', 'error_handler', 'ai_route', 'filter'].includes(n.type)
    ).length;
    const parallelCount = result.nodes.filter((n: { type: string }) => n.type === 'parallel').length;

    // 8. Log AI usage to database
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

    await (supabaseAdmin.from('ai_requests') as unknown as {
      insert: (data: typeof aiRequestData) => Promise<{ error: { message: string } | null }>;
    }).insert(aiRequestData);

    return NextResponse.json({
      ...result,
      stats: {
        nodeCount: result.nodes.length,
        edgeCount: result.edges.length,
        branchCount,
        parallelCount,
        nodeTypes: nodeTypeCount,
        complexity: complexityTier,
      },
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
