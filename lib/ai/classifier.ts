export interface ClassificationResult {
  ticketable: boolean;
  title?: string;
  body?: string;
  requester?: string;
  company?: string;
  urgency?: "low" | "medium" | "high";
  reasoning: string;
}

export async function classifyMessage(
  messageText: string,
  hints?: { senderName?: string; company?: string; source?: string }
): Promise<ClassificationResult[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const systemPrompt = `You are a project coordinator extracting work tickets from conversations between a contractor and their clients.

Your job is to read an exchange and produce one or more structured tickets that tell the contractor exactly what they need to do, in what order, and by when. You are NOT summarizing — you are writing clear action plans.

**CRITICAL: Split into multiple tickets when a conversation contains distinct, independent workstreams.**
A new ticket is warranted when there is a topic or deliverable that:
- Could be assigned to a different person or worked on independently
- Has a different scope, deadline, or context from other requests
- Would naturally be tracked separately (e.g. "prep the onboarding docs" vs "check the catering count")

Do NOT split a ticket just because there are multiple steps — keep related steps in one ticket.

A message IS ticketable if it contains one or more requests for the contractor to:
- Build, fix, review, update, design, or create something
- Move, organize, or manage files or assets
- Draft, write, or send a communication
- Complete any specific task, even if phrased casually or as low priority

A message is NOT ticketable if it is purely:
- Casual chat or pleasantries with zero tasks embedded
- FYI announcements with nothing for the contractor to do
- Simple yes/no confirmations or acknowledgments

When writing each ticket body, follow this structure exactly:

**Summary**
One or two sentences describing what the client needs and why.

**Action Items**
A numbered list of discrete steps the contractor must complete. Each step should be specific and actionable. If a deadline or priority level was mentioned, include it inline (e.g. "— due EOD", "— low priority, tomorrow is fine").

**Deadline**
State the overall deadline or urgency. If none was given, write "No hard deadline specified."

Respond ONLY with valid JSON in this exact format:

If nothing is ticketable:
{
  "ticketable": false,
  "reasoning": "One sentence explaining why"
}

If ticketable (always use the tickets array, even for a single ticket):
{
  "ticketable": true,
  "tickets": [
    {
      "title": "Short imperative title (5-10 words)",
      "body": "The structured body following the Summary / Action Items / Deadline format above",
      "requester": "Person's name if identifiable",
      "company": "Company name if identifiable",
      "urgency": "low | medium | high",
      "reasoning": "One sentence explaining what this ticket covers"
    }
  ]
}`;

  const userPrompt = `Classify this message:

Source: ${hints?.source ?? "unknown"}
${hints?.senderName ? `Sender: ${hints.senderName}` : ""}
${hints?.company ? `Company context: ${hints.company}` : ""}

Message:
${messageText}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = data.choices[0]?.message?.content ?? "{}";

  // Strip markdown code fences
  const stripped = text.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```$/m, "").trim();

  // Extract the outermost JSON object
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const raw = start !== -1 && end !== -1 ? stripped.slice(start, end + 1) : stripped;

  // Escape literal newlines inside JSON string values (LLMs sometimes emit them)
  let fixed = "";
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const prev = raw[i - 1];
    if (ch === '"' && prev !== "\\") inString = !inString;
    if (inString && ch === "\n") { fixed += "\\n"; continue; }
    if (inString && ch === "\r") { fixed += "\\r"; continue; }
    fixed += ch;
  }

  const parsed = JSON.parse(fixed) as {
    ticketable: boolean;
    reasoning?: string;
    tickets?: Array<{
      title: string;
      body: string;
      requester?: string;
      company?: string;
      urgency?: "low" | "medium" | "high";
      reasoning: string;
    }>;
  };

  if (!parsed.ticketable) {
    return [{ ticketable: false, reasoning: parsed.reasoning ?? "Not ticketable" }];
  }

  return (parsed.tickets ?? []).map((t) => ({
    ticketable: true,
    title: t.title,
    body: t.body,
    requester: t.requester,
    company: t.company,
    urgency: t.urgency,
    reasoning: t.reasoning,
  }));
}
