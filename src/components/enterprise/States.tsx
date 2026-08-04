import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const LoadingState = ({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) => (
  <div className="space-y-3" role="status" aria-live="polite">
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}…
    </p>
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} className="h-12 w-full" />
    ))}
  </div>
);

export const ErrorState = ({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{message ?? "The request could not be completed."}</p>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  </div>
);

export const EmptyState = ({
  title,
  message,
  action,
  icon,
  className,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center",
      className,
    )}
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
      {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
    </div>
    <div className="space-y-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
    {action}
  </div>
);
