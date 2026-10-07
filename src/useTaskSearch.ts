import { useEffect, useState } from "react";
import { searchTasks } from "./api";
import type { Task, StatusFilter } from "./types";

/** 标识一次查询所属的 (q, status) 组合。 */
function keyOf(q: string, status: StatusFilter): string {
  return `${q}\u0000${status}`;
}

/**
 * 执行任务搜索，并保证只有"当前有效查询"能提交结果、错误和结束状态：
 * - 较早请求（成功/失败/结束）一律被忽略，避免覆盖较新查询的结果或错误，
 *   或提前关闭较新查询的 loading；
 * - 组件卸载时取消请求并停止一切状态更新；
 * - ready 仅在当前查询成功提交结果后为 true（供 URL 越界页码在查询成功后才钳制）。
 */
export function useTaskSearch(q: string, status: StatusFilter) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settledKey, setSettledKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    searchTasks(q, status, controller.signal)
      .then((result) => {
        if (!active) return;
        setTasks(result);
        setSettledKey(keyOf(q, status));
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [q, status]);

  const ready = settledKey === keyOf(q, status);
  return { tasks, loading, error, ready };
}
