/**
 * Calls Anthropic, OpenAI, or Gemini based on AI_PROVIDER and API keys in env.
 * The response is normalized into a richer Replit-style builder workspace shape.
 */

const STRUCTURE_HINT = `Respond with a single JSON object only (no markdown fences), using this exact shape:
{
  "assistantMessage": "short direct builder reply",
  "projectName": "string",
  "tagline": "string",
  "summary": "string",
  "stack": ["string"],
  "features": ["string"],
  "steps": [
    { "title": "string", "description": "string", "status": "done|doing|todo" }
  ],
  "commands": ["string"],
  "previewNotes": ["string"],
  "files": [
    {
      "path": "string",
      "language": "string",
      "purpose": "string",
      "content": "string"
    }
  ]
}
Use plain JSON only. Make the answer feel like a Replit-style builder: practical, file-based, and implementation-heavy. Keep files to 3-6 useful starter files.`;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toTitleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function parseJsonFromModelText(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty model response");
  }

  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("Model did not return JSON");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeFile(file, index) {
  const fallbackPath = index === 0 ? "src/App.jsx" : `src/file-${index + 1}.txt`;
  return {
    path: String(file?.path || fallbackPath).trim() || fallbackPath,
    language: String(file?.language || "txt").trim() || "txt",
    purpose: String(file?.purpose || "Project file").trim() || "Project file",
    content: String(file?.content || "").trim(),
  };
}

function normalizeStep(step, index) {
  const fallbackTitle = index === 0 ? "Blueprint ready" : `Step ${index + 1}`;
  const rawStatus = String(step?.status || (index === 0 ? "done" : "todo")).trim().toLowerCase();
  const status = rawStatus === "doing" || rawStatus === "done" ? rawStatus : "todo";

  return {
    title: String(step?.title || fallbackTitle).trim() || fallbackTitle,
    description: String(step?.description || "").trim() || "Build this part next.",
    status,
  };
}

function normalizeStructured(parsed) {
  const files = safeArray(parsed?.files).map(normalizeFile).filter((file) => file.content);
  const steps = safeArray(parsed?.steps).map(normalizeStep);

  return {
    assistantMessage: String(parsed?.assistantMessage || "").trim() || "I mapped out the build in the workspace.",
    projectName: String(parsed?.projectName || "").trim() || "New Builder Project",
    tagline: String(parsed?.tagline || "").trim() || "Replit-style project blueprint",
    summary: String(parsed?.summary || "").trim() || "A practical starter build is ready.",
    stack: safeArray(parsed?.stack).map((item) => String(item).trim()).filter(Boolean),
    features: safeArray(parsed?.features).map((item) => String(item).trim()).filter(Boolean),
    steps: steps.length ? steps : [{ title: "Blueprint ready", description: "Start implementing from the generated files.", status: "done" }],
    commands: safeArray(parsed?.commands).map((item) => String(item).trim()).filter(Boolean),
    previewNotes: safeArray(parsed?.previewNotes).map((item) => String(item).trim()).filter(Boolean),
    files: files.length
      ? files
      : [
          {
            path: "README.md",
            language: "md",
            purpose: "Fallback instructions",
            content: "# Builder output\n\nThe model did not return files, so start by defining the app shell and core routes.",
          },
        ],
  };
}

export function getResolvedAiProvider() {
  return String(process.env.AI_PROVIDER || "mock").trim().toLowerCase();
}

function inferTemplate(prompt) {
  const text = String(prompt || "").toLowerCase();

  if (/chat|messag|support|admin/i.test(text)) {
    return {
      name: "Support Hub",
      tagline: "Realtime support workspace with chat-first operations",
      stack: ["React", "Node.js", "Express", "SQLite", "Tailwind CSS"],
      features: [
        "Dedicated inbox for support conversations",
        "Realtime-feeling chat UI with unread states",
        "Admin reply workflow and contact categories",
        "Status tracking for waiting-for-admin and waiting-for-user",
      ],
    };
  }

  if (/e-?commerce|shop|store|cart|checkout/i.test(text)) {
    return {
      name: "Commerce Builder",
      tagline: "A storefront starter with products, cart, and checkout flow",
      stack: ["React", "Node.js", "Express", "SQLite", "Tailwind CSS"],
      features: [
        "Storefront landing page and product listing",
        "Cart and checkout route structure",
        "Admin inventory endpoints",
        "Customer order tracking foundation",
      ],
    };
  }

  if (/dashboard|analytics|admin/i.test(text)) {
    return {
      name: "Ops Dashboard",
      tagline: "A dashboard starter focused on operations, stats, and workflows",
      stack: ["React", "Node.js", "Express", "SQLite", "Tailwind CSS"],
      features: [
        "Overview cards and activity metrics",
        "Table-based user and request management",
        "Dedicated inbox and review queues",
        "Admin actions with clear workflow states",
      ],
    };
  }

  return {
    name: "Builder Workspace",
    tagline: "A product starter with a homepage, dashboard, and backend routes",
    stack: ["React", "Node.js", "Express", "SQLite", "Tailwind CSS"],
    features: [
      "Modern marketing homepage and signed-in workspace",
      "Backend routes for auth, data, and orchestration",
      "Reusable UI blocks and clear file structure",
      "A step-by-step implementation runbook",
    ],
  };
}

function createMockFiles(projectName, tagline, prompt) {
  const safeName = toTitleCase(projectName || "Builder Workspace");
  const summaryLine = String(prompt || "").trim() || "Build a polished product experience.";

  return [
    {
      path: "src/App.jsx",
      language: "jsx",
      purpose: "Main application shell and route layout",
      content: [
        'import { BrowserRouter, Routes, Route } from "react-router-dom";',
        'import HomePage from "./pages/HomePage";',
        'import DashboardPage from "./pages/DashboardPage";',
        "",
        "export default function App() {",
        "  return (",
        "    <BrowserRouter>",
        "      <Routes>",
        '        <Route path="/" element={<HomePage />} />',
        '        <Route path="/dashboard" element={<DashboardPage />} />',
        "      </Routes>",
        "    </BrowserRouter>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/pages/HomePage.jsx",
      language: "jsx",
      purpose: "Landing page for the generated project",
      content: [
        'export default function HomePage() {',
        "  return (",
        '    <main className=\"min-h-screen bg-slate-950 text-white\">',
        '      <section className=\"mx-auto max-w-6xl px-6 py-24\">',
        `        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">${tagline}</p>`,
        `        <h1 className="mt-6 text-5xl font-semibold">${safeName}</h1>`,
        `        <p className="mt-6 max-w-2xl text-lg text-white/70">${summaryLine}</p>`,
        "      </section>",
        "    </main>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "src/pages/DashboardPage.jsx",
      language: "jsx",
      purpose: "Signed-in dashboard skeleton",
      content: [
        'const cards = ["Users", "Revenue", "Tasks", "Messages"];',
        "",
        "export default function DashboardPage() {",
        "  return (",
        '    <main className=\"min-h-screen bg-slate-950 px-6 py-12 text-white\">',
        '      <h2 className=\"text-3xl font-semibold\">Dashboard</h2>',
        '      <div className=\"mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4\">',
        "        {cards.map((card) => (",
        '          <div key={card} className=\"rounded-2xl border border-white/10 bg-white/5 p-5\">',
        '            <div className=\"text-sm text-white/50\">{card}</div>',
        '            <div className=\"mt-4 text-2xl font-semibold\">--</div>',
        "          </div>",
        "        ))}",
        "      </div>",
        "    </main>",
        "  );",
        "}",
      ].join("\n"),
    },
    {
      path: "server/routes/build.js",
      language: "js",
      purpose: "Backend route stub for the core feature",
      content: [
        'import express from "express";',
        "",
        "const router = express.Router();",
        "",
        'router.get("/health", (req, res) => {',
        '  res.json({ ok: true, project: "builder-workspace" });',
        "});",
        "",
        "export default router;",
      ].join("\n"),
    },
  ];
}

function mockStructuredFromPrompt(prompt) {
  const trimmed = String(prompt || "").trim();
  const template = inferTemplate(trimmed);
  const projectName = toTitleCase(trimmed.split(/\s+/).slice(0, 4).join(" ")) || template.name;

  return {
    assistantMessage: `I turned this into a Replit-style build workspace. You now have a starter project brief, key steps, runnable commands, and generated files to begin with.`,
    projectName,
    tagline: template.tagline,
    summary: `${projectName} is set up as a builder-first project with a clean app shell, starter routes, and a practical roadmap. Use the generated files as the first draft, then iterate feature by feature.`,
    stack: template.stack,
    features: template.features,
    steps: [
      {
        title: "Blueprint mapped",
        description: "The first draft of the project structure, stack, and files is ready.",
        status: "done",
      },
      {
        title: "Build the shell",
        description: "Create the homepage, dashboard shell, and navigation so the flow feels real quickly.",
        status: "doing",
      },
      {
        title: "Wire backend routes",
        description: "Add the API routes and persistence for the core action in the product.",
        status: "todo",
      },
      {
        title: "Connect data and auth",
        description: "Hook user state, requests, conversations, or project records into the interface.",
        status: "todo",
      },
      {
        title: "Polish and ship",
        description: "Add loading states, validation, admin tools, and final UI refinements.",
        status: "todo",
      },
    ],
    commands: [
      "npm install",
      "npm run dev",
      "npm run build",
    ],
    previewNotes: [
      "Start from the app shell and make the first happy-path usable before adding extras.",
      "Use the file explorer to edit starter files instead of rebuilding the project structure from scratch.",
      "If you need human help mid-build, open the Contact Admin area from the workspace.",
    ],
    files: createMockFiles(projectName, template.tagline, trimmed),
  };
}

async function callAnthropic(systemPrompt, userMessages) {
  const key = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022";

  const messages = userMessages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: `${systemPrompt}\n\n${STRUCTURE_HINT}`,
      messages,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || data.message || `Anthropic error (${res.status})`);
  }

  return parseJsonFromModelText(data.content?.[0]?.text);
}

async function callOpenAI(systemPrompt, userMessages) {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages = [
    { role: "system", content: `${systemPrompt}\n\n${STRUCTURE_HINT}` },
    ...userMessages.map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data.error;
    const code = err?.code;
    const msg = err?.message || "";

    if (
      code === "insufficient_quota" ||
      code === "billing_not_active" ||
      /quota|billing|exceeded your current quota/i.test(msg)
    ) {
      throw new Error(
        "OpenAI rejected this request: no quota or billing is not set up for this API key. " +
          "In OpenAI: open Usage / Billing, add a payment method or top up credits, and confirm the key is for a project with access."
      );
    }

    if (code === "rate_limit_exceeded" || res.status === 429) {
      throw new Error("OpenAI rate limit - wait a moment and try again, or lower usage in your org settings.");
    }

    throw new Error(msg || `OpenAI error (${res.status})`);
  }

  return parseJsonFromModelText(data.choices?.[0]?.message?.content);
}

async function callGemini(systemPrompt, userMessages) {
  const key = String(process.env.GEMINI_API_KEY || "").trim();
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const contents = userMessages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${systemPrompt}\n\n${STRUCTURE_HINT}` }] },
      contents,
      generationConfig: {
        temperature: 0.4,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini error (${res.status})`);
  }

  return parseJsonFromModelText(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

export async function runWorkspaceModel(userMessages) {
  const provider = getResolvedAiProvider();
  const systemPrompt =
    "You are WELP Builder, a Replit-style build agent. Think like a senior full-stack engineer and product builder. Return practical implementation plans, starter files, run commands, and next steps. Prefer shippable project structure over generic advice.";

  let parsed;
  if (provider === "mock") {
    const lastUser = [...userMessages].reverse().find((message) => message.role === "user");
    parsed = mockStructuredFromPrompt(lastUser?.content);
  } else if (provider === "openai") {
    parsed = await callOpenAI(systemPrompt, userMessages);
  } else if (provider === "gemini") {
    parsed = await callGemini(systemPrompt, userMessages);
  } else {
    parsed = await callAnthropic(systemPrompt, userMessages);
  }

  return normalizeStructured(parsed);
}

export function isAiConfigured() {
  const provider = getResolvedAiProvider();
  if (provider === "mock") return true;
  if (provider === "openai") return Boolean(String(process.env.OPENAI_API_KEY || "").trim());
  if (provider === "gemini") return Boolean(String(process.env.GEMINI_API_KEY || "").trim());
  return Boolean(String(process.env.ANTHROPIC_API_KEY || "").trim());
}
