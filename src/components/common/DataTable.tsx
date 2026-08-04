import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EmptyState } from "./Primitives";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: "left" | "right";
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  onRowClick,
  emptyTitle = "No records match the current filters",
  toolbar,
  dense,
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  toolbar?: ReactNode;
  dense?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);

  const filtered = useMemo(() => {
    let out = rows;
    if (query.trim() && searchKeys) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchKeys(r).toLowerCase().includes(q));
    }
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sortValue) {
      out = [...out].sort((a, b) => {
        const av = col.sortValue!(a);
        const bv = col.sortValue!(b);
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * dir;
      });
    }
    return out;
  }, [rows, query, searchKeys, sortKey, dir, columns]);

  return (
    <div className="space-y-3">
      {(searchKeys || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {searchKeys ? (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter records…" className="pl-9" />
            </div>
          ) : (
            <span />
          )}
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-secondary/70">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "label-caps whitespace-nowrap px-4 py-2.5 text-left",
                    col.align === "right" && "text-right",
                    col.className,
                  )}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => {
                        if (sortKey === col.key) setDir((d) => (d === 1 ? -1 : 1));
                        else {
                          setSortKey(col.key);
                          setDir(1);
                        }
                      }}
                    >
                      {col.header}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={cn("data-grid-row", onRowClick && "cursor-pointer")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 align-middle", dense ? "py-2" : "py-3", col.align === "right" && "text-right", col.className)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <EmptyState title={emptyTitle} description="Adjust the filters or search term to widen the result set." />}
      <p className="text-xs text-muted-foreground">
        Showing <span className="num font-medium text-foreground">{filtered.length}</span> of{" "}
        <span className="num">{rows.length}</span> records
      </p>
    </div>
  );
}
