import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { selectTasks, searchTasks } from "../src/api";
import { pageOf } from "../src/query";
import App from "../src/App";
describe("已提供的基础行为", () => {
  it("固定种子24项且ID不重复", () => {
    const t = selectTasks("", "ALL");
    expect(t).toHaveLength(24);
    expect(new Set(t.map((x) => x.id)).size).toBe(24);
  });
  it("仅匹配标题，trim且不区分大小写", () => {
    expect(selectTasks(" 登录 ", "ALL")).toHaveLength(4);
    expect(selectTasks("不存在", "ALL")).toHaveLength(0);
    expect(selectTasks("张三", "ALL")).toHaveLength(0);
  });
  it("状态筛选保留原顺序", () => {
    expect(selectTasks("", "DOING").map((x) => x.id)).toEqual([
      2, 5, 8, 11, 14, 17, 20, 23,
    ]);
  });
  it("返回副本不污染种子", () => {
    const t = selectTasks("", "ALL");
    t[0].title = "修改";
    expect(selectTasks("", "ALL")[0].title).toBe("登录功能开发");
  });
  it("分页范围及空结果", () => {
    expect(pageOf([1, 2, 3], 99, 2)).toEqual({
      items: [3],
      current: 2,
      pages: 2,
    });
    expect(pageOf([], 1).pages).toBe(1);
  });
  it("模拟查询支持取消", async () => {
    const c = new AbortController();
    const p = searchTasks("登录", "ALL", c.signal);
    c.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });
  it("页面加载并显示第一页", async () => {
    render(<App />);
    expect(await screen.findByText("登录功能开发")).toBeInTheDocument();
    expect(screen.getByText("第1页 共4页")).toBeInTheDocument();
  });
});
