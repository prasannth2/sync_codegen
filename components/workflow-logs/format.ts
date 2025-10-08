// components/workflow-logs/format.ts
export const fmtUSD = (n?: number | null) =>
  n == null ? "-" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 4 });

export const fmtMs = (ms?: number | null) => (ms == null ? "-" : `${ms}ms`);

export const fmtTimeParts = (iso?: string | null) => {
  if (!iso) return { date: "-", time: "-" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase(),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
};

export const durationFrom = (start?: string | null, end?: string | null) => {
  if (!start || !end) return undefined;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 0 ? 0 : ms;
};

export const statusTone = (status?: string) => {
  const s = (status ?? "").toLowerCase();
  if (["failed", "error"].includes(s)) return { badge: "destructive", text: "error" };
  if (["running", "queued"].includes(s)) return { badge: "default", text: s };
  if (["succeeded", "success", "ok"].includes(s)) return { badge: "secondary", text: "success" };
  if (["info"].includes(s)) return { badge: "outline", text: "info" };
  return { badge: "outline", text: s || "—" };
};

export const triggerTone = (trigger?: string) => {
  const t = (trigger ?? "").toLowerCase();
  if (t === "schedule") return { className: "bg-emerald-500/90 text-white", text: "schedule" };
  if (t === "manual") return { className: "bg-muted text-foreground/70", text: "manual" };
  return { className: "bg-muted text-foreground/70", text: t || "—" };
};