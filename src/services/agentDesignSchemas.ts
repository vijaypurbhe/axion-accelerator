import { z } from "zod";
import {
  AGENT_ACTION_TYPES,
  GROUNDING_SOURCE_TYPES,
  GUARDRAIL_CATEGORIES,
  type AgentAction,
  type AgentTopic,
  type GroundingSource,
  type Guardrail,
} from "@/domain/phase6";
import { ROLES } from "@/domain/rbac";
import type { ChildTable } from "@/repositories/supabase/agentDesignStore";

/**
 * Zod validation for inline editing of Agentforce design objects.
 * Each schema validates only the human-editable surface; unedited fields on the
 * existing record are preserved by merging in the drawer save handler.
 */

const ROLE_IDS = ROLES.map((role) => role.id) as [string, ...string[]];
const nonEmpty = (label: string, max = 400) =>
  z.string().trim().min(3, `${label} must be at least 3 characters`).max(max, `${label} is too long`);

/** Newline / comma separated list input, normalised to a trimmed string array. */
export const listField = (min = 0, label = "Value") =>
  z
    .string()
    .transform((value) =>
      value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    )
    .refine((entries) => entries.length >= min, `${label}: at least ${min} entry required`);

export const topicSchema = z.object({
  name: nonEmpty("Topic name", 120),
  classificationDescription: nonEmpty("Classification description", 600),
  scope: nonEmpty("Scope", 600),
  sampleUtterances: listField(2, "Sample utterances"),
  instructions: listField(1, "Instructions"),
  permittedActionIds: listField(0),
  prohibitedActions: listField(0),
  requiredDataProductIds: listField(0),
  escalationConditions: listField(1, "Escalation conditions"),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["draft", "in-review", "approved", "deferred"]),
  owner: z.enum(ROLE_IDS),
});

export const actionSchema = z.object({
  name: nonEmpty("Action name", 120),
  description: nonEmpty("Description", 600),
  actionType: z.enum(AGENT_ACTION_TYPES as unknown as [string, ...string[]]),
  system: nonEmpty("System", 120),
  reference: z.string().trim().max(160).default(""),
  authentication: nonEmpty("Authentication", 200),
  authorization: nonEmpty("Authorization", 200),
  timeoutSeconds: z.coerce.number().int().min(1, "Timeout must be at least 1s").max(900),
  retryBehavior: z.string().trim().max(200).default(""),
  validation: listField(1, "Validation rules"),
  sideEffects: listField(0),
  rollback: nonEmpty("Rollback", 300),
  auditRequirement: nonEmpty("Audit requirement", 300),
  dataClassification: z.enum(["public", "internal", "confidential", "restricted", "regulated"]),
  controlIds: listField(1, "Trust controls"),
  riskRating: z.enum(["low", "medium", "high", "critical"]),
  testStatus: z.enum(["not-started", "in-progress", "passing", "failing", "blocked"]),
  requiresConfirmation: z.boolean(),
  requiresHumanReview: z.boolean(),
});

export const groundingSchema = z.object({
  name: nonEmpty("Source name", 120),
  sourceType: z.enum(GROUNDING_SOURCE_TYPES as unknown as [string, ...string[]]),
  permittedFields: listField(1, "Permitted fields"),
  retrievalPattern: z.enum(["semantic-search", "direct-lookup", "filtered-query", "aggregate", "stream"]),
  freshness: nonEmpty("Freshness", 120),
  identityRequirement: z.enum(["none", "verified-party", "authenticated-user", "step-up-verified"]),
  accessPolicy: nonEmpty("Access policy", 300),
  dataClassification: z.enum(["public", "internal", "confidential", "restricted", "regulated"]),
  citationRequired: z.boolean(),
  fallback: nonEmpty("Fallback", 300),
  controlIds: listField(0),
});

export const guardrailSchema = z.object({
  category: z.enum(GUARDRAIL_CATEGORIES as unknown as [string, ...string[]]),
  statement: nonEmpty("Guardrail statement", 600),
  enforcement: z.enum(["prompt-instruction", "platform-config", "deterministic-rule", "human-review"]),
  appliesToTopicIds: listField(0),
  appliesToActionIds: listField(0),
  controlIds: listField(1, "Trust controls"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  testable: z.boolean(),
  reviewed: z.boolean(),
});

export type DesignObjectKind = "topic" | "action" | "grounding" | "guardrail";

export const DESIGN_OBJECT_TABLE: Record<DesignObjectKind, ChildTable> = {
  topic: "agent_topics",
  action: "agent_actions",
  grounding: "agent_grounding",
  guardrail: "agent_guardrails",
};

export const DESIGN_OBJECT_LABEL: Record<DesignObjectKind, string> = {
  topic: "Topic",
  action: "Action",
  grounding: "Grounding source",
  guardrail: "Guardrail",
};

export const designSchemas = {
  topic: topicSchema,
  action: actionSchema,
  grounding: groundingSchema,
  guardrail: guardrailSchema,
} as const;

/** Blank records used when adding a new design object. */
export const emptyDesignObject = (kind: DesignObjectKind) => {
  const shared = { origin: "human-authored" as const };
  if (kind === "topic")
    return {
      ...shared,
      name: "",
      classificationDescription: "",
      scope: "",
      sampleUtterances: [],
      instructions: [],
      permittedActionIds: [],
      prohibitedActions: [],
      requiredDataProductIds: [],
      escalationConditions: [],
      priority: "medium",
      status: "draft",
      owner: "agentforce-architect",
    } as unknown as AgentTopic;
  if (kind === "action")
    return {
      ...shared,
      name: "",
      description: "",
      actionType: "flow",
      system: "",
      reference: "",
      inputs: [],
      outputs: [],
      authentication: "",
      authorization: "",
      timeoutSeconds: 30,
      retryBehavior: "",
      validation: [],
      sideEffects: [],
      rollback: "",
      auditRequirement: "",
      dataClassification: "confidential",
      controlIds: [],
      riskRating: "medium",
      testStatus: "not-started",
      requiresConfirmation: true,
      requiresHumanReview: false,
    } as unknown as AgentAction;
  if (kind === "grounding")
    return {
      ...shared,
      name: "",
      sourceType: "unified-profile",
      permittedFields: [],
      retrievalPattern: "direct-lookup",
      freshness: "",
      identityRequirement: "verified-party",
      accessPolicy: "",
      dataClassification: "confidential",
      citationRequired: true,
      fallback: "",
      controlIds: [],
    } as unknown as GroundingSource;
  return {
    ...shared,
    category: "compliance",
    statement: "",
    enforcement: "prompt-instruction",
    appliesToTopicIds: [],
    appliesToActionIds: [],
    controlIds: [],
    severity: "medium",
    testable: true,
    reviewed: false,
  } as unknown as Guardrail;
};
