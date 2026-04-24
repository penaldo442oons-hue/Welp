import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { getUserToken, setUserToken } from "../components/ProtectedRoute.jsx";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-welp-accent/80 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-welp-accent/80 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-welp-accent/80" />
    </span>
  );
}

function starterBuild() {
  return {
    projectName: "Builder Workspace",
    tagline: "Plan, files, commands, and admin support in one place",
    summary:
      "Ask for an app or feature and the builder will map the stack, starter files, execution steps, and implementation notes so you can move faster than a plain chat response.",
    stack: ["React", "Node.js", "Express", "SQLite", "Tailwind CSS"],
    features: [
      "Project brief and stack selection",
      "File explorer with starter code",
      "Build checklist and run commands",
      "Direct contact-admin lane from the workspace",
    ],
    steps: [
      { title: "Blueprint ready", description: "The workspace is ready to generate your next build.", status: "done" },
      { title: "Send a build prompt", description: "Describe the product, flow, or feature you want.", status: "doing" },
      { title: "Review generated files", description: "Inspect the suggested project structure and code.", status: "todo" },
      { title: "Ship the happy path", description: "Implement the first core user flow before polishing.", status: "todo" },
    ],
    commands: ["npm install", "npm run dev", "npm run build"],
    previewNotes: [
      "The center panel is your explorer and code view.",
      "The chat stays on the right so the build context remains visible.",
      "Use Contact Admin if you want a human to step into the build.",
    ],
    files: [
      {
        path: "src/App.jsx",
        language: "jsx",
        purpose: "Route shell",
        content: `import { BrowserRouter, Routes, Route } from "react-router-dom";\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <Routes>{/* Generated routes land here */}</Routes>\n    </BrowserRouter>\n  );\n}`,
      },
      {
        path: "src/pages/HomePage.jsx",
        language: "jsx",
        purpose: "Landing page starter",
        content: `export default function HomePage() {\n  return (\n    <main className="min-h-screen bg-slate-950 text-white">\n      <section className="mx-auto max-w-6xl px-6 py-24">\n        <h1 className="text-5xl font-semibold">Your next build starts here.</h1>\n      </section>\n    </main>\n  );\n}`,
      },
      {
        path: "server/routes/build.js",
        language: "js",
        purpose: "Backend route starter",
        content: `import express from "express";\n\nconst router = express.Router();\n\nrouter.get("/health", (req, res) => {\n  res.json({ ok: true });\n});\n\nexport default router;`,
      },
    ],
  };
}

const promptSuggestions = [
  "Build me a SaaS dashboard with auth and billing",
  "Create a marketplace admin panel with user analytics",
  "Generate a support platform with direct user-admin chat",
  "Map an e-commerce app with product pages and checkout",
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // noop
  }
}

export default function Workspace() {
  const [prompt, setPrompt] = useState("");
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  const [checkoutState, setCheckoutState] = useState("idle");
  const [build, setBuild] = useState(starterBuild());
  const [selectedFilePath, setSelectedFilePath] = useState("src/App.jsx");
  const [conversation, setConversation] = useState([
    {
      id: uid(),
      role: "assistant",
      content:
        "This workspace is now tuned like a builder cockpit. Ask for a product, page, backend flow, dashboard, or full app and I will generate the project brief, files, commands, and next steps.",
    },
  ]);
  const [isBusy, setIsBusy] = useState(false);
  const chatEndRef = useRef(null);

  const refreshMe = async () => {
    const token = getUserToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setUserToken(null);
        window.location.replace("/login");
        return;
      }
      if (!res.ok) {
        setMe(null);
        setMeError(data.error || "Could not load account");
        return;
      }

      setMe(data);
      setMeError("");
    } catch {
      setMeError("Network error");
    }
  };

  useEffect(() => {
    void refreshMe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation, isBusy]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const paymentStatus = params.get("payment");

    if (!sessionId || paymentStatus !== "success") {
      return;
    }

    const token = getUserToken();
    if (!token) return;

    const confirmCheckout = async () => {
      try {
        setCheckoutState("confirming");
        const res = await fetch(`${API_BASE}/billing/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          setUserToken(null);
          window.location.replace("/login");
          return;
        }
        if (!res.ok) {
          setConversation((prev) => [
            ...prev,
            { id: uid(), role: "system", content: data.message || data.error || "Payment confirmation failed." },
          ]);
          setCheckoutState("idle");
          return;
        }

        if (data.token) {
          setUserToken(data.token);
        }

        setCheckoutState("paid");
        setConversation((prev) => [
          ...prev,
          { id: uid(), role: "system", content: "Your $2 builder checkout was confirmed successfully." },
        ]);
        await refreshMe();
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {
        setCheckoutState("idle");
      }
    };

    void confirmCheckout();
  }, []);

  const startCheckout = async () => {
    const token = getUserToken();
    if (!token || checkoutState === "starting" || checkoutState === "confirming") return;

    try {
      setCheckoutState("starting");
      const successUrl = `${window.location.origin}/workspace?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/workspace?payment=cancelled`;

      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ successUrl, cancelUrl }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setUserToken(null);
        window.location.replace("/login");
        return;
      }
      if (!res.ok || !data.url) {
        setConversation((prev) => [
          ...prev,
          { id: uid(), role: "system", content: data.message || data.error || "Could not start checkout." },
        ]);
        setCheckoutState("idle");
        return;
      }

      window.location.href = data.url;
    } catch {
      setCheckoutState("idle");
      setConversation((prev) => [...prev, { id: uid(), role: "system", content: "Could not reach checkout." }]);
    }
  };

  const sendMessage = async (messageText) => {
    const userPrompt = String(messageText ?? prompt).trim();
    if (!userPrompt || isBusy) return;

    const token = getUserToken();
    setPrompt("");
    setIsBusy(true);

    const thinkingId = uid();
    const nextConversation = [
      ...conversation,
      { id: uid(), role: "user", content: userPrompt },
      { id: thinkingId, role: "thinking", content: "Generating files, steps, and a build plan..." },
    ];

    setConversation(nextConversation);

    try {
      const payloadMessages = nextConversation
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setUserToken(null);
        window.location.replace("/login");
        return;
      }
      if (!res.ok) {
        setConversation((prev) =>
          prev
            .filter((message) => message.id !== thinkingId)
            .concat({
              id: uid(),
              role: "system",
              content: data.message || data.error || `Request failed (${res.status})`,
            })
        );
        setIsBusy(false);
        return;
      }

      setBuild(data);
      setSelectedFilePath(data.files?.[0]?.path || "");
      setConversation((prev) =>
        prev
          .filter((message) => message.id !== thinkingId)
          .concat({
            id: uid(),
            role: "assistant",
            content: data.assistantMessage || "The build is ready in the workspace panels.",
          })
      );
    } catch {
      setConversation((prev) =>
        prev
          .filter((message) => message.id !== thinkingId)
          .concat({ id: uid(), role: "system", content: "Network error. Try again." })
      );
    } finally {
      setIsBusy(false);
    }
  };

  const activeFile =
    build.files.find((file) => file.path === selectedFilePath) ||
    build.files[0] || {
      path: "README.md",
      language: "md",
      purpose: "No file selected",
      content: "No file selected.",
    };

  const planLabel = me?.subscriptionPlan || "trial";

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-[1520px] flex-1 flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-welp ring-1 ring-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Builder workspace</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">{build.projectName}</h1>
                <p className="mt-2 text-sm text-white/60">{build.tagline}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {me?.hasAiAccess ? "Builder active" : "Upgrade needed"}
                </div>
                <Link to="/contact" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10">
                  Contact Admin
                </Link>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400">{build.summary}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-welp ring-1 ring-white/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Account</p>
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              <div>Plan: <span className="font-semibold text-white">{planLabel}</span></div>
              <div>Builder checkout: <span className="font-semibold text-[#8ec5ff]">$2</span></div>
              <div>{me?.hasAiAccess ? "AI access is active." : "Complete checkout to keep AI access after trial."}</div>
            </div>
            <button
              type="button"
              onClick={startCheckout}
              disabled={checkoutState === "starting" || checkoutState === "confirming"}
              className="mt-4 w-full rounded-xl bg-[#8ec5ff] px-4 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-white disabled:opacity-60"
            >
              {checkoutState === "starting"
                ? "Opening checkout..."
                : checkoutState === "confirming"
                  ? "Confirming payment..."
                  : "Open $2 Builder Checkout"}
            </button>
            {meError ? <p className="mt-3 text-xs text-red-200">{meError}</p> : null}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className="space-y-4 xl:overflow-y-auto">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-welp ring-1 ring-white/[0.04]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Stack</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {build.stack.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/80">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Key features</div>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                {build.features.map((feature) => (
                  <div key={feature} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                    {feature}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-welp ring-1 ring-white/[0.04]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Build checklist</div>
              <div className="mt-4 space-y-3">
                {build.steps.map((step) => (
                  <div key={step.title} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-white">{step.title}</div>
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                          step.status === "done"
                            ? "bg-emerald-500/15 text-emerald-200"
                            : step.status === "doing"
                              ? "bg-cyan-500/15 text-cyan-200"
                              : "bg-zinc-800 text-zinc-300",
                        ].join(" ")}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{step.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-welp ring-1 ring-white/[0.04]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Run commands</div>
              <div className="mt-4 space-y-2">
                {build.commands.map((command) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => copyText(command)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left text-sm text-zinc-200 transition hover:bg-white/[0.06]"
                  >
                    <span className="font-mono">{command}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Preview notes</div>
              <div className="mt-3 space-y-2 text-sm text-zinc-400">
                {build.previewNotes.map((note) => (
                  <div key={note} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                    {note}
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="min-h-0 rounded-2xl border border-white/10 bg-white/[0.04] shadow-welp ring-1 ring-white/[0.04]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Explorer</div>
                <div className="mt-1 text-lg font-semibold text-white">Generated files</div>
              </div>
              <button
                type="button"
                onClick={() => copyText(activeFile.content)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Copy file
              </button>
            </div>

            <div className="grid min-h-[680px] gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="border-b border-white/10 bg-black/20 p-4 lg:border-b-0 lg:border-r">
                <div className="space-y-2">
                  {build.files.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setSelectedFilePath(file.path)}
                      className={[
                        "w-full rounded-xl border px-3 py-3 text-left transition",
                        selectedFilePath === file.path
                          ? "border-welp-accent/30 bg-white/[0.08] text-white"
                          : "border-white/10 bg-transparent text-zinc-300 hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <div className="font-mono text-xs text-cyan-200">{file.path}</div>
                      <div className="mt-2 text-sm text-zinc-400">{file.purpose}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 flex-col">
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm text-cyan-200">{activeFile.path}</div>
                      <div className="mt-1 text-sm text-zinc-500">{activeFile.purpose}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      {activeFile.language}
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-[#050a12] p-5">
                  <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-zinc-200">
                    {activeFile.content}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] shadow-welp ring-1 ring-white/[0.04]">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Builder chat</div>
              <div className="mt-1 text-lg font-semibold text-white">Prompt the workspace</div>
            </div>

            <div className="border-b border-white/10 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-left text-xs font-medium text-white/80 transition hover:bg-white/[0.08]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {conversation.map((message) => {
                const isUser = message.role === "user";
                const isSystem = message.role === "system";
                const isThinking = message.role === "thinking";

                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}>
                    <div
                      className={[
                        "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        isUser
                          ? "bg-gradient-to-br from-welp-accent to-sky-300 text-welp-void"
                          : isSystem
                            ? "border border-white/10 bg-black/25 text-zinc-400"
                            : "border border-white/[0.08] bg-black/20 text-zinc-100",
                      ].join(" ")}
                    >
                      {isThinking ? (
                        <div className="flex items-center gap-2">
                          <TypingDots />
                          <span>{message.content}</span>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-white/10 px-4 py-4">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.1] bg-black/25 p-1">
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Describe the app, feature, page, or workflow you want to build..."
                    rows={3}
                    className="max-h-48 min-h-[72px] w-full resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!prompt.trim() || isBusy}
                  className="rounded-2xl bg-gradient-to-r from-welp-accent to-sky-300 px-5 py-3 text-sm font-semibold text-welp-void transition hover:brightness-110 disabled:opacity-45"
                >
                  {isBusy ? "Building..." : "Generate"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
