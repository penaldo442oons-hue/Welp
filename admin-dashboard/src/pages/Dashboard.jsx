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

function normalizeStatsResponse(data) {
  if (data?.users && data?.contacts && data?.ai) {
    return data;
  }

  return {
    users: {
      total: Number(data?.totalUsers ?? data?.users ?? data?.total ?? 0),
      totalLogins: Number(data?.totalLogins ?? 0),
      active24h: Number(data?.active24h ?? 0),
      new7d: Number(data?.new7d ?? 0),
      paid: Number(data?.paidUsers ?? 0),
    },
    requests: {
      total: Number(data?.requests?.total ?? data?.totalRequests ?? data?.total ?? 0),
      pending: Number(data?.requests?.pending ?? data?.pending ?? 0),
      resolved: Number(data?.requests?.resolved ?? data?.resolved ?? 0),
    },
    ai: {
      total: Number(data?.ai?.total ?? data?.totalAi ?? 0),
      completed: Number(data?.ai?.completed ?? data?.completedAi ?? 0),
      needsReview: Number(data?.ai?.needsReview ?? data?.needsReview ?? 0),
    },
    contacts: {
      total: Number(data?.contacts?.total ?? data?.contactThreads ?? 0),
      waitingForAdmin: Number(data?.contacts?.waitingForAdmin ?? 0),
      waitingForUser: Number(data?.contacts?.waitingForUser ?? 0),
      unreadForAdmin: Number(data?.contacts?.unreadForAdmin ?? data?.unreadInbox ?? 0),
    },
    availability: {
      availableDevelopers: Number(data?.availability?.availableDevelopers ?? data?.availableDevelopers ?? 0),
      availableUntil: data?.availability?.availableUntil ?? data?.availableUntil ?? null,
    },
    recentLogins: Array.isArray(data?.recentLogins) ? data.recentLogins : [],
    recentRequests: Array.isArray(data?.recentRequests) ? data.recentRequests : [],
    recentContacts: Array.isArray(data?.recentContacts) ? data.recentContacts : [],
  };
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-welp ring-1 ring-white/[0.04]">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</p>
        {subtitle ? <p className="mt-2 text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [availabilityForm, setAvailabilityForm] = useState({
    availableDevelopers: 1,
    durationHours: 1,
  });
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadStats = async () => {
    try {
      setError("");
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: tokenHeaders(),
      });
      const data = await res.json().catch(() => ({}));

      if (handleAdminAuthFailure(res)) {
        return;
      }

      if (!res.ok) {
        setError(data.error || "Could not load dashboard");
        return;
      }

      const normalized = normalizeStatsResponse(data);
      setStats(normalized);
      setAvailabilityForm((prev) => ({
        availableDevelopers: normalized.availability?.availableDevelopers || prev.availableDevelopers,
        durationHours: prev.durationHours,
      }));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError("Unable to connect to the API server");
    }
  };

  useEffect(() => {
    void loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const saveAvailability = async (event) => {
    event.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...tokenHeaders(),
        },
        body: JSON.stringify({
          availableDevelopers: Number(availabilityForm.availableDevelopers),
          durationHours: Number(availabilityForm.durationHours),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (handleAdminAuthFailure(res)) {
        return;
      }

      if (!res.ok) {
        setError(data.error || "Could not save availability");
        return;
      }

      setStats((current) =>
        current
          ? {
              ...current,
              availability: data,
            }
          : current
      );
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError("Could not save availability");
    }
  };

  const availability = stats?.availability || {
    availableDevelopers: 0,
    availableUntil: null,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Overview</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Admin overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            This page is now focused on platform health only. Users, contact-admin threads, and AI reviews each have their own screens.
          </p>
        </div>
        {lastUpdated ? <p className="text-xs text-zinc-500">Updated {lastUpdated}</p> : null}
      </header>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total users" value={stats?.users?.total ?? 0} color="blue" />
        <StatsCard title="Total logins" value={stats?.users?.totalLogins ?? 0} color="orange" />
        <StatsCard title="Unread inbox" value={stats?.contacts?.unreadForAdmin ?? 0} color="green" />
        <StatsCard title="AI review queue" value={stats?.ai?.needsReview ?? 0} color="orange" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <SectionCard
          title="Availability"
          subtitle="Set how many developers are available and how long that window should remain visible on the frontend."
        >
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="rounded-2xl border border-[#8ec5ff]/15 bg-[#06111f] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Live now</div>
              <div className="mt-4 text-5xl font-semibold text-[#8ec5ff]">{availability.availableDevelopers || 0}</div>
              <p className="mt-3 text-sm text-white/75">
                {availability.availableUntil
                  ? `Visible until ${formatDate(availability.availableUntil)}`
                  : "No active availability window"}
              </p>
            </div>

            <form onSubmit={saveAvailability} className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-zinc-300">
                Available developers
                <input
                  type="number"
                  min="0"
                  value={availabilityForm.availableDevelopers}
                  onChange={(event) =>
                    setAvailabilityForm((prev) => ({ ...prev, availableDevelopers: event.target.value }))
                  }
                  className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-welp-accent/50"
                />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                Duration in hours
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={availabilityForm.durationHours}
                  onChange={(event) =>
                    setAvailabilityForm((prev) => ({ ...prev, durationHours: event.target.value }))
                  }
                  className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-welp-accent/50"
                />
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#8ec5ff] px-5 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-white"
                >
                  Publish availability
                </button>
              </div>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          title="User activity"
          subtitle="Recent login activity pulled from real user sign-ins."
        >
          <div className="space-y-3">
            {(stats?.recentLogins || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-zinc-500">
                No user login activity yet.
              </div>
            ) : (
              stats.recentLogins.map((user) => (
                <div key={user.email} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <div>
                    <div className="font-medium text-white">{user.name}</div>
                    <div className="text-sm text-zinc-500">{user.email}</div>
                  </div>
                  <div className="text-right text-sm text-zinc-400">
                    <div>{user.loginCount} login(s)</div>
                    <div>{formatDate(user.lastLoginAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Recent contact-admin threads"
          subtitle="Direct support requests now live in their own inbox workflow."
        >
          <div className="space-y-3">
            {(stats?.recentContacts || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-zinc-500">
                No contact-admin threads yet.
              </div>
            ) : (
              stats.recentContacts.map((conversation) => (
                <div key={conversation.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <div>
                    <div className="font-medium text-white">{conversation.subject || "Contact admin"}</div>
                    <div className="text-sm text-zinc-500">{conversation.userName} - {conversation.userEmail}</div>
                  </div>
                  <div className="text-right text-sm text-zinc-400">
                    <div>{conversation.status}</div>
                    <div>{conversation.adminUnreadCount} unread</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent requests"
          subtitle="A quick look at standard non-AI requests coming through the platform."
        >
          <div className="space-y-3">
            {(stats?.recentRequests || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-zinc-500">
                No requests yet.
              </div>
            ) : (
              stats.recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <div>
                    <div className="font-medium text-white">{request.name}</div>
                    <div className="text-sm text-zinc-500">{request.email}</div>
                  </div>
                  <div className="text-right text-sm text-zinc-400">
                    <div>{request.status}</div>
                    <div>{formatDate(request.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
