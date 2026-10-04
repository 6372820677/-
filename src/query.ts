import type { Filters } from "./types";
// T2：URL同步入口尚未实现。页面目前只使用本地React状态。
export function readQuery(_search: string): Filters {
  return { q: "", status: "ALL", page: 1 };
}
export function writeQuery(
  _filters: Filters,
  _mode: "push" | "replace",
): void {}
export function pageOf<T>(items: T[], page: number, size = 6) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(pages, Math.max(1, page));
  return {
    items: items.slice((current - 1) * size, current * size),
    current,
    pages,
  };
}
