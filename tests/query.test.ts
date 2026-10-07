import { describe, it, expect, beforeEach } from "vitest";
import { readQuery, writeQuery } from "../src/query";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("readQuery 参数规范", () => {
  it("缺省与非法参数回退默认值", () => {
    expect(readQuery("")).toEqual({ q: "", status: "ALL", page: 1 });
    expect(readQuery("?q=&status=BOGUS&page=abc")).toEqual({
      q: "",
      status: "ALL",
      page: 1,
    });
    expect(readQuery("?page=0")).toEqual({ q: "", status: "ALL", page: 1 });
    expect(readQuery("?page=-3")).toEqual({ q: "", status: "ALL", page: 1 });
    expect(readQuery("?page=1.5")).toEqual({ q: "", status: "ALL", page: 1 });
    // 非安全整数（超出 2^53-1）视为非法
    expect(readQuery("?page=9007199254740992")).toEqual({
      q: "",
      status: "ALL",
      page: 1,
    });
  });

  it("解析合法参数（含编码后的中文）", () => {
    const search = `?theme=dark&q=${encodeURIComponent("接口")}&status=DOING&page=2`;
    expect(readQuery(search)).toEqual({
      q: "接口",
      status: "DOING",
      page: 2,
    });
    expect(readQuery(`?q=${encodeURIComponent("接口 & 登录")}`).q).toBe(
      "接口 & 登录",
    );
  });

  it("仅接受 ALL/TODO/DOING/DONE 状态", () => {
    expect(readQuery("?status=todo").status).toBe("ALL"); // 大小写敏感，非法
    expect(readQuery("?status=ALL").status).toBe("ALL");
    expect(readQuery("?status=DONE").status).toBe("DONE");
  });
});

describe("writeQuery 写入与历史", () => {
  it("默认参数省略，无关参数与 hash 保留", () => {
    window.history.replaceState(null, "", "/?theme=dark&q=x&status=DOING&page=3#top");
    writeQuery({ q: "", status: "ALL", page: 1 }, "replace");
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?theme=dark");
    expect(window.location.hash).toBe("#top");
  });

  it("push 与 replace 分别新增/不新增历史项", () => {
    const len = window.history.length;
    writeQuery({ q: "接口", status: "DOING", page: 2 }, "replace");
    expect(window.history.length).toBe(len);
    writeQuery({ q: "接口", status: "DOING", page: 2 }, "push");
    expect(window.history.length).toBe(len + 1);
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("接口");
    expect(params.get("status")).toBe("DOING");
    expect(params.get("page")).toBe("2");
  });
});
