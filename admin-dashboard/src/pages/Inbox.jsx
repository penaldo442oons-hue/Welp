import { useEffect, useState } from "react";
import StatsCard from "../components/StatsCard";
import { API_BASE } from "../config/api.js";
import { handleAdminAuthFailure } from "../lib/adminSession.js";

const tokenHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function formatDate(value) {
  if (!value) return "No activity yet";
  return new Date(value).toLocaleString();
}

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchConversations = async () => {
    try {
      setError("");
      const res = await fetch(`${API_BASE}/admin/chat/conversations`, {
        headers: tokenHeaders(),
      });
      const data = await res.json().catch(() => ([]));

      if (handleAdminAuthFailure(res)) {
        return;
      }

      if (!res.ok) {
        setError(data.error || "Could not load inbox");
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setConversations(list);
      setSelectedConversationId((current) => current || list[0]?.id || "");
    } catch {
      setError("Could not connect to the API server");
    }
  };

  useEffect(() => {
    void fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredConversations = conversations.filter((conversation) => {
    const needle = search.toLowerCase();
    return (
      conversation.userName.toLowerCase().includes(needle) ||
      conversation.userEmail.toLowerCase().includes(needle) ||
      String(conversation.subject || "").toLowerCase().includes(needle)
    );
  });

  const selectedConversation =
    filteredConversations.find((conversation) => conversation.id === selectedConversationId) ||
    conversations.find((conversation) => conversation.id === selectedConversationId) ||
    null;

  const inboxStats = {
    total: conversations.length,
    unread: conversations.filter((conversation) => Number(conversation.adminUnreadCount || 0) > 0).length,
    waitingForAdmin: conversations.filter((conversation) => conversation.status === "waiting-for-admin").length,
  };

  useEffect(() => {
    const markAsRead = async () => {
      if (!selectedConversation || !selectedConversation.adminUnreadCount) {
        return;
      }

      const res = await fetch(`${API_BASE}/admin/chat/conversations/${selectedConversation.id}/read`, {
        method: "POST",
        headers: tokenHeaders(),
      });

      if (handleAdminAuthFailure(res)) {
        return;
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                adminUnreadCount: 0,
              }
            : conversation
        )
      );
    };

    void markAsRead();
  }, [selectedConversation?.adminUnreadCount, selectedConversation?.id]);

  const sendReply = async (event) => {
    event.preventDefault();
    const content = reply.trim();
    if (!selectedConversation || !content) return;

    try {
      const res = await fetch(`${API_BASE}/admin/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...tokenHeaders(),
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json().catch(() => ({}));

      if (handleAdminAuthFailure(res)) {
        return;
      }

      if (!res.ok) {
        setError(data.error || "Could not send reply");
        return;
      }

      setReply("");
      setConversations((current) =>
        current.map((conversation) => (conversation.id === data.id ? data : conversation))
      );
      await fetchConversations();
    } catch {
      setError("Could not send reply");
    }
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Inbox</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Contact admin inbox</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          This is now a dedicated category for direct user-admin conversations. Select a user on the left and reply from the focused conversation view.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Threads" value={inboxStats.total} color="blue" />
        <StatsCard title="Unread" value={inboxStats.unread} color="orange" />
        <StatsCard title="Waiting for admin" value={inboxStats.waitingForAdmin} color="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-welp ring-1 ring-white/[0.04]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user, email, or subject..."
            className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-welp-accent/50"
          />

          <div className="mt-4 space-y-3">
            {filteredConversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-zinc-500">
                No conversations match your search.
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={[
                    "w-full rounded-2xl border px-4 py-4 text-left transition",
                    selectedConversationId === conversation.id
                      ? "border-welp-accent/35 bg-white/[0.08] text-white"
                      : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{conversation.subject || "Contact admin"}</div>
                      <div className="mt-1 text-sm text-zinc-500">{conversation.userName}</div>
                    </div>
                    {conversation.adminUnreadCount ? (
                      <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/25">
                        {conversation.adminUnreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">{conversation.userEmail}</div>
                  <div className="mt-2 text-xs text-zinc-400">{formatDate(conversation.lastMessageAt)}</div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="flex min-h-[620px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] shadow-welp ring-1 ring-white/[0.04]">
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-zinc-500">
              Select a conversation to reply to a user.
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Selected thread</p>
                    <h2 className="mt-1 text-xl font-semibold text-white">{selectedConversation.subject || "Contact admin"}</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      {selectedConversation.userName} - {selectedConversation.userEmail}
                    </p>
                  </div>
                  <div className="text-right text-sm text-zinc-500">
                    <div>{selectedConversation.status}</div>
                    <div>{formatDate(selectedConversation.lastMessageAt)}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {(selectedConversation.messages || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center text-sm text-zinc-500">
                    This user has not sent a message yet.
                  </div>
                ) : (
                  (selectedConversation.messages || []).map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={[
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                          message.senderType === "admin"
                            ? "bg-gradient-to-br from-welp-accent to-sky-300 text-welp-void"
                            : "border border-white/10 bg-black/20 text-zinc-100",
                        ].join(" ")}
                      >
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                          {message.senderLabel}
                        </div>
                        <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendReply} className="border-t border-white/10 px-6 py-5">
                <div className="flex gap-3">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={3}
                    placeholder="Respond to this user..."
                    className="min-h-[72px] flex-1 resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-welp-accent/50"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#8ec5ff] px-5 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-white"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
