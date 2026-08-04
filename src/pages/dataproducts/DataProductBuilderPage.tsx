import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { PageHeader, SectionCard, KeyValue } from "@/components/enterprise/Layout";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LABELS,
  DIMENSION_LABELS,
  DOMAIN_LABELS,
  SENSITIVITY_LABELS,
} from "@/domain/dataProducts";
import type {
  DataDomain,
  DataProduct,
  DataProductAttribute,
  DataProductIdentifier,
  DataProductRelationship,
  DataType,
  QualityDimension,
  QualityRule,
  Sensitivity,
  Severity,
} from "@/domain/dataProducts";
import type { RoleId } from "@/domain/models";
import { useAxion } from "@/context/AxionContext";
import { useActiveInitiativeId, useDataProductTemplates, useDataProducts, useSaveDataProduct } from "@/hooks/usePhase3";

/**
 * Multi-step wizard to create a custom data product: start blank or clone a template,
 * then progressively define attributes, identifiers, relationships and quality rules
 * before reviewing and persisting via the phase 3 mutations.
 */

const STEPS = ["Origin", "Attributes", "Identifiers", "Relationships", "Quality rules", "Review"] as const;
type Step = (typeof STEPS)[number];

const DATA_TYPES: readonly DataType[] = [
  "string", "text", "number", "integer", "decimal", "boolean", "date", "datetime", "enum", "reference", "currency", "percent", "json",
];
const SENSITIVITIES: readonly Sensitivity[] = ["public", "internal", "confidential", "restricted", "pii", "financial-pii"];
const DOMAINS = Object.keys(DOMAIN_LABELS) as DataDomain[];
const DIMENSIONS = Object.keys(DIMENSION_LABELS) as QualityDimension[];
const SEVERITIES: readonly Severity[] = ["low", "medium", "high", "critical"];
const ROLES: readonly RoleId[] = ["data-steward", "data-engineer", "data360-architect", "enterprise-architect"];

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const emptyAttribute = (): DataProductAttribute => ({
  id: uid("attr"),
  businessName: "",
  technicalName: "",
  description: "",
  dataType: "string",
  required: false,
  sensitivity: "internal",
  businessDefinition: "",
});

const emptyIdentifier = (): DataProductIdentifier => ({
  id: uid("id"),
  name: "",
  kind: "primary",
  attributeIds: [],
  description: "",
  identityRelevant: false,
});

const emptyRelationship = (): DataProductRelationship => ({
  id: uid("rel"),
  name: "",
  targetProductId: "",
  cardinality: "1:M",
  description: "",
});

const emptyRule = (): QualityRule => ({
  id: uid("qr"),
  name: "",
  dimension: "completeness",
  description: "",
  expression: "",
  threshold: 95,
  severity: "medium",
  owner: "data-steward",
  remediation: "",
  cadence: "daily",
  status: "draft",
});

const DataProductBuilderPage = () => {
  const navigate = useNavigate();
  const { activeClientId } = useAxion();
  const initiativeId = useActiveInitiativeId();
  const templates = useDataProductTemplates();
  const existingProducts = useDataProducts(initiativeId);
  const saveProduct = useSaveDataProduct();

  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<"blank" | "clone" | null>(null);
  const [templateId, setTemplateId] = useState<string>("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessPurpose, setBusinessPurpose] = useState("");
  const [domain, setDomain] = useState<DataDomain>("customer");
  const [attributes, setAttributes] = useState<DataProductAttribute[]>([]);
  const [identifiers, setIdentifiers] = useState<DataProductIdentifier[]>([]);
  const [relationships, setRelationships] = useState<DataProductRelationship[]>([]);
  const [qualityRules, setQualityRules] = useState<QualityRule[]>([]);

  const step = STEPS[stepIndex];

  const applyTemplate = (id: string) => {
    const template = templates.data?.find((item) => item.id === id);
    if (!template) return;
    setTemplateId(id);
    setName(`${template.name} (custom)`);
    setDescription(template.description);
    setBusinessPurpose(template.businessPurpose);
    setDomain(template.domain);
    setAttributes(template.attributes.map((attribute) => ({ ...attribute })));
    setIdentifiers(template.identifiers.map((identifier) => ({ ...identifier })));
    setRelationships(template.relationships.map((relationship) => ({ ...relationship })));
    setQualityRules(template.qualityRules.map((rule) => ({ ...rule })));
  };

  const canAdvance = useMemo(() => {
    if (step === "Origin") return Boolean(mode) && Boolean(name.trim()) && (mode === "blank" || Boolean(templateId));
    return true;
  }, [step, mode, name, templateId]);

  const goNext = () => setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((index) => Math.max(index - 1, 0));

  const isLoading = templates.isLoading || existingProducts.isLoading;
  const isError = templates.isError || existingProducts.isError;

  const buildProduct = (): DataProduct => {
    const nowIso = new Date().toISOString();
    const id = `dp-custom-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid("product")}`;
    return {
      id,
      name: name.trim(),
      description,
      businessPurpose,
      category: "custom",
      domain,
      industry: "cross-industry",
      businessOwnerRole: "data-steward",
      technicalOwnerRole: "data360-architect",
      isTemplate: false,
      derivedFromTemplateId: mode === "clone" ? templateId : undefined,
      clientId: activeClientId,
      initiativeId,
      state: "draft",
      version: "0.1.0",
      reuseCount: 0,
      attributes,
      identifiers,
      relationships,
      qualityRules,
      controls: {
        sensitivity: "confidential",
        classifications: ["Business critical"],
        regulatory: [],
        retention: "To be defined during governance review.",
        consentImplications: "To be defined during governance review.",
        encryptionRequired: true,
        maskingRequired: false,
        residency: "To be defined during governance review.",
      },
      sampleSourceMappings: [],
      salesforceAlignment: "To be defined.",
      applicableUseCases: [],
      stages: ["design", "configure"],
      versions: [
        {
          id: `${id}-v1`,
          version: "0.1.0",
          state: "draft",
          createdAt: nowIso,
          createdBy: "current-user",
          summary: mode === "clone" ? `Cloned from ${templateId}.` : "Created blank via the data product builder.",
          changes: [{ field: "product", change: "added", after: name.trim() }],
        },
      ],
      approvals: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  const handleCreate = () => {
    const product = buildProduct();
    saveProduct.mutate(
      { product, isNew: true },
      { onSuccess: (saved) => navigate(`/data-products/${saved.id}`) },
    );
  };

  if (isLoading) return <LoadingState label="Loading builder resources" />;
  if (isError) return <ErrorState message="Unable to load templates for the builder." />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Product Ecosystem"
        title="Build a custom data product"
        description="Start blank or clone an accelerator template, then define attributes, identifiers, relationships and quality rules."
        actions={
          <Button variant="outline" onClick={() => navigate("/data-products")}>
            Cancel
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => index <= stepIndex && setStepIndex(index)}
              className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
                index === stepIndex
                  ? "border-brand bg-brand/10 text-brand"
                  : index < stepIndex
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border text-muted-foreground"
              }`}
            >
              {index < stepIndex ? <Check className="h-3 w-3" aria-hidden /> : null}
              {label}
            </button>
            {index < STEPS.length - 1 ? <div className="h-px w-4 bg-border" /> : null}
          </div>
        ))}
      </div>

      {step === "Origin" ? (
        <SectionCard title="Choose an origin">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("blank")}
              className={`rounded-xl border p-4 text-left ${mode === "blank" ? "border-brand bg-brand/5" : "border-border"}`}
            >
              <p className="text-sm font-semibold text-foreground">Start blank</p>
              <p className="mt-1 text-xs text-muted-foreground">Define every attribute, identifier and rule from scratch.</p>
            </button>
            <button
              type="button"
              onClick={() => setMode("clone")}
              className={`rounded-xl border p-4 text-left ${mode === "clone" ? "border-brand bg-brand/5" : "border-border"}`}
            >
              <p className="text-sm font-semibold text-foreground">Clone a template</p>
              <p className="mt-1 text-xs text-muted-foreground">Start from a common or BFSI accelerator template and adapt it.</p>
            </button>
          </div>

          {mode === "clone" ? (
            <div className="mt-4 space-y-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger aria-label="Template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {(templates.data ?? []).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} · {CATEGORY_LABELS[template.category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dp-name">Data product name</Label>
              <Input id="dp-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Advisor relationship" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dp-domain">Domain</Label>
              <Select value={domain} onValueChange={(value) => setDomain(value as DataDomain)}>
                <SelectTrigger id="dp-domain" aria-label="Domain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {DOMAIN_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dp-description">Description</Label>
              <Textarea id="dp-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dp-purpose">Business purpose</Label>
              <Textarea id="dp-purpose" value={businessPurpose} onChange={(event) => setBusinessPurpose(event.target.value)} rows={2} />
            </div>
          </div>
        </SectionCard>
      ) : null}

      {step === "Attributes" ? (
        <SectionCard
          title="Attributes"
          description={`${attributes.length} attribute${attributes.length === 1 ? "" : "s"} defined`}
          actions={
            <Button size="sm" variant="outline" onClick={() => setAttributes((rows) => [...rows, emptyAttribute()])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Add attribute
            </Button>
          }
        >
          {attributes.length === 0 ? (
            <EmptyState title="No attributes yet" message="Add at least one attribute to describe this data product's shape." />
          ) : (
            <div className="space-y-3">
              {attributes.map((attribute, index) => (
                <div key={attribute.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
                  <Input
                    className="sm:col-span-2"
                    placeholder="Business name"
                    value={attribute.businessName}
                    onChange={(event) =>
                      setAttributes((rows) => rows.map((row, i) => (i === index ? { ...row, businessName: event.target.value } : row)))
                    }
                  />
                  <Input
                    className="sm:col-span-2"
                    placeholder="technical_name"
                    value={attribute.technicalName}
                    onChange={(event) =>
                      setAttributes((rows) => rows.map((row, i) => (i === index ? { ...row, technicalName: event.target.value } : row)))
                    }
                  />
                  <Select
                    value={attribute.dataType}
                    onValueChange={(value) =>
                      setAttributes((rows) => rows.map((row, i) => (i === index ? { ...row, dataType: value as DataType } : row)))
                    }
                  >
                    <SelectTrigger aria-label="Data type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={attribute.sensitivity}
                    onValueChange={(value) =>
                      setAttributes((rows) => rows.map((row, i) => (i === index ? { ...row, sensitivity: value as Sensitivity } : row)))
                    }
                  >
                    <SelectTrigger aria-label="Sensitivity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SENSITIVITIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {SENSITIVITY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    className="sm:col-span-5"
                    placeholder="Description / business definition"
                    value={attribute.description}
                    rows={1}
                    onChange={(event) =>
                      setAttributes((rows) =>
                        rows.map((row, i) => (i === index ? { ...row, description: event.target.value, businessDefinition: event.target.value } : row)),
                      )
                    }
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={attribute.required}
                        onChange={(event) =>
                          setAttributes((rows) => rows.map((row, i) => (i === index ? { ...row, required: event.target.checked } : row)))
                        }
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(attribute.primaryKey)}
                        onChange={(event) =>
                          setAttributes((rows) => rows.map((row, i) => (i === index ? { ...row, primaryKey: event.target.checked || undefined } : row)))
                        }
                      />
                      PK
                    </label>
                    <Button size="icon" variant="ghost" onClick={() => setAttributes((rows) => rows.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {step === "Identifiers" ? (
        <SectionCard
          title="Identifiers"
          description="Define the keys used to reference and match records of this data product."
          actions={
            <Button size="sm" variant="outline" onClick={() => setIdentifiers((rows) => [...rows, emptyIdentifier()])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Add identifier
            </Button>
          }
        >
          {identifiers.length === 0 ? (
            <EmptyState title="No identifiers yet" message="Add a primary identifier so this product can be uniquely referenced." />
          ) : (
            <div className="space-y-3">
              {identifiers.map((identifier, index) => (
                <div key={identifier.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-5">
                  <Input
                    className="sm:col-span-2"
                    placeholder="Identifier name"
                    value={identifier.name}
                    onChange={(event) =>
                      setIdentifiers((rows) => rows.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))
                    }
                  />
                  <Select
                    value={identifier.kind}
                    onValueChange={(value) =>
                      setIdentifiers((rows) =>
                        rows.map((row, i) => (i === index ? { ...row, kind: value as DataProductIdentifier["kind"] } : row)),
                      )
                    }
                  >
                    <SelectTrigger aria-label="Kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["primary", "alternate", "natural", "external", "match"] as const).map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="sm:col-span-2"
                    placeholder="Description"
                    value={identifier.description}
                    onChange={(event) =>
                      setIdentifiers((rows) => rows.map((row, i) => (i === index ? { ...row, description: event.target.value } : row)))
                    }
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={identifier.identityRelevant}
                        onChange={(event) =>
                          setIdentifiers((rows) =>
                            rows.map((row, i) => (i === index ? { ...row, identityRelevant: event.target.checked } : row)),
                          )
                        }
                      />
                      Identity relevant
                    </label>
                    <Button size="icon" variant="ghost" onClick={() => setIdentifiers((rows) => rows.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {step === "Relationships" ? (
        <SectionCard
          title="Relationships"
          description="Model how this data product relates to other data products."
          actions={
            <Button size="sm" variant="outline" onClick={() => setRelationships((rows) => [...rows, emptyRelationship()])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Add relationship
            </Button>
          }
        >
          {relationships.length === 0 ? (
            <EmptyState title="No relationships yet" message="Relationships are optional but recommended for connected domains." />
          ) : (
            <div className="space-y-3">
              {relationships.map((relationship, index) => (
                <div key={relationship.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
                  <Input
                    className="sm:col-span-2"
                    placeholder="Relationship name"
                    value={relationship.name}
                    onChange={(event) =>
                      setRelationships((rows) => rows.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))
                    }
                  />
                  <Input
                    placeholder="Target product id"
                    value={relationship.targetProductId}
                    onChange={(event) =>
                      setRelationships((rows) =>
                        rows.map((row, i) => (i === index ? { ...row, targetProductId: event.target.value } : row)),
                      )
                    }
                  />
                  <Select
                    value={relationship.cardinality}
                    onValueChange={(value) =>
                      setRelationships((rows) =>
                        rows.map((row, i) => (i === index ? { ...row, cardinality: value as DataProductRelationship["cardinality"] } : row)),
                      )
                    }
                  >
                    <SelectTrigger aria-label="Cardinality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["1:1", "1:M", "M:1", "M:M"] as const).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="sm:col-span-2"
                    placeholder="Description"
                    value={relationship.description}
                    onChange={(event) =>
                      setRelationships((rows) => rows.map((row, i) => (i === index ? { ...row, description: event.target.value } : row)))
                    }
                  />
                  <Button size="icon" variant="ghost" onClick={() => setRelationships((rows) => rows.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {step === "Quality rules" ? (
        <SectionCard
          title="Quality rules"
          description="Attach data quality expectations that will drive scorecards after mapping."
          actions={
            <Button size="sm" variant="outline" onClick={() => setQualityRules((rows) => [...rows, emptyRule()])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Add rule
            </Button>
          }
        >
          {qualityRules.length === 0 ? (
            <EmptyState title="No quality rules yet" message="Define at least a completeness or uniqueness rule before publishing." />
          ) : (
            <div className="space-y-3">
              {qualityRules.map((rule, index) => (
                <div key={rule.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
                  <Input
                    className="sm:col-span-2"
                    placeholder="Rule name"
                    value={rule.name}
                    onChange={(event) => setQualityRules((rows) => rows.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))}
                  />
                  <Select
                    value={rule.dimension}
                    onValueChange={(value) =>
                      setQualityRules((rows) => rows.map((row, i) => (i === index ? { ...row, dimension: value as QualityDimension } : row)))
                    }
                  >
                    <SelectTrigger aria-label="Dimension">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {DIMENSION_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={rule.severity}
                    onValueChange={(value) => setQualityRules((rows) => rows.map((row, i) => (i === index ? { ...row, severity: value as Severity } : row)))}
                  >
                    <SelectTrigger aria-label="Severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={rule.owner}
                    onValueChange={(value) => setQualityRules((rows) => rows.map((row, i) => (i === index ? { ...row, owner: value as RoleId } : row)))}
                  >
                    <SelectTrigger aria-label="Owner">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Threshold %"
                    value={rule.threshold}
                    onChange={(event) =>
                      setQualityRules((rows) => rows.map((row, i) => (i === index ? { ...row, threshold: Number(event.target.value) } : row)))
                    }
                  />
                  <Textarea
                    className="sm:col-span-5"
                    placeholder="Expression"
                    value={rule.expression}
                    rows={1}
                    onChange={(event) => setQualityRules((rows) => rows.map((row, i) => (i === index ? { ...row, expression: event.target.value } : row)))}
                  />
                  <Button size="icon" variant="ghost" onClick={() => setQualityRules((rows) => rows.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {step === "Review" ? (
        <SectionCard title="Review and create" description="Confirm the definition before persisting this custom data product.">
          <dl className="grid gap-4 sm:grid-cols-2">
            <KeyValue label="Name" value={name || "Untitled"} />
            <KeyValue label="Domain" value={DOMAIN_LABELS[domain]} />
            <KeyValue label="Origin" value={mode === "clone" ? `Cloned from ${templateId}` : "Blank"} />
            <KeyValue label="Category" value="Custom" />
            <KeyValue label="Attributes" value={String(attributes.length)} />
            <KeyValue label="Identifiers" value={String(identifiers.length)} />
            <KeyValue label="Relationships" value={String(relationships.length)} />
            <KeyValue label="Quality rules" value={String(qualityRules.length)} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {attributes.slice(0, 12).map((attribute) => (
              <Badge key={attribute.id} variant="outline">
                {attribute.businessName || attribute.technicalName || "Unnamed attribute"}
              </Badge>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} disabled={stepIndex === 0}>
          <ChevronLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back
        </Button>
        {step === "Review" ? (
          <Button onClick={handleCreate} disabled={saveProduct.isPending || !name.trim()}>
            {saveProduct.isPending ? "Creating…" : "Create data product"}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canAdvance}>
            Next <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
};

export default DataProductBuilderPage;
