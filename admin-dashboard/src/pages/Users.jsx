import { useEffect, useState } from "react";
import StatsCard from "../components/StatsCard";
import { API_BASE } from "../config/api.js";
import { handleAdminAuthFailure } from "../lib/adminSession.js";

const tokenHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function formatDate(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setError("");
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: tokenHeaders(),
      });
      const data = await res.json().catch(() => ([]));

      if (handleAdminAuthFailure(res)) {
        return;
      }

      if (!res.ok) {
        setError(data.error || "Could not load users");
        return;
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not connect to the API server");
    }
  };

  useEffect(() => {
    void loadUsers();
    const interval = setInterval(loadUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users.filter((user) => {
    const needle = search.toLowerCase();
    return user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
  });

  const active24h = users.filter((user) => Number(user.lastLoginAt || 0) > Date.now() - 24 * 60 * 60 * 1000).length;
  const builderUsers = users.filter((user) => user.subscriptionPlan !== "trial").length;
  const averageLogins = users.length
    ? (users.reduce((sum, user) => sum + Number(user.loginCount || 0), 0) / users.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-8">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Users</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">User analytics and logins</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          This screen tracks registered users, how often they sign in, and which users currently have builder access.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total users" value={users.length} color="blue" />
        <StatsCard title="Active in 24h" value={active24h} color="green" />
        <StatsCard title="Builder access" value={builderUsers} color="orange" />
        <StatsCard title="Avg logins" value={averageLogins} color="blue" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search user name or email..."
          className="w-full max-w-md rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-welp-accent/50"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] shadow-welp ring-1 ring-white/[0.04]">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/35 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Logins</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-zinc-500">
                  No users match your search.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.06] transition hover:bg-white/[0.03]">
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">{user.name}</div>
                    <div className="text-sm text-zinc-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        user.subscriptionPlan === "trial"
                          ? "bg-zinc-800 text-zinc-300"
                          : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25",
                      ].join(" ")}
                    >
                      {user.subscriptionPlan}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-zinc-300">{user.loginCount}</td>
                  <td className="px-4 py-4 text-zinc-400">{formatDate(user.lastLoginAt)}</td>
                  <td className="px-4 py-4 text-zinc-400">{formatDate(user.lastSeenAt)}</td>
                  <td className="px-4 py-4 text-zinc-400">{formatDate(user.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
