import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../config/api.js";
import { getUserToken, setUserToken } from "../components/ProtectedRoute.jsx";

const supportTopics = [
  "Build help",
  "Custom feature",
  "Bug or issue",
  "Billing question",
];

export default function Contact() {
  const [availability, setAvailability] = useState({
    availableDevelopers: 0,
    availableUntil: null,
    isAvailable: false,
  });
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("Need help with my build");
  const [topic, setTopic] = useState("Build help");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const endRef = useRef(null);

  const token = getUserToken();

  const loadData = async () => {
    try {
      const [availabilityRes, chatRes] = await Promise.all([
        fetch(`${API_BASE}/availability`),
        fetch(`${API_BASE}/chat/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const availabilityData = await availabilityRes.json().catch(() => ({}));
      const chatData = await chatRes.json().catch(() => ({}));

      if (availabilityRes.ok) {
        setAvailability({
          availableDevelopers: Number(availabilityData.availableDevelopers || 0),
          availableUntil: availabilityData.availableUntil || null,
          isAvailable: Boolean(availabilityData.isAvailable),
        });
      }

      if (chatRes.status === 401 || chatRes.status === 403) {
        setUserToken(null);
        window.location.replace("/login");
        return;
      }

      if (!chatRes.ok) {
        setError(chatData.error || "Could not load admin chat.");
        return;
      }

      setConversation(chatData);
      if (chatData.subject) {
        setSubject(chatData.subject);
      }
      setError("");
    } catch {
      setError("Could not connect to the server.");
    }
  };

  useEffect(() => {
    void loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = message.trim();
    if (!content || status === "sending") return;

    try {
      setStatus("sending");
      const res = await fetch(`${API_BASE}/chat/me/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          subject: conversation?.subject || subject,
          topic,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setUserToken(null);
        window.location.replace("/login");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Could not send your message.");
        setStatus("idle");
        return;
      }

      setConversation(data);
      if (data.subject) {
        setSubject(data.subject);
      }
      setMessage("");
      setStatus("idle");
      setError("");
    } catch {
      setError("Could not send your message.");
      setStatus("idle");
    }
  };

  const availableUntilLabel = useMemo(() => {
    if (!availability.availableUntil) return null;
    return new Date(availability.availableUntil).toLocaleString();
  }, [availability.availableUntil]);

  const activeSubject = conversation?.subject || subject;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-welp ring-1 ring-white/[0.04] backdrop-blur-xl">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 shadow-welp-inset">
              Contact Admin
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">The admin support section is back.</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Use this space for build help, feature requests, bugs, or anything that needs a real human decision. The admin dashboard now receives these in a dedicated inbox category.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-welp ring-1 ring-white/[0.04] backdrop-blur-xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Support lanes</div>
            <div className="mt-4 grid gap-3">
              {supportTopics.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTopic(item)}
                  className={[
                    "rounded-xl border px-4 py-3 text-left text-sm transition",
                    topic === item
                      ? "border-welp-accent/35 bg-white/[0.08] text-white"
                      : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#8ec5ff]/15 bg-[#06111f] p-6 shadow-welp ring-1 ring-white/[0.04]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Developer availability</div>
            <div className="mt-3 text-5xl font-semibold text-[#8ec5ff]">{availability.availableDevelopers}</div>
            <p className="mt-3 text-sm text-white/75">
              {availability.isAvailable
                ? `${availability.availableDevelopers} developer${availability.availableDevelopers === 1 ? "" : "s"} available now`
                : "No developers are marked available right now"}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {availableUntilLabel ? `Available until ${availableUntilLabel}` : "Availability updates from the admin dashboard."}
            </p>
          </div>
        </aside>

        <section className="flex min-h-[75vh] flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-welp ring-1 ring-white/[0.04] backdrop-blur-xl">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Thread</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{activeSubject}</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300">
                {topic}
              </div>
            </div>
          </div>

          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <label className="grid gap-2 text-sm text-zinc-300">
                Subject
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-welp-accent/50"
                  placeholder="Short summary of what you need"
                />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                Topic
                <select
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-welp-accent/50"
                >
                  {supportTopics.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {!conversation ? (
              <p className="text-sm text-zinc-500">Loading conversation...</p>
            ) : conversation.messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center text-sm text-zinc-500">
                Start the thread with what you need, the build context, and what kind of help you want from the admin.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {conversation.messages.map((entry) => {
                  const isUser = entry.senderType === "user";
                  return (
                    <div key={entry.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[min(100%,760px)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          isUser
                            ? "bg-gradient-to-br from-welp-accent to-sky-300 text-welp-void"
                            : "border border-white/[0.08] bg-black/20 text-zinc-100",
                        ].join(" ")}
                      >
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                          {entry.senderLabel}
                        </div>
                        <pre className="whitespace-pre-wrap font-sans">{entry.content}</pre>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-white/[0.06] px-4 py-4 md:px-6">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.1] bg-black/25 p-1">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  placeholder="Write to the admin..."
                  className="max-h-48 min-h-[72px] w-full resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
              </div>
              <button
                type="submit"
                disabled={!message.trim() || status === "sending"}
                className="rounded-xl bg-[#8ec5ff] px-5 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-white disabled:opacity-50"
              >
                {status === "sending" ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
