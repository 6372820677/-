import type { Filters, StatusFilter } from "./types";

const VALID_STATUS: readonly StatusFilter[] = ["ALL", "TODO", "DOING", "DONE"];

function normalizeStatus(raw: string | null): StatusFilter {
  return (VALID_STATUS as readonly string[]).includes(raw ?? "")
    ? (raw as StatusFilter)
    : "ALL";
}

/** 缺省、非正安全整数、非整数或非数值页码一律视为 1。 */
function normalizePage(raw: string | null): number {
  if (raw === null) return 1;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) return 1;
  return n;
}

/** 从 location.search 读取并规范化 q / status / page。 */
export function readQuery(search: string): Filters {
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  return {
    q: params.get("q") ?? "",
    status: normalizeStatus(params.get("status")),
    page: normalizePage(params.get("page")),
  };
}

/**
 * 把当前过滤条件写入 URL（push 或 replace）。
 * 默认参数（空搜索、ALL 状态、第 1 页）可省略；无关参数与 hash 保留。
 */
export function writeQuery(
  filters: Filters,
  mode: "push" | "replace",
): void {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  if (filters.q) params.set("q", filters.q);
  else params.delete("q");
  if (filters.status !== "ALL") params.set("status", filters.status);
  else params.delete("status");
  if (filters.page > 1) params.set("page", String(filters.page));
  else params.delete("page");
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const next = `${url.pathname}${query}${url.hash}`;
  if (mode === "push") window.history.pushState(null, "", next);
  else window.history.replaceState(null, "", next);
}

export function pageOf<T>(items: T[], page: number, size = 6) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(pages, Math.max(1, page));
  return {
    items: items.slice((current - 1) * size, current * size),
    current,
    pages,
  };
}
