import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PageHeader, SectionCard, StatTile } from "@/components/enterprise/Layout";
import { DataTable, type DataTableColumn } from "@/components/enterprise/DataTable";
import { FilterBar } from "@/components/enterprise/FilterBar";
import { ErrorState, LoadingState } from "@/components/enterprise/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, DOMAIN_LABELS, STATE_LABELS } from "@/domain/dataProducts";
import { productCompleteness, mappingCoverage } from "@/services/dataQuality";
import { useActiveInitiativeId, useDataProducts, useDataProductTemplates, useFieldMappings } from "@/hooks/usePhase3";
import type { DataProduct, DataProductCategory } from "@/domain/dataProducts";

const DataProductLibraryPage = () => {
  const navigate = useNavigate();
  const initiativeId = useActiveInitiativeId();
  const templates = useDataProductTemplates();
  const products = useDataProducts(initiativeId);
  const mappings = useFieldMappings(initiativeId);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [domain, setDomain] = useState<string>("all");

  const isLoading = templates.isLoading || products.isLoading;
  const isError = templates.isError || products.isError;

  const rows: DataProduct[] = useMemo(() => {
    const clientProducts = products.data ?? [];
    const usedTemplateIds = new Set(clientProducts.map((product) => product.derivedFromTemplateId));
    const remainingTemplates = (templates.data ?? []).filter((template) => !usedTemplateIds.has(template.id));
    return [...clientProducts, ...remainingTemplates];
  }, [templates.data, products.data]);

  const filtered = rows.filter((product) => {
    const matchesSearch =
      !search ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || product.category === category;
    const matchesDomain = domain === "all" || product.domain === domain;
    return matchesSearch && matchesCategory && matchesDomain;
  });

  const columns: readonly DataTableColumn<DataProduct>[] = [
    {
      key: "name",
      header: "Data product",
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.isTemplate ? "Accelerator template" : "Client instance"}</p>
        </div>
      ),
    },
    { key: "domain", header: "Domain", render: (row) => DOMAIN_LABELS[row.domain] },
    {
      key: "category",
      header: "Category",
      render: (row) => <Badge variant="outline">{CATEGORY_LABELS[row.category]}</Badge>,
    },
    { key: "state", header: "State", render: (row) => STATE_LABELS[row.state] },
    { key: "attributes", header: "Attributes", render: (row) => row.attributes.length, align: "right" },
    {
      key: "completeness",
      header: "Definition completeness",
      render: (row) => `${productCompleteness(row)}%`,
      align: "right",
    },
    {
      key: "coverage",
      header: "Mapping coverage",
      render: (row) => (row.isTemplate ? "—" : `${mappingCoverage(row, mappings.data ?? [])}%`),
      align: "right",
    },
  ];

  const domains = Array.from(new Set(rows.map((product) => product.domain)));
  const categories = Array.from(new Set(rows.map((product) => product.category)));

  const avgCompleteness = rows.length
    ? Math.round(rows.reduce((sum, product) => sum + productCompleteness(product), 0) / rows.length)
    : 0;
  const publishedCount = rows.filter((product) => product.state === "published").length;
  const inReviewCount = rows.filter((product) => product.state === "in-review").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Product Ecosystem"
        title="Data product library"
        description="Common enterprise and BFSI canonical templates alongside client-instantiated and custom data products."
        actions={
          <Button onClick={() => navigate("/data-products/builder")}>
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden /> Build custom product
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading the data product library" />
      ) : isError ? (
        <ErrorState message="Unable to load the data product library." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatTile label="Total products" value={rows.length} hint={`${templates.data?.length ?? 0} accelerator templates`} />
            <StatTile label="Published" value={publishedCount} />
            <StatTile label="In review" value={inReviewCount} />
            <StatTile label="Avg. definition completeness" value={`${avgCompleteness}%`} />
          </div>

          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: "Search data products" }}
            filters={[
              {
                id: "category",
                label: "Category",
                value: category,
                onChange: setCategory,
                options: [
                  { value: "all", label: "All categories" },
                  ...categories.map((value) => ({ value, label: CATEGORY_LABELS[value as DataProductCategory] })),
                ],
              },
              {
                id: "domain",
                label: "Domain",
                value: domain,
                onChange: setDomain,
                options: [
                  { value: "all", label: "All domains" },
                  ...domains.map((value) => ({ value, label: DOMAIN_LABELS[value] })),
                ],
              },
            ]}
          />

          <SectionCard title="Catalog" description={`${filtered.length} of ${rows.length} data products`}>
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(row) => row.id}
              onRowClick={(row) => navigate(`/data-products/${row.id}`)}
              emptyTitle="No data products match"
              emptyMessage="Adjust search or filters, or build a custom data product."
            />
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default DataProductLibraryPage;
