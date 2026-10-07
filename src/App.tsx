import { useEffect, useMemo, useState } from "react";
import type { StatusFilter } from "./types";
import { useTaskSearch } from "./useTaskSearch";
import { pageOf, readQuery, writeQuery } from "./query";
export default function App() {
  const initial = useMemo(() => readQuery(window.location.search), []);
  const [draft, setDraft] = useState(initial.q);
  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState<StatusFilter>(initial.status);
  const [page, setPage] = useState(initial.page);
  const { tasks, loading, error, ready } = useTaskSearch(q, status);
  const view = pageOf(tasks, page);

  // 前进/后退：从 URL 恢复输入框、已提交搜索词、筛选与页码，并触发对应查询。
  useEffect(() => {
    const onPop = () => {
      const f = readQuery(window.location.search);
      setDraft(f.q);
      setQ(f.q);
      setStatus(f.status);
      setPage(f.page);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 仅在当前查询成功提交结果后，才按结果页数钳制越界页码（replace，不增加历史项）。
  useEffect(() => {
    if (!ready) return;
    if (view.current !== page) {
      setPage(view.current);
      writeQuery({ q, status, page: view.current }, "replace");
    }
  }, [ready, view.current, page, q, status]);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const next = draft.trim();
    setDraft(next);
    setQ(next);
    setPage(1);
    writeQuery({ q: next, status, page: 1 }, "replace");
  }
  return (
    <>
      <header>
        <div className="brand">
          TaskBoard<span>任务看板</span>
        </div>
      </header>
      <main>
        <h1>项目任务</h1>
        <p className="subtitle">搜索、筛选和查看团队任务。</p>
        <form className="toolbar" onSubmit={search}>
          <label className="search">
            搜索任务
            <input
              placeholder="搜索任务标题"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <label>
            状态
            <select
              value={status}
              onChange={(e) => {
                const next = e.target.value as StatusFilter;
                setStatus(next);
                setPage(1);
                writeQuery({ q, status: next, page: 1 }, "push");
              }}
            >
              <option value="ALL">全部状态</option>
              <option value="TODO">待办</option>
              <option value="DOING">进行中</option>
              <option value="DONE">已完成</option>
            </select>
          </label>
          <button className="primary">查询</button>
        </form>
        <p className="count muted" aria-live="polite">
          {tasks.length}项任务
        </p>
        <section className="panel" aria-label="任务列表" aria-busy={loading}>
          <div className="table-row table-head">
            <span>任务</span>
            <span>状态</span>
            <span className="owner">负责人</span>
          </div>
          {error ? (
            <div role="alert" className="error">
              {error}
            </div>
          ) : loading ? (
            <div role="status" className="state">
              正在查询…
            </div>
          ) : tasks.length === 0 ? (
            <div className="state">没有匹配的任务</div>
          ) : (
            view.items.map((t) => (
              <div className="table-row" key={t.id}>
                <div>
                  <div className="task-title">{t.title}</div>
                  <div className="task-detail">{t.description}</div>
                </div>
                <div>
                  <span className={"tag " + t.status}>{t.status}</span>
                </div>
                <span className="owner">{t.owner}</span>
              </div>
            ))
          )}
        </section>
        <nav className="pager" aria-label="分页">
          <button
            disabled={loading || view.current === 1}
            onClick={() => {
              const next = view.current - 1;
              setPage(next);
              writeQuery({ q, status, page: next }, "push");
            }}
          >
            上一页
          </button>
          <span>
            第{view.current}页 共{view.pages}页
          </span>
          <button
            disabled={loading || view.current === view.pages}
            onClick={() => {
              const next = view.current + 1;
              setPage(next);
              writeQuery({ q, status, page: next }, "push");
            }}
          >
            下一页
          </button>
        </nav>
      </main>
    </>
  );
}
