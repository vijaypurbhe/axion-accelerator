import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MATURITY_BANDS } from "@/domain/phase2";
import type { CategoryScore } from "@/domain/phase2";
import { ASSESSMENT_CATEGORIES } from "@/data/assessmentBank";
import type { MaturityLevel } from "@/domain/types";
import { maturityName } from "@/services/scoring";

const LEVEL_CLASS: Record<MaturityLevel, string> = {
  1: "border-destructive/40 bg-destructive/10 text-destructive",
  2: "border-warning/40 bg-warning/10 text-warning-foreground",
  3: "border-accent/40 bg-accent/10 text-accent-foreground",
  4: "border-success/30 bg-success/10 text-success",
  5: "border-success/50 bg-success/20 text-success",
};

export const MaturityBadge = ({ level, className }: { level: MaturityLevel; className?: string }) => (
  <Badge variant="outline" className={cn("font-medium", LEVEL_CLASS[level], className)}>
    L{level} · {maturityName(level)}
  </Badge>
);

export const MaturityLegend = () => (
  <div className="flex flex-wrap items-center gap-2">
    {MATURITY_BANDS.map((band) => (
      <span
        key={band.level}
        className={cn("rounded-md border px-2 py-1 text-[11px] font-medium", LEVEL_CLASS[band.level])}
      >
        {band.level}. {band.name} ({band.min}+)
      </span>
    ))}
  </div>
);

const cellClass = (score: number) => {
  if (score >= 86) return "bg-success/25 text-success";
  if (score >= 70) return "bg-success/12 text-success";
  if (score >= 50) return "bg-accent/15 text-accent-foreground";
  if (score >= 30) return "bg-warning/20 text-warning-foreground";
  return "bg-destructive/15 text-destructive";
};

export const MaturityHeatmap = ({ scores }: { scores: readonly CategoryScore[] }) => (
  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
    {scores.map((score) => {
      const category = ASSESSMENT_CATEGORIES.find((entry) => entry.id === score.categoryId);
      return (
        <div
          key={score.categoryId}
          className={cn("rounded-lg border border-border p-3 transition-colors", cellClass(score.score))}
        >
          <p className="text-xs font-semibold leading-snug">{category?.name ?? score.categoryId}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-semibold tabular-nums">{score.score}</span>
            <span className="text-[11px] font-medium">
              L{score.maturity} · {score.answered}/{score.total} answered
            </span>
          </div>
        </div>
      );
    })}
  </div>
);
