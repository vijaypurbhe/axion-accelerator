import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Search",
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) => (
  <div className={cn("relative", className)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    <Input
      id={id}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-9 pl-9"
    />
  </div>
);

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterDefinition {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly FilterOption[];
  readonly onChange: (value: string) => void;
}

export const FilterBar = ({
  search,
  filters,
  actions,
  className,
}: {
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  filters?: readonly FilterDefinition[];
  actions?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-card",
      className,
    )}
  >
    {search ? (
      <SearchInput
        value={search.value}
        onChange={search.onChange}
        placeholder={search.placeholder}
        className="min-w-[220px] flex-1"
      />
    ) : null}
    {filters?.map((filter) => (
      <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
        <SelectTrigger className="h-9 w-[180px]" aria-label={filter.label}>
          <SelectValue placeholder={filter.label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
          {filter.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ))}
    {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
  </div>
);
