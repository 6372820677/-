import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useTaskSearch } from "../src/useTaskSearch";
import type { StatusFilter } from "../src/types";

/** 测试探针：把 Hook 状态渲染为可断言的文本。 */
function Probe({ q, status }: { q: string; status: StatusFilter }) {
  const { tasks, loading, error } = useTaskSearch(q, status);
  return (
    <div>
      <span data-testid="ids">{tasks.map((t) => t.id).join(",")}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error}</span>
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("T1 异步竞态修复", () => {
  it("较早请求成功不得覆盖较新查询的结果", async () => {
    // 登录 450ms；随后改查 接口 200ms。接口先返回，登录较晚返回必须被忽略。
    const { rerender } = render(<Probe q="登录" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(200));
    rerender(<Probe q="接口" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(200)); // 接口返回（ID 2,8,14,20）
    expect(screen.getByTestId("ids").textContent).toBe("2,8,14,20");
    await act(async () => vi.advanceTimersByTime(250)); // 若旧请求仍生效，此刻会覆盖为新旧结果
    expect(screen.getByTestId("ids").textContent).toBe("2,8,14,20");
    expect(screen.getByTestId("error").textContent).toBe("");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("较早请求失败不得污染较新查询的错误状态", async () => {
    // 失败 200ms；随后改查 登录 450ms。旧失败若生效会在新查询成功后残留错误。
    const { rerender } = render(<Probe q="失败" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(100));
    rerender(<Probe q="登录" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(100)); // 旧失败本应在此刻落定
    expect(screen.getByTestId("error").textContent).toBe("");
    await act(async () => vi.advanceTimersByTime(350)); // 新查询成功（ID 1,7,13,19）
    expect(screen.getByTestId("ids").textContent).toBe("1,7,13,19");
    expect(screen.getByTestId("error").textContent).toBe("");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("较早请求结束时较新查询仍保持加载", async () => {
    // 接口 200ms；随后改查 登录 450ms。旧请求结束不得提前关闭新查询的 loading。
    const { rerender } = render(<Probe q="接口" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(100));
    rerender(<Probe q="登录" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(100)); // 旧请求此刻结束
    expect(screen.getByTestId("loading").textContent).toBe("true");
    await act(async () => vi.advanceTimersByTime(350)); // 新查询完成
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("ids").textContent).toBe("1,7,13,19");
  });

  it("最新查询失败展示错误，失败后重试可恢复正常", async () => {
    const { rerender } = render(<Probe q="失败" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(200));
    expect(screen.getByTestId("error").textContent).toBe("模拟查询失败");
    expect(screen.getByTestId("loading").textContent).toBe("false");
    rerender(<Probe q="登录" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(450));
    expect(screen.getByTestId("ids").textContent).toBe("1,7,13,19");
    expect(screen.getByTestId("error").textContent).toBe("");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("最新查询空结果展示空列表", async () => {
    render(<Probe q="不存在" status="ALL" />);
    await act(async () => vi.advanceTimersByTime(200));
    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(screen.getByTestId("error").textContent).toBe("");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("组件卸载后清理请求生命周期，不再产生状态更新", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<Probe q="登录" status="ALL" />);
    unmount();
    await act(async () => vi.advanceTimersByTime(500));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
