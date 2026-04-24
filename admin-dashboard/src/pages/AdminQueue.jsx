import { useEffect, useState } from "react";
import StatsCard from "../components/StatsCard";
import { API_BASE } from "../config/api.js";

const requestsUrl = `${API_BASE}/requests?limit=2000&page=1`;

const btn =
  "inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-welp-inset transition hover:border-white/20 hover:bg-white/10";
const btnDanger =
  "inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20";

export default function AdminQueue() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("needs-review");

  const fetchTasks = async () => {
    try {
      const res = await fetch(requestsUrl);
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.data) ? data.data : [];
      const aiTasks = list.filter((request) => request.type === "ai");
      setTasks(aiTasks);
    } catch (error) {
      console.error(error);
      setTasks([]);
    }
  };

  const resolveTask = async (id) => {
    await fetch(`${API_BASE}/requests/${id}/resolve`, { method: "PUT" });
    await fetchTasks();
  };

  const deleteTask = async (id) => {
    await fetch(`${API_BASE}/requests/${id}`, { method: "DELETE" });
    await fetchTasks();
  };

  useEffect(() => {
    void fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "all") return true;
      if (filter === "needs-review") {
        return task.status === "needs-admin" || task.status === "admin-review";
      }
      return task.status === filter;
    })
    .filter((task) => {
      const needle = search.toLowerCase();
      return (
        String(task.user || "").toLowerCase().includes(needle) ||
        String(task.prompt || "").toLowerCase().includes(needle) ||
        String(task.projectName || "").toLowerCase().includes(needle)
      );
    });

  return (
    <div className="space-y-8">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">AI queue</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Builder task review</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          AI build requests live here instead of being mixed into the main dashboard. Review flagged tasks, inspect prompts, and close what needs human attention.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="All AI tasks" value={tasks.length} color="blue" />
        <StatsCard
          title="Needs review"
          value={tasks.filter((task) => task.status === "needs-admin" || task.status === "admin-review").length}
          color="orange"
        />
        <StatsCard title="Completed" value={tasks.filter((task) => task.status === "completed").length} color="green" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search project, user, or prompt..."
          className="w-full max-w-md rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-welp-accent/50"
        />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-welp-accent/50"
        >
          <option value="needs-review">Needs review</option>
          <option value="all">All tasks</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
        </select>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center text-sm text-zinc-500">
          No AI tasks match the current filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] shadow-welp ring-1 ring-white/[0.04]">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Prompt</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Retries</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-white/[0.06] transition hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-400">{task.id}</td>
                  <td className="px-4 py-3 text-zinc-200">{task.user}</td>
                  <td className="px-4 py-3 text-zinc-300">{task.projectName || "Untitled build"}</td>
                  <td className="max-w-md truncate px-4 py-3 text-zinc-400" title={task.prompt}>
                    {task.prompt}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        task.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25"
                          : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25",
                      ].join(" ")}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{task.retries}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" className={btn} onClick={() => resolveTask(task.id)}>
                        Mark resolved
                      </button>
                      <button type="button" className={btnDanger} onClick={() => deleteTask(task.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
