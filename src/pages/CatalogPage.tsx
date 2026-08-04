import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { Pill } from "@/components/enterprise/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import {
  EXCLUDED_PRODUCTS,
  INDUSTRIES,
  PLATFORM_CONCEPTS,
  SALESFORCE_PRODUCTS,
  SOURCE_PLATFORMS,
  getStage,
} from "@/domain/catalogs";
import type { PlatformConcept, SalesforceProduct, SourcePlatform } from "@/domain/types";

const productColumns: readonly DataTableColumn<SalesforceProduct>[] = [
  { key: "name", header: "Product", render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "category", header: "Category", render: (row) => <Pill>{row.category}</Pill> },
  {
    key: "industries",
    header: "Industries",
    render: (row) => (
      <span className="flex flex-wrap gap-1.5">
        {row.industries.map((industry) => (
          <Pill key={industry}>{industry}</Pill>
        ))}
      </span>
    ),
  },
];

const sourceColumns: readonly DataTableColumn<SourcePlatform>[] = [
  { key: "name", header: "Source platform", render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "category", header: "Category", render: (row) => <Pill>{row.category}</Pill> },
  {
    key: "patterns",
    header: "Supported patterns",
    render: (row) => (
      <span className="flex flex-wrap gap-1.5">
        {row.supportedPatterns.map((pattern) => (
          <Pill key={pattern}>{pattern}</Pill>
        ))}
      </span>
    ),
  },
];

const conceptColumns: readonly DataTableColumn<PlatformConcept>[] = [
  { key: "name", header: "Capability", render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "group", header: "Group", render: (row) => <Pill>{row.group}</Pill> },
  { key: "description", header: "Description", render: (row) => <span className="text-muted-foreground">{row.description}</span> },
  {
    key: "stages",
    header: "Stages",
    render: (row) => (
      <span className="flex flex-wrap gap-1.5">
        {row.stages.map((stage) => (
          <Pill key={stage}>{getStage(stage)?.name ?? stage}</Pill>
        ))}
      </span>
    ),
  },
];

const CatalogPage = () => (
  <>
    <PageHeader
      eyebrow="Reference"
      title="Platform catalog"
      description="Supported industries, Salesforce products, source platforms and Axion capabilities, with explicit out-of-scope items."
    />

    <SectionCard title="Industry releases" description="BFSI is the initial release; the architecture supports later expansion.">
      <ul className="grid gap-3 md:grid-cols-3">
        {INDUSTRIES.map((industry) => (
          <li key={industry.id} className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{industry.id}</p>
              <Pill className={industry.enabled ? "border-success/30 bg-success/10 text-success" : undefined}>
                {industry.enabled ? "Available" : "Planned"}
              </Pill>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{industry.name}</p>
            <p className="mt-2 text-xs text-muted-foreground">{industry.note}</p>
          </li>
        ))}
      </ul>
    </SectionCard>

    <SectionCard title="Supported Salesforce products">
      <DataTable columns={productColumns} rows={SALESFORCE_PRODUCTS} rowKey={(row) => row.id} />
    </SectionCard>

    <SectionCard title="Source platform catalog">
      <DataTable columns={sourceColumns} rows={SOURCE_PLATFORMS} rowKey={(row) => row.id} />
    </SectionCard>

    <SectionCard title="Axion capabilities">
      <DataTable columns={conceptColumns} rows={PLATFORM_CONCEPTS} rowKey={(row) => row.id} />
    </SectionCard>

    <SectionCard title="Explicitly out of scope" description="These products are never offered as selectable options in Axion.">
      <ul className="grid gap-3 md:grid-cols-2">
        {EXCLUDED_PRODUCTS.map((product) => (
          <li key={product.id} className="rounded-lg border border-dashed border-border bg-surface/60 p-4">
            <p className="text-sm font-medium text-foreground">{product.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{product.reason}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  </>
);

export default CatalogPage;
