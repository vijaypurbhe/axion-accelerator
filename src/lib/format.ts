export const currency = (value: number, opts: { compact?: boolean } = {}) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : value % 1 === 0 ? 0 : 2,
  }).format(value);

export const percent = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

export const shortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
};

export const dateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const relativeTime = (iso: string, now = new Date("2026-07-27T08:00:00Z")) => {
  const d = new Date(iso);
  const diff = d.getTime() - now.getTime();
  const mins = Math.round(diff / 60000);
  const abs = Math.abs(mins);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(mins, "minute");
  if (abs < 60 * 24) return rtf.format(Math.round(mins / 60), "hour");
  if (abs < 60 * 24 * 30) return rtf.format(Math.round(mins / (60 * 24)), "day");
  return rtf.format(Math.round(mins / (60 * 24 * 30)), "month");
};

/** Masks all but the final four characters of an identifier. */
export const maskId = (value: string) => {
  if (!value) return value;
  const tail = value.slice(-4);
  const head = value.slice(0, Math.max(0, value.length - 4)).replace(/[A-Za-z0-9]/g, "•");
  return `${head}${tail}`;
};

export const daysUntil = (iso: string, now = new Date("2026-07-27T08:00:00Z")) =>
  Math.round((new Date(iso).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

export const initialsOf = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
