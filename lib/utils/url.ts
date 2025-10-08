// utils/url.ts
export function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return b ? `${b}/${p}` : `/${p}`;
}