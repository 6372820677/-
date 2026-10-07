import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";

const user = userEvent.setup();

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("T2 URL 状态同步", () => {
  it("首次进入从 URL 恢复筛选与页码并同步输入框", async () => {
    window.history.replaceState(null, "", "/?status=DOING&page=2");
    render(<App />);
    expect(screen.getByPlaceholderText("搜索任务标题")).toHaveValue("");
    expect(screen.getByRole("combobox")).toHaveValue("DOING");
    // DOING 共 8 项、2 页；第 2 页为 ID 20/23
    expect(await screen.findByText("接口权限回归")).toBeInTheDocument();
    expect(screen.getByText("第2页 共2页")).toBeInTheDocument();
  });

  it("刷新后已提交搜索词恢复到输入框并发起查询", async () => {
    window.history.replaceState(null, "", "/?q=" + encodeURIComponent("接口"));
    render(<App />);
    expect(screen.getByPlaceholderText("搜索任务标题")).toHaveValue("接口");
    expect(await screen.findByText("任务列表接口对接")).toBeInTheDocument();
  });

  it("非法 status 与 page 参数回退默认值", async () => {
    window.history.replaceState(null, "", "/?status=BOGUS&page=abc");
    render(<App />);
    expect(screen.getByRole("combobox")).toHaveValue("ALL");
    expect(await screen.findByText("登录功能开发")).toBeInTheDocument();
    expect(screen.getByText("第1页 共4页")).toBeInTheDocument();
  });

  it("未提交的输入不写入 URL", async () => {
    render(<App />);
    await screen.findByText("登录功能开发");
    await user.type(screen.getByPlaceholderText("搜索任务标题"), "接口");
    expect(window.location.search).toBe("");
    expect(screen.getByPlaceholderText("搜索任务标题")).toHaveValue("接口");
  });

  it("提交查询 trim 搜索词、页码回 1 并以 replace 写入 URL", async () => {
    window.history.replaceState(null, "", "/?status=DOING&page=2");
    render(<App />);
    await screen.findByText("接口权限回归");
    const before = window.history.length;
    await user.type(screen.getByPlaceholderText("搜索任务标题"), "  登录  ");
    await user.click(screen.getByRole("button", { name: "查询" }));
    expect(screen.getByPlaceholderText("搜索任务标题")).toHaveValue("登录");
    expect(window.history.length).toBe(before); // replace 不新增历史项
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("登录");
    expect(params.get("status")).toBe("DOING");
    expect(params.get("page")).toBeNull(); // 页码回 1，默认参数省略
    expect(await screen.findByText("没有匹配的任务")).toBeInTheDocument();
    expect(screen.getByText("第1页 共1页")).toBeInTheDocument();
  });

  it("筛选变化页码回 1 并以 push 写入 URL", async () => {
    render(<App />);
    await screen.findByText("登录功能开发");
    const before = window.history.length;
    await user.selectOptions(screen.getByRole("combobox"), "DOING");
    expect(window.history.length).toBe(before + 1); // push 新增历史项
    expect(new URLSearchParams(window.location.search).get("status")).toBe(
      "DOING",
    );
    expect(await screen.findByText("第1页 共2页")).toBeInTheDocument();
  });

  it("翻页以 push 写入 URL", async () => {
    window.history.replaceState(null, "", "/?status=DOING");
    render(<App />);
    await screen.findByText("任务列表接口对接");
    const before = window.history.length;
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(window.history.length).toBe(before + 1);
    expect(new URLSearchParams(window.location.search).get("page")).toBe("2");
    // DOING 第 2 页：ID 20/23
    expect(await screen.findByText("接口权限回归")).toBeInTheDocument();
    expect(screen.getByText("第2页 共2页")).toBeInTheDocument();
  });

  it("popstate 恢复筛选与页码并重新查询", async () => {
    window.history.replaceState(null, "", "/?status=DOING");
    render(<App />);
    await screen.findByText("任务列表接口对接"); // 第 1 页：ID 2,5,8,11,14,17
    // 翻页到第 2 页（push），再改筛选为 DONE（页码回 1 并 push）
    await user.click(screen.getByRole("button", { name: "下一页" }));
    await screen.findByText("接口权限回归"); // 第 2 页：ID 20,23
    await user.selectOptions(screen.getByRole("combobox"), "DONE");
    await screen.findByText("任务详情页面优化"); // DONE 第 1 页：ID 3
    // 后退：回到 DOING 第 2 页
    window.history.back();
    expect(await screen.findByText("接口权限回归")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("DOING");
    expect(screen.getByText("第2页 共2页")).toBeInTheDocument();
    // 再后退：回到 DOING 第 1 页
    window.history.back();
    expect(await screen.findByText("任务列表接口对接")).toBeInTheDocument();
    expect(screen.getByText("第1页 共2页")).toBeInTheDocument();
    // 前进：回到 DOING 第 2 页
    window.history.forward();
    expect(await screen.findByText("接口权限回归")).toBeInTheDocument();
    expect(screen.getByText("第2页 共2页")).toBeInTheDocument();
  });

  it("popstate 恢复越界页码时按本次查询结果钳制而非旧结果", async () => {
    window.history.replaceState(null, "", "/?page=4");
    render(<App />);
    await screen.findByText("第4页 共4页"); // ALL 24 项、4 页
    await user.selectOptions(screen.getByRole("combobox"), "DONE");
    await screen.findByText("第1页 共2页"); // DONE 8 项、2 页
    // 前进/后退到 ALL 且页码越界：查询成功后才按 ALL 的结果钳制到第 4 页，
    // 而不是用上一次（DONE，仅 2 页）的结果提前把页码改掉。
    window.history.pushState(null, "", "/?status=ALL&page=9");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByText("第4页 共4页")).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get("page")).toBe("4");
    expect(screen.getByText("交付文档整理")).toBeInTheDocument(); // 第 4 页 ID 24
  });

  it("越界页码在查询成功后以 replace 钳制到最后有效页", async () => {
    window.history.replaceState(null, "", "/?page=9");
    render(<App />);
    const before = window.history.length;
    expect(await screen.findByText("第4页 共4页")).toBeInTheDocument();
    expect(screen.getByText("分页边界测试")).toBeInTheDocument(); // ID 23
    expect(window.history.length).toBe(before); // 钳制用 replace
    expect(new URLSearchParams(window.location.search).get("page")).toBe("4");
  });

  it("空结果保持第 1 页共 1 页，越界页码以 replace 钳制到 1", async () => {
    window.history.replaceState(
      null,
      "",
      "/?q=" + encodeURIComponent("不存在") + "&page=5",
    );
    render(<App />);
    const before = window.history.length;
    expect(await screen.findByText("没有匹配的任务")).toBeInTheDocument();
    expect(screen.getByText("第1页 共1页")).toBeInTheDocument();
    expect(window.history.length).toBe(before);
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("不存在");
    expect(params.get("page")).toBeNull(); // 第 1 页为默认值，省略
  });

  it("中文、空格与 & 经 URL 编码往返不丢失", async () => {
    window.history.replaceState(
      null,
      "",
      "/?q=" + encodeURIComponent("接口 & 登录"),
    );
    render(<App />);
    expect(screen.getByPlaceholderText("搜索任务标题")).toHaveValue("接口 & 登录");
    expect(await screen.findByText("没有匹配的任务")).toBeInTheDocument();
  });

  it("写入 URL 时保留无关参数与 hash", async () => {
    window.history.replaceState(null, "", "/?theme=dark&status=DOING#section");
    render(<App />);
    await screen.findByText("任务列表接口对接");
    await user.click(screen.getByRole("button", { name: "下一页" }));
    const url = new URL(window.location.href);
    expect(url.searchParams.get("theme")).toBe("dark");
    expect(url.searchParams.get("status")).toBe("DOING");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.hash).toBe("#section");
  });
});
