import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "./States";

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => ReactNode;
  readonly align?: "left" | "right";
  readonly className?: string;
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle = "Nothing to show",
  emptyMessage = "No records match the current tenant and filters.",
}: DataTableProps<T>) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn("text-xs uppercase tracking-wider", column.align === "right" && "text-right")}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn("text-sm", column.align === "right" && "text-right", column.className)}
                >
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
