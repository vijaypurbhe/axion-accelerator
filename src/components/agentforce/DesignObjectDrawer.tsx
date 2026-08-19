import { useEffect, useMemo, useState } from "react";
import type { ZodTypeAny } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Drawer } from "@/components/enterprise/Overlays";
import {
  AGENT_ACTION_TYPES,
  AGENT_ACTION_TYPE_LABEL,
  GROUNDING_SOURCE_LABEL,
  GROUNDING_SOURCE_TYPES,
  GUARDRAIL_CATEGORIES,
  GUARDRAIL_CATEGORY_LABEL,
} from "@/domain/phase6";
import { ROLES } from "@/domain/rbac";
import {
  DESIGN_OBJECT_LABEL,
  designSchemas,
  type DesignObjectKind,
} from "@/services/agentDesignSchemas";

/* ------------------------------ field metadata ------------------------------ */

type FieldKind = "text" | "textarea" | "list" | "select" | "number" | "switch";

interface FieldSpec {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly hint?: string;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  readonly full?: boolean;
}

const opts = (values: readonly string[], labels?: Record<string, string>) =>
  values.map((value) => ({ value, label: labels?.[value] ?? value.replace(/-/g, " ") }));

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role.id, label: role.name }));
const CLASSIFICATIONS = opts(["public", "internal", "confidential", "restricted", "regulated"]);
const RISK = opts(["low", "medium", "high", "critical"]);

const FIELDS: Record<DesignObjectKind, readonly FieldSpec[]> = {
  topic: [
    { name: "name", label: "Topic name", kind: "text" },
    { name: "priority", label: "Priority", kind: "select", options: opts(["high", "medium", "low"]) },
    {
      name: "classificationDescription",
      label: "Classification description",
      kind: "textarea",
      hint: "How the agent recognises this topic.",
      full: true,
    },
    { name: "scope", label: "Scope", kind: "textarea", full: true },
    { name: "sampleUtterances", label: "Sample utterances", kind: "list", hint: "One per line — minimum two.", full: true },
    { name: "instructions", label: "Topic instructions", kind: "list", full: true },
    { name: "permittedActionIds", label: "Permitted action IDs", kind: "list", full: true },
    { name: "prohibitedActions", label: "Prohibited actions", kind: "list", full: true },
    { name: "requiredDataProductIds", label: "Required data product IDs", kind: "list", full: true },
    { name: "escalationConditions", label: "Escalation conditions", kind: "list", full: true },
    { name: "status", label: "Status", kind: "select", options: opts(["draft", "in-review", "approved", "deferred"]) },
    { name: "owner", label: "Owner role", kind: "select", options: ROLE_OPTIONS },
  ],
  action: [
    { name: "name", label: "Action name", kind: "text" },
    {
      name: "actionType",
      label: "Action type",
      kind: "select",
      options: opts(AGENT_ACTION_TYPES, AGENT_ACTION_TYPE_LABEL as Record<string, string>),
    },
    { name: "description", label: "Description", kind: "textarea", full: true },
    { name: "system", label: "System", kind: "text" },
    { name: "reference", label: "Platform reference", kind: "text", hint: "Flow API name, Apex class, endpoint." },
    { name: "authentication", label: "Authentication", kind: "text" },
    { name: "authorization", label: "Authorization", kind: "text" },
    { name: "timeoutSeconds", label: "Timeout (seconds)", kind: "number" },
    { name: "retryBehavior", label: "Retry behaviour", kind: "text" },
    { name: "validation", label: "Validation rules", kind: "list", full: true },
    { name: "sideEffects", label: "Side effects", kind: "list", full: true },
    { name: "rollback", label: "Rollback", kind: "textarea", full: true },
    { name: "auditRequirement", label: "Audit requirement", kind: "textarea", full: true },
    { name: "dataClassification", label: "Data classification", kind: "select", options: CLASSIFICATIONS },
    { name: "controlIds", label: "Trust control IDs", kind: "list", full: true },
    { name: "riskRating", label: "Risk rating", kind: "select", options: RISK },
    {
      name: "testStatus",
      label: "Test status",
      kind: "select",
      options: opts(["not-started", "in-progress", "passing", "failing", "blocked"]),
    },
    { name: "requiresConfirmation", label: "Requires user confirmation", kind: "switch" },
    { name: "requiresHumanReview", label: "Requires human review", kind: "switch" },
  ],
  grounding: [
    { name: "name", label: "Source name", kind: "text" },
    {
      name: "sourceType",
      label: "Source type",
      kind: "select",
      options: opts(GROUNDING_SOURCE_TYPES, GROUNDING_SOURCE_LABEL as Record<string, string>),
    },
    { name: "permittedFields", label: "Permitted fields", kind: "list", full: true },
    {
      name: "retrievalPattern",
      label: "Retrieval pattern",
      kind: "select",
      options: opts(["semantic-search", "direct-lookup", "filtered-query", "aggregate", "stream"]),
    },
    { name: "freshness", label: "Freshness", kind: "text" },
    {
      name: "identityRequirement",
      label: "Identity requirement",
      kind: "select",
      options: opts(["none", "verified-party", "authenticated-user", "step-up-verified"]),
    },
    { name: "accessPolicy", label: "Access policy", kind: "textarea", full: true },
    { name: "dataClassification", label: "Data classification", kind: "select", options: CLASSIFICATIONS },
    { name: "fallback", label: "Fallback behaviour", kind: "textarea", full: true },
    { name: "controlIds", label: "Trust control IDs", kind: "list", full: true },
    { name: "citationRequired", label: "Citation required", kind: "switch" },
  ],
  guardrail: [
    {
      name: "category",
      label: "Category",
      kind: "select",
      options: opts(GUARDRAIL_CATEGORIES, GUARDRAIL_CATEGORY_LABEL as Record<string, string>),
    },
    { name: "severity", label: "Severity", kind: "select", options: RISK },
    { name: "statement", label: "Guardrail statement", kind: "textarea", full: true },
    {
      name: "enforcement",
      label: "Enforcement",
      kind: "select",
      options: opts(["prompt-instruction", "platform-config", "deterministic-rule", "human-review"]),
    },
    { name: "controlIds", label: "Trust control IDs", kind: "list", full: true },
    { name: "appliesToTopicIds", label: "Applies to topic IDs", kind: "list", full: true },
    { name: "appliesToActionIds", label: "Applies to action IDs", kind: "list", full: true },
    { name: "testable", label: "Testable", kind: "switch" },
    { name: "reviewed", label: "Reviewed", kind: "switch" },
  ],
};

/* --------------------------------- component -------------------------------- */

type FormValues = Record<string, string | boolean>;

const toFormValues = (kind: DesignObjectKind, record: Record<string, unknown>): FormValues => {
  const values: FormValues = {};
  for (const field of FIELDS[kind]) {
    const raw = record[field.name];
    if (field.kind === "switch") values[field.name] = Boolean(raw);
    else if (field.kind === "list") values[field.name] = Array.isArray(raw) ? (raw as string[]).join("\n") : "";
    else values[field.name] = raw === undefined || raw === null ? "" : String(raw);
  }
  return values;
};

export interface DesignObjectDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly kind: DesignObjectKind;
  /** Existing record when editing; a blank record when adding. */
  readonly record: Record<string, unknown>;
  readonly isNew: boolean;
  readonly saving?: boolean;
  /** Receives the existing record merged with validated values. */
  readonly onSave: (merged: Record<string, unknown>, label: string) => void;
}

export const DesignObjectDrawer = ({
  open,
  onOpenChange,
  kind,
  record,
  isNew,
  saving,
  onSave,
}: DesignObjectDrawerProps) => {
  const fields = FIELDS[kind];
  const [values, setValues] = useState<FormValues>(() => toFormValues(kind, record));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(toFormValues(kind, record));
      setErrors({});
    }
  }, [open, kind, record]);

  const schema = useMemo<ZodTypeAny>(() => designSchemas[kind], [kind]);

  const submit = () => {
    const result = schema.safeParse(values);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    const parsed = result.data as Record<string, unknown>;
    const merged = { ...record, ...parsed };
    const label = String(parsed.name ?? parsed.statement ?? DESIGN_OBJECT_LABEL[kind]).slice(0, 80);
    onSave(merged, label);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={`${isNew ? "Add" : "Edit"} ${DESIGN_OBJECT_LABEL[kind].toLowerCase()}`}
      description="Changes are validated, written to the server and recorded in the audit trail. Readiness and diagnostics recompute on save."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `field-${field.name}`;
          const error = errors[field.name];
          return (
            <div key={field.name} className={field.full || field.kind === "textarea" || field.kind === "list" ? "sm:col-span-2" : undefined}>
              <div className="space-y-2">
                {field.kind === "switch" ? (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                    <Label htmlFor={id} className="text-sm">
                      {field.label}
                    </Label>
                    <Switch
                      id={id}
                      checked={Boolean(values[field.name])}
                      onCheckedChange={(checked) => setValues((prev) => ({ ...prev, [field.name]: checked }))}
                    />
                  </div>
                ) : (
                  <>
                    <Label htmlFor={id}>{field.label}</Label>
                    {field.kind === "select" ? (
                      <Select
                        value={String(values[field.name] ?? "")}
                        onValueChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
                      >
                        <SelectTrigger id={id}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options ?? []).map((option) => (
                            <SelectItem key={option.value} value={option.value} className="capitalize">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.kind === "textarea" || field.kind === "list" ? (
                      <Textarea
                        id={id}
                        rows={field.kind === "list" ? 3 : 2}
                        value={String(values[field.name] ?? "")}
                        onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      />
                    ) : (
                      <Input
                        id={id}
                        type={field.kind === "number" ? "number" : "text"}
                        value={String(values[field.name] ?? "")}
                        onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      />
                    )}
                  </>
                )}
                {field.hint && !error ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving}>
          {isNew ? "Create" : "Save changes"}
        </Button>
      </div>
    </Drawer>
  );
};

export default DesignObjectDrawer;
