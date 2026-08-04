import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/common/Primitives";
import { search } from "@/services";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const hits = search(query);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Unified search" title="Search" description="Search clients, projects, documents, cases and conditions across the platform." />
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records…" className="max-w-lg" />
      {query.trim().length < 2 && <EmptyState title="Type at least two characters" />}
      <ul className="space-y-2">
        {hits.map((h) => (
          <li key={`${h.group}-${h.id}`} className="card-surface card-hover px-4 py-3">
            <Link to={h.href} className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium text-foreground">{h.title}</span>
                <span className="block text-xs text-muted-foreground">{h.group} · {h.subtitle}</span>
              </span>
              <span className="num text-xs text-muted-foreground">{h.meta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
