import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "google/gemini-3.6-flash";

interface Body {
  messages?: { role: "user" | "assistant"; content: string }[];
  persona?: string;
  context?: string;
}

const systemPrompt = (persona: string, context: string) => `
You are the Copilot inside the Unified Financial Services Engagement Hub, an enterprise
workspace used by insurance and wealth-management employees.

The person you are assisting is: ${persona || "a service representative"}.

Working context provided by the application (this is the only client data you may rely on):
${context || "No record context has been supplied."}

Rules you must always follow:
1. Ground every statement in the context above. If the context does not contain the answer,
   say clearly what is missing and which system or record would hold it. Never invent
   policy numbers, balances, dates, names, or regulatory language.
2. Cite the record you used inline, for example "(Policy L70-882134)" or "(Case CS-10241)".
3. You never execute transactions. When an action is appropriate, propose it as a numbered
   recommendation and state explicitly that the employee must review and confirm it.
4. Flag anything that requires licensed advice, suitability review, complaint handling, or
   compliance escalation instead of answering it yourself.
5. Do not reveal full sensitive identifiers. Refer to them in masked form.
6. Be concise and businesslike. Prefer short paragraphs and tight bullet lists. Use Markdown.
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured for this workspace." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "At least one message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = messages.every(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length <= 8000,
    );
    if (!valid) {
      return new Response(JSON.stringify({ error: "Message payload is invalid." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt(String(body.persona ?? ""), String(body.context ?? "").slice(0, 12000)) },
          ...messages,
        ],
      }),
    });

    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "Copilot is rate limited. Please retry in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (upstream.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits are exhausted for this workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text();
      console.error("AI gateway error", upstream.status, detail);
      return new Response(JSON.stringify({ error: "Copilot is unavailable right now." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    console.error("agent-chat failure", error);
    return new Response(JSON.stringify({ error: "Unexpected Copilot error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
