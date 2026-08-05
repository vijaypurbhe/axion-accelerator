import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

/**
 * Generates Agentforce design artifacts server-side (Markdown spec + traceability CSV),
 * records a content hash for reproducibility and returns a job the client can poll.
 */

const BodySchema = z.object({
  agentId: z.string().uuid(),
  format: z.enum(['markdown', 'csv']),
});

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const csvCell = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;

type Row = Record<string, any>;

const buildMarkdown = (agent: Row, topics: Row[], actions: Row[], grounding: Row[], guardrails: Row[]) => {
  const o = agent.overview ?? {};
  return [
    `# ${o.name ?? agent.reference} — Agentforce design specification`,
    '',
    `**Reference:** ${agent.reference} · **Version:** ${agent.version} · **Status:** ${agent.status}`,
    `**Risk:** ${agent.risk_rating} · **Release:** ${agent.release} · **Lifecycle stage:** ${agent.lifecycle_stage}`,
    '',
    '## 1. Overview',
    `- Description: ${o.description ?? '—'}`,
    `- Business objective: ${o.businessObjective ?? '—'}`,
    `- Target outcome: ${o.businessOutcome ?? '—'}`,
    `- Persona / users: ${o.targetPersona ?? '—'} — ${o.targetUsers ?? '—'}`,
    `- Channels: ${(o.channels ?? []).join(', ') || '—'}`,
    `- Automation level: ${o.automationLevel ?? '—'} · Environment: ${o.environment ?? '—'}`,
    '',
    '## 2. Topics',
    ...topics.flatMap((row) => {
      const t = row.data ?? {};
      return [
        `### ${t.name} (${t.status}, ${t.priority} priority)`,
        `- Scope: ${t.scope ?? '—'}`,
        `- Utterances: ${(t.sampleUtterances ?? []).join(' | ') || 'none'}`,
        `- Permitted actions: ${(t.permittedActionIds ?? []).join(', ') || 'none'}`,
        `- Escalation: ${(t.escalationConditions ?? []).join('; ') || 'none'}`,
        '',
      ];
    }),
    '## 3. Actions',
    '| Action | Type | System | Risk | Confirmation | Authorization |',
    '| --- | --- | --- | --- | --- | --- |',
    ...actions.map((row) => {
      const a = row.data ?? {};
      return `| ${a.name} | ${a.actionType} | ${a.system} | ${a.riskRating} | ${
        a.requiresConfirmation ? 'Yes' : 'No'
      } | ${row.authorization_state} |`;
    }),
    '',
    '## 4. Grounding',
    '| Source | Type | Retrieval | Freshness | Classification |',
    '| --- | --- | --- | --- | --- |',
    ...grounding.map((row) => {
      const g = row.data ?? {};
      return `| ${g.name} | ${g.sourceType} | ${g.retrievalPattern} | ${g.freshness} | ${g.dataClassification} |`;
    }),
    '',
    '## 5. Guardrails',
    '| Category | Statement | Enforcement | Severity | Controls |',
    '| --- | --- | --- | --- | --- |',
    ...guardrails.map((row) => {
      const g = row.data ?? {};
      return `| ${g.category} | ${g.statement} | ${g.enforcement} | ${g.severity} | ${
        (g.controlIds ?? []).join(', ') || 'Unmapped'
      } |`;
    }),
  ].join('\n');
};

const buildCsv = (agent: Row, topics: Row[], actions: Row[]) => {
  const actionById = new Map(actions.map((row) => [String((row.data ?? {}).id ?? row.id), row.data ?? {}]));
  const header = ['Agent', 'Topic', 'Action', 'System', 'Risk', 'Controls'];
  const rows = topics.flatMap((topicRow) => {
    const topic = topicRow.data ?? {};
    const ids: string[] = topic.permittedActionIds ?? [];
    if (ids.length === 0) return [[agent.overview?.name ?? agent.reference, topic.name, 'Unmapped', '—', '—', '—']];
    return ids.map((id) => {
      const action: Row = actionById.get(id) ?? {};
      return [
        agent.overview?.name ?? agent.reference,
        topic.name,
        action.name ?? id,
        action.system ?? '—',
        action.riskRating ?? '—',
        (action.controlIds ?? []).join(' ') || 'Unmapped',
      ];
    });
  });
  return [header.join(','), ...rows.map((row) => row.map((cell) => csvCell(String(cell))).join(','))].join('\n');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { agentId, format } = parsed.data;

    const [agentRes, topicsRes, actionsRes, groundingRes, guardrailsRes] = await Promise.all([
      supabase.from('agents').select('*').eq('id', agentId).maybeSingle(),
      supabase.from('agent_topics').select('*').eq('agent_id', agentId).order('position'),
      supabase.from('agent_actions').select('*').eq('agent_id', agentId).order('position'),
      supabase.from('agent_grounding').select('*').eq('agent_id', agentId).order('position'),
      supabase.from('agent_guardrails').select('*').eq('agent_id', agentId).order('position'),
    ]);

    if (agentRes.error || !agentRes.data) {
      return new Response(JSON.stringify({ error: 'Agent not found or not visible to you' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const agent = agentRes.data as Row;
    const topics = (topicsRes.data ?? []) as Row[];
    const actions = (actionsRes.data ?? []) as Row[];

    const content =
      format === 'markdown'
        ? buildMarkdown(agent, topics, actions, (groundingRes.data ?? []) as Row[], (guardrailsRes.data ?? []) as Row[])
        : buildCsv(agent, topics, actions);

    const contentHash = await sha256(content);
    const byteSize = new TextEncoder().encode(content).byteLength;
    const email = String(claims.claims.email ?? 'unknown');

    const { data: job, error: jobError } = await supabase
      .from('export_jobs')
      .insert({
        agent_id: agentId,
        format,
        status: 'complete',
        content_hash: contentHash,
        byte_size: byteSize,
        requested_by: email,
      })
      .select('*')
      .single();

    if (jobError) {
      console.error('export_jobs insert failed:', jobError.message);
      return new Response(JSON.stringify({ error: 'Export job could not be recorded', details: jobError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const filename = `${agent.reference}-${format === 'markdown' ? 'design-spec.md' : 'traceability.csv'}`;

    return new Response(JSON.stringify({ job, filename, contentHash, byteSize, content }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('agent-export failed:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
