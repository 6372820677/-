import { tasks } from "./seed";
import type { Task, StatusFilter } from "./types";
export function selectTasks(q: string, status: StatusFilter): Task[] {
  const keyword = q.trim().toLowerCase();
  return tasks
    .filter(
      (t) =>
        t.title.toLowerCase().includes(keyword) &&
        (status === "ALL" || t.status === status),
    )
    .map((t) => ({ ...t }));
}
/** 本地模拟查询：登录较慢，失败用于演示错误状态。无需网络。 */
export function searchTasks(
  q: string,
  status: StatusFilter,
  signal?: AbortSignal,
): Promise<Task[]> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("已取消", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("已取消", "AbortError"));
    };
    const timer = setTimeout(
      () => {
        signal?.removeEventListener("abort", abort);
        if (q.trim() === "失败") reject(new Error("模拟查询失败"));
        else resolve(selectTasks(q, status));
      },
      q.includes("登录") ? 450 : 200,
    );
    signal?.addEventListener("abort", abort, { once: true });
  });
}
