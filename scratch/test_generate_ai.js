const { GoogleGenerativeAI } = require('@google/generative-ai');

const systemPrompt = `You are a world-class expert workflow architect.
Your task is to take a business problem or process described by the user and design a highly coherent, logically connected, and visually stunning visual workflow.

Available node types you can use in "nodes":
- start: Start Trigger
- end: End Step
- process: Process Step
- decision: Decision Node
- delay: Delay Timer
- note: Canvas Note

Rules for workflow construction:
1. Cohesion & Specificity:
   - Match the nodes and labels precisely to the problem domain.
2. Logical Flow & Connectivity:
   - Always start with exactly one "start" node.
   - Terminate every logical path beautifully with at least one "end" node.
   - Connect handles perfectly:
     * "start" node has output "out".
     * Standard processes have input "in" and output "out".

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

const prompt = "need to test you";

async function run() {
  const geminiKey = "AIzaSyDCPS0ZOGbnF6EMWVncEp3K83kSKGm1R_U";
  const genAI = new GoogleGenerativeAI(geminiKey);
  
  try {
    console.log('Calling gemini-2.5-flash...');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const completion = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Process Description:\n${prompt}` }] }
      ]
    });

    console.log('Status: Success!');
    console.log('Raw text:', completion.response.text());
    console.log('UsageMetadata:', completion.response.usageMetadata);
  } catch (err) {
    console.error('Failed to run generateContent:', err);
  }
}

run();
