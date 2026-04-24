import "./loadEnv.js";
import express from "express";
import cors from "cors";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { runWorkspaceModel, isAiConfigured, getResolvedAiProvider } from "./lib/aiService.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const REQUESTS_FILE = "./src/data/requests.json";
const USERS_FILE = "./src/data/users.json";
const ADMIN_STATE_FILE = "./src/data/adminState.json";
const CHATS_FILE = "./src/data/chats.json";

const DEMO_DURATION_MS = Number(process.env.DEMO_DURATION_MS) || 7 * 24 * 60 * 60 * 1000;
const STRIPE_PRICE_CENTS = 200;

const SECRET = process.env.JWT_SECRET || "supersecretkey";
const APP_BASE_URL =
  String(process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const ADMIN_DASHBOARD_URL = String(process.env.ADMIN_DASHBOARD_URL || "http://localhost:5174").replace(/\/$/, "");

const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "admin123");
const ADMIN_PASSWORD_HASH = String(process.env.ADMIN_PASSWORD_HASH || "").trim();

const stripeSessions = new Map();

function ensureJsonFile(file, fallbackValue) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallbackValue, null, 2));
  }
}

function readJson(file, fallbackValue) {
  try {
    ensureJsonFile(file, fallbackValue);
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to read ${file}`, error);
    return fallbackValue;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function createRequestTicket() {
  return `REQ-${Date.now()}`;
}

function normalizeUser(user) {
  const createdAt = Number(user?.createdAt) || Date.now();
  const trialEndsAt = Number(user?.trialEndsAt) || createdAt + DEMO_DURATION_MS;
  const lastLoginAt = Number(user?.lastLoginAt) || createdAt;

  return {
    ...user,
    id: user?.id || createdAt,
    email: String(user?.email || "").trim().toLowerCase(),
    name: String(user?.name || "User").trim() || "User",
    passwordHash: String(user?.passwordHash || user?.password || "").trim(),
    subscriptionPlan: String(user?.subscriptionPlan || "trial").trim() || "trial",
    trialEndsAt,
    createdAt,
    loginCount: Math.max(Number(user?.loginCount) || 0, 1),
    lastLoginAt,
    lastSeenAt: Number(user?.lastSeenAt) || lastLoginAt,
  };
}

function normalizeRequest(request) {
  const createdAt = Number(request?.createdAt) || Date.now();
  const isAi = request?.type === "ai";

  return {
    ...request,
    id: request?.id || createdAt,
    createdAt,
    status: String(request?.status || (isAi ? "processing" : "pending")),
    retries: Number(request?.retries) || 0,
    ticket: isAi ? request?.ticket || null : request?.ticket || createRequestTicket(),
    user: request?.user || request?.email || "anonymous",
    prompt: request?.prompt || "",
    projectName: request?.projectName || "",
  };
}

function normalizeMessage(message) {
  const createdAt = Number(message?.createdAt) || Date.now();
  return {
    id: message?.id || `msg-${createdAt}-${Math.random().toString(16).slice(2, 8)}`,
    senderType: message?.senderType === "admin" ? "admin" : "user",
    senderLabel: String(message?.senderLabel || "Support").trim() || "Support",
    content: String(message?.content || "").trim(),
    createdAt,
  };
}

function normalizeConversation(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages.map(normalizeMessage) : [];
  const createdAt = Number(conversation?.createdAt) || Number(messages[0]?.createdAt) || Date.now();
  const lastMessage = messages[messages.length - 1];
  const lastMessageAt = Number(conversation?.lastMessageAt) || Number(lastMessage?.createdAt) || createdAt;

  return {
    id: conversation?.id || `chat-${createdAt}`,
    category: "contact-admin",
    userEmail: String(conversation?.userEmail || "").trim().toLowerCase(),
    userName: String(conversation?.userName || "User").trim() || "User",
    subject: String(conversation?.subject || "").trim(),
    status: String(
      conversation?.status || (lastMessage?.senderType === "admin" ? "waiting-for-user" : "waiting-for-admin")
    ).trim(),
    createdAt,
    updatedAt: Number(conversation?.updatedAt) || lastMessageAt,
    lastMessageAt,
    lastMessagePreview: String(conversation?.lastMessagePreview || lastMessage?.content || "").slice(0, 120),
    adminUnreadCount: Number(conversation?.adminUnreadCount) || 0,
    userUnreadCount: Number(conversation?.userUnreadCount) || 0,
    messages,
  };
}

function normalizeAdminState(state) {
  return {
    availableDevelopers: Math.max(0, Number(state?.availableDevelopers) || 0),
    availableUntil: state?.availableUntil ? Number(state.availableUntil) : null,
    updatedAt: state?.updatedAt ? Number(state.updatedAt) : null,
    updatedBy: state?.updatedBy || null,
  };
}

let requests = readJson(REQUESTS_FILE, []).map(normalizeRequest);
let users = readJson(USERS_FILE, []).map(normalizeUser);
let adminState = normalizeAdminState(
  readJson(ADMIN_STATE_FILE, {
    availableDevelopers: 0,
    availableUntil: null,
    updatedAt: null,
    updatedBy: null,
  })
);
let chatConversations = readJson(CHATS_FILE, []).map(normalizeConversation);

const saveRequests = () => writeJson(REQUESTS_FILE, requests);
const saveUsers = () => writeJson(USERS_FILE, users);
const saveAdminState = () => writeJson(ADMIN_STATE_FILE, adminState);
const saveChats = () => writeJson(CHATS_FILE, chatConversations);

saveRequests();
saveUsers();
saveAdminState();
saveChats();

const findUserByEmail = (email) =>
  users.find((user) => user.email === String(email || "").trim().toLowerCase());

const findConversationById = (id) => chatConversations.find((conversation) => conversation.id === id);

function sortConversations() {
  chatConversations.sort((a, b) => Number(b.lastMessageAt || b.updatedAt || 0) - Number(a.lastMessageAt || a.updatedAt || 0));
}

function getLiveAvailability() {
  const now = Date.now();
  const until = adminState.availableUntil ? Number(adminState.availableUntil) : null;
  const isAvailable = Boolean(until && until > now && adminState.availableDevelopers > 0);

  return {
    availableDevelopers: isAvailable ? Number(adminState.availableDevelopers) : 0,
    availableUntil: isAvailable ? until : null,
    updatedAt: adminState.updatedAt,
    updatedBy: adminState.updatedBy,
    isAvailable,
  };
}

function getPublicMetrics() {
  const aiTasks = requests.filter((request) => request.type === "ai");
  return {
    totalUsers: users.length,
    totalBuilds: aiTasks.length,
    directSupportThreads: chatConversations.length,
    availableDevelopers: getLiveAvailability().availableDevelopers,
  };
}

function userHasAiAccess(user) {
  if (getResolvedAiProvider() === "mock") {
    return true;
  }

  if (!user) return false;
  if (user.subscriptionPlan === "builder" || user.subscriptionPlan === "starter" || user.subscriptionPlan === "pro") {
    return true;
  }
  return user.subscriptionPlan === "trial" && Number(user.trialEndsAt) > Date.now();
}

function sanitizeUser(user) {
  return {
    email: user.email,
    name: user.name,
    subscriptionPlan: user.subscriptionPlan,
    trialEndsAt: user.trialEndsAt,
    hasAiAccess: userHasAiAccess(user),
    loginCount: user.loginCount,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

function issueUserToken(user) {
  return jwt.sign(
    {
      type: "user",
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      trialEndsAt: user.trialEndsAt,
    },
    SECRET,
    { expiresIn: "30d" }
  );
}

function issueAdminToken() {
  return jwt.sign(
    {
      type: "admin",
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
    },
    SECRET,
    { expiresIn: "8h" }
  );
}

function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    if (decoded.type !== "admin") {
      return res.status(403).json({ error: "Invalid admin token" });
    }
    req.adminJwt = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
}

function verifyUserToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    if (decoded.type !== "user") {
      return res.status(403).json({ error: "Invalid user token" });
    }
    req.userJwt = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
}

function activateBuilderPlan(user) {
  user.subscriptionPlan = "builder";
  user.builderActivatedAt = Date.now();
  saveUsers();
  return user;
}

function recordUserLogin(user) {
  const now = Date.now();
  user.loginCount = Math.max(Number(user.loginCount) || 0, 0) + 1;
  user.lastLoginAt = now;
  user.lastSeenAt = now;
  saveUsers();
}

function touchUserSession(user) {
  user.lastSeenAt = Date.now();
  saveUsers();
}

function createChatConversationForUser(user) {
  const existing = chatConversations.find((conversation) => conversation.userEmail === user.email);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const conversation = normalizeConversation({
    id: `chat-${now}`,
    category: "contact-admin",
    userEmail: user.email,
    userName: user.name,
    subject: "",
    status: "open",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: "",
    adminUnreadCount: 0,
    userUnreadCount: 0,
    messages: [],
  });

  chatConversations.push(conversation);
  sortConversations();
  saveChats();
  return conversation;
}

function markConversationReadForAdmin(conversation) {
  conversation.adminUnreadCount = 0;
  conversation.updatedAt = Date.now();
  saveChats();
}

function markConversationReadForUser(conversation) {
  conversation.userUnreadCount = 0;
  conversation.updatedAt = Date.now();
  saveChats();
}

function addConversationMessage(conversation, senderType, senderLabel, content, options = {}) {
  const now = Date.now();

  if (!conversation.subject) {
    const proposedSubject = String(options.subject || options.topic || content).trim();
    conversation.subject = proposedSubject.slice(0, 72);
  }

  conversation.messages.push(
    normalizeMessage({
      id: `msg-${now}-${Math.random().toString(16).slice(2, 8)}`,
      senderType,
      senderLabel,
      content,
      createdAt: now,
    })
  );

  conversation.lastMessagePreview = String(content).slice(0, 120);
  conversation.lastMessageAt = now;
  conversation.updatedAt = now;

  if (senderType === "user") {
    conversation.adminUnreadCount = Number(conversation.adminUnreadCount || 0) + 1;
    conversation.status = "waiting-for-admin";
  } else {
    conversation.userUnreadCount = Number(conversation.userUnreadCount || 0) + 1;
    conversation.adminUnreadCount = 0;
    conversation.status = "waiting-for-user";
  }

  sortConversations();
  saveChats();
}

function getAdminStats() {
  const regularRequests = requests.filter((request) => request.type !== "ai");
  const aiTasks = requests.filter((request) => request.type === "ai");
  const now = Date.now();

  return {
    users: {
      total: users.length,
      totalLogins: users.reduce((sum, user) => sum + Number(user.loginCount || 0), 0),
      active24h: users.filter((user) => Number(user.lastLoginAt || 0) > now - 24 * 60 * 60 * 1000).length,
      new7d: users.filter((user) => Number(user.createdAt || 0) > now - 7 * 24 * 60 * 60 * 1000).length,
      paid: users.filter((user) => user.subscriptionPlan !== "trial").length,
    },
    requests: {
      total: regularRequests.length,
      pending: regularRequests.filter((request) => request.status === "pending").length,
      resolved: regularRequests.filter((request) => request.status === "resolved").length,
    },
    ai: {
      total: aiTasks.length,
      completed: aiTasks.filter((task) => task.status === "completed").length,
      needsReview: aiTasks.filter((task) => task.status === "needs-admin" || task.status === "admin-review").length,
    },
    contacts: {
      total: chatConversations.length,
      waitingForAdmin: chatConversations.filter((conversation) => conversation.status === "waiting-for-admin").length,
      waitingForUser: chatConversations.filter((conversation) => conversation.status === "waiting-for-user").length,
      unreadForAdmin: chatConversations.filter((conversation) => Number(conversation.adminUnreadCount) > 0).length,
    },
    availability: getLiveAvailability(),
    recentLogins: [...users]
      .sort((a, b) => Number(b.lastLoginAt || 0) - Number(a.lastLoginAt || 0))
      .slice(0, 6)
      .map((user) => ({
        email: user.email,
        name: user.name,
        loginCount: user.loginCount,
        lastLoginAt: user.lastLoginAt,
        subscriptionPlan: user.subscriptionPlan,
      })),
    recentRequests: [...regularRequests]
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 6)
      .map((request) => ({
        id: request.id,
        ticket: request.ticket,
        name: request.name,
        email: request.email,
        status: request.status,
        createdAt: request.createdAt,
      })),
    recentContacts: [...chatConversations]
      .sort((a, b) => Number(b.lastMessageAt || 0) - Number(a.lastMessageAt || 0))
      .slice(0, 6)
      .map((conversation) => ({
        id: conversation.id,
        userName: conversation.userName,
        userEmail: conversation.userEmail,
        subject: conversation.subject || "Contact admin",
        status: conversation.status,
        adminUnreadCount: conversation.adminUnreadCount,
        lastMessageAt: conversation.lastMessageAt,
      })),
  };
}

async function checkAdminPassword(password) {
  if (ADMIN_PASSWORD_HASH) {
    return bcrypt.compare(String(password || ""), ADMIN_PASSWORD_HASH);
  }

  return String(password || "") === ADMIN_PASSWORD;
}

async function createStripeCheckoutSession({ user, successUrl, cancelUrl }) {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const sessionSuccessUrl = successUrl || `${APP_BASE_URL}/workspace?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const sessionCancelUrl = cancelUrl || `${APP_BASE_URL}/workspace?payment=cancelled`;

  if (!secretKey) {
    const mockSessionId = `mock_${Date.now()}`;
    stripeSessions.set(mockSessionId, {
      id: mockSessionId,
      userEmail: user.email,
      payment_status: "paid",
      amount_total: STRIPE_PRICE_CENTS,
      url: sessionSuccessUrl.replace("{CHECKOUT_SESSION_ID}", mockSessionId),
      mock: true,
    });
    return stripeSessions.get(mockSessionId);
  }

  const body = new URLSearchParams({
    mode: "payment",
    success_url: sessionSuccessUrl,
    cancel_url: sessionCancelUrl,
    "payment_method_types[0]": "card",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(STRIPE_PRICE_CENTS),
    "line_items[0][price_data][product_data][name]": "WELP Builder Access",
    "line_items[0][price_data][product_data][description]": "Unlock builder support for $2.",
    "metadata[userEmail]": user.email,
    "metadata[plan]": "builder",
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const session = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(session.error?.message || "Stripe checkout session creation failed");
  }

  stripeSessions.set(session.id, session);
  return session;
}

async function fetchStripeSession(sessionId) {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secretKey) {
    return stripeSessions.get(sessionId) || null;
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const session = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(session.error?.message || "Could not verify Stripe session");
  }

  return session;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API running",
    aiProvider: getResolvedAiProvider(),
  });
});

app.get("/public/metrics", (req, res) => {
  res.json(getPublicMetrics());
});

app.get("/availability", (req, res) => {
  res.json(getLiveAvailability());
});

app.post("/admin/login", async (req, res) => {
  const identifier = String(req.body?.username || req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  const validIdentifier = identifier === ADMIN_USERNAME.toLowerCase() || identifier === ADMIN_EMAIL;
  if (!validIdentifier) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const validPassword = await checkAdminPassword(password);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({
    token: issueAdminToken(),
    admin: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
    },
  });
});

app.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const now = Date.now();
  const passwordHash = await bcrypt.hash(String(password), 10);

  const user = normalizeUser({
    id: now,
    email: normalizedEmail,
    name: String(name || "").trim() || "User",
    passwordHash,
    subscriptionPlan: "trial",
    trialEndsAt: now + DEMO_DURATION_MS,
    createdAt: now,
    loginCount: 1,
    lastLoginAt: now,
    lastSeenAt: now,
  });

  users.push(user);
  saveUsers();
  createChatConversationForUser(user);

  res.json({
    token: issueUserToken(user),
    user: sanitizeUser(user),
  });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const validPassword = await bcrypt.compare(String(password), String(user.passwordHash || ""));
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  recordUserLogin(user);
  createChatConversationForUser(user);

  res.json({
    token: issueUserToken(user),
    user: sanitizeUser(user),
  });
});

app.get("/auth/me", verifyUserToken, (req, res) => {
  const user = findUserByEmail(req.userJwt.email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  touchUserSession(user);
  res.json(sanitizeUser(user));
});

app.post("/auth/select-plan", verifyUserToken, (req, res) => {
  const user = findUserByEmail(req.userJwt.email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  activateBuilderPlan(user);
  res.json({
    token: issueUserToken(user),
    user: sanitizeUser(user),
  });
});

app.post("/billing/checkout", verifyUserToken, async (req, res) => {
  const user = findUserByEmail(req.userJwt.email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    const session = await createStripeCheckoutSession({
      user,
      successUrl: req.body?.successUrl,
      cancelUrl: req.body?.cancelUrl,
    });

    res.json({
      url: session.url,
      sessionId: session.id,
      amount: STRIPE_PRICE_CENTS,
      currency: "usd",
      mock: Boolean(session.mock),
    });
  } catch (error) {
    res.status(502).json({
      error: "CHECKOUT_FAILED",
      message: error.message || "Could not start Stripe checkout",
    });
  }
});

app.post("/billing/confirm", verifyUserToken, async (req, res) => {
  const user = findUserByEmail(req.userJwt.email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const sessionId = String(req.body?.sessionId || "").trim();
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const session = await fetchStripeSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Checkout session not found" });
    }

    if ((session.userEmail || session.metadata?.userEmail || "").toLowerCase() !== user.email) {
      return res.status(403).json({ error: "This checkout session does not belong to the current user" });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment is not completed yet" });
    }

    activateBuilderPlan(user);

    res.json({
      token: issueUserToken(user),
      user: sanitizeUser(user),
      checkout: {
        sessionId,
        amount: session.amount_total || STRIPE_PRICE_CENTS,
        paymentStatus: session.payment_status,
        mock: Boolean(session.mock),
      },
    });
  } catch (error) {
    res.status(502).json({
      error: "CHECKOUT_CONFIRM_FAILED",
      message: error.message || "Could not confirm payment",
    });
  }
});

app.get("/admin/stats", verifyAdminToken, (req, res) => {
  res.json(getAdminStats());
});

app.get("/admin/users", verifyAdminToken, (req, res) => {
  const list = [...users]
    .sort((a, b) => Number(b.lastLoginAt || 0) - Number(a.lastLoginAt || 0))
    .map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionPlan: user.subscriptionPlan,
      createdAt: user.createdAt,
      loginCount: user.loginCount,
      lastLoginAt: user.lastLoginAt,
      lastSeenAt: user.lastSeenAt,
      hasAiAccess: userHasAiAccess(user),
    }));

  res.json(list);
});

app.get("/admin/availability", verifyAdminToken, (req, res) => {
  res.json(getLiveAvailability());
});

app.put("/admin/availability", verifyAdminToken, (req, res) => {
  const availableDevelopers = Math.max(0, Number(req.body?.availableDevelopers) || 0);
  const durationHours = Math.max(0, Number(req.body?.durationHours) || 0);
  const now = Date.now();

  adminState = normalizeAdminState({
    availableDevelopers,
    availableUntil: availableDevelopers > 0 && durationHours > 0 ? now + durationHours * 60 * 60 * 1000 : null,
    updatedAt: now,
    updatedBy: req.adminJwt.email,
  });

  saveAdminState();
  res.json(getLiveAvailability());
});

app.get("/requests", (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2000);

  let filtered = [...requests];
  if (req.query.status) {
    filtered = filtered.filter((request) => request.status === req.query.status);
  }

  filtered.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  const start = (page - 1) * limit;
  res.json({
    total: filtered.length,
    page,
    limit,
    data: filtered.slice(start, start + limit),
  });
});

app.post("/requests", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const duplicate = requests.find(
    (request) => request.type !== "ai" && request.email === email && request.message === message
  );
  if (duplicate) {
    return res.status(409).json({ error: "Duplicate request" });
  }

  const newRequest = normalizeRequest({
    id: Date.now(),
    ticket: createRequestTicket(),
    name,
    email,
    message,
    status: "pending",
    createdAt: Date.now(),
  });

  requests.push(newRequest);
  saveRequests();
  res.json(newRequest);
});

app.put("/requests/:id/resolve", (req, res) => {
  const request = requests.find((entry) => Number(entry.id) === Number(req.params.id));
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  request.status = "resolved";
  saveRequests();
  res.json(request);
});

app.put("/requests/:id/pending", (req, res) => {
  const request = requests.find((entry) => Number(entry.id) === Number(req.params.id));
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  request.status = "pending";
  saveRequests();
  res.json(request);
});

app.delete("/requests/:id", (req, res) => {
  const before = requests.length;
  requests = requests.filter((entry) => Number(entry.id) !== Number(req.params.id));

  if (requests.length === before) {
    return res.status(404).json({ error: "Request not found" });
  }

  saveRequests();
  res.json({ message: "Request deleted" });
});

app.post("/ai/request", (req, res) => {
  const { prompt, user } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const task = normalizeRequest({
    id: Date.now(),
    type: "ai",
    user: user || "anonymous",
    prompt,
    status: "processing",
    retries: 0,
    createdAt: Date.now(),
  });

  requests.push(task);
  saveRequests();
  res.json(task);
});

app.post("/ai/chat", verifyUserToken, async (req, res) => {
  const user = findUserByEmail(req.userJwt.email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!userHasAiAccess(user)) {
    return res.status(403).json({
      error: "DEMO_EXPIRED",
      message: "Your demo has ended. Complete the $2 builder checkout to keep using AI.",
      trialEndsAt: user.trialEndsAt,
    });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({
      error: "AI_NOT_CONFIGURED",
      message: "Set AI_PROVIDER to mock, anthropic, openai, or gemini and configure the matching API key if needed.",
    });
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (!messages.length) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const cleanMessages = messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: message.role,
      content: String(message.content || ""),
    }))
    .filter((message) => message.content.length > 0);

  if (!cleanMessages.length) {
    return res.status(400).json({ error: "No valid messages" });
  }

  try {
    const structured = await runWorkspaceModel(cleanMessages);
    const lastUser = [...cleanMessages].reverse().find((message) => message.role === "user");

    requests.push(
      normalizeRequest({
        id: Date.now(),
        type: "ai",
        user: user.email,
        prompt: String(lastUser?.content || "").slice(0, 2000),
        projectName: structured.projectName,
        status: "completed",
        retries: 0,
        createdAt: Date.now(),
      })
    );
    saveRequests();

    res.json(structured);
  } catch (error) {
    console.error("ai/chat", error);
    res.status(502).json({
      error: "AI_REQUEST_FAILED",
      message: error.message || "Model request failed",
    });
  }
});

app.put("/ai/:id/retry", (req, res) => {
  const task = requests.find((entry) => Number(entry.id) === Number(req.params.id));
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  task.retries = Number(task.retries || 0) + 1;
  task.status = task.retries >= 3 ? "needs-admin" : "processing";
  saveRequests();
  res.json(task);
});

app.put("/ai/:id/escalate", (req, res) => {
  const task = requests.find((entry) => Number(entry.id) === Number(req.params.id));
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  task.status = "admin-review";
  saveRequests();
  res.json(task);
});

app.get("/chat/me", verifyUserToken, (req, res) => {
  const user = findUserByEmail(req.userJwt.email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const conversation = createChatConversationForUser(user);
  markConversationReadForUser(conversation);
  res.json(conversation);
});

app.post("/chat/me/messages", verifyUserToken, (req, res) => {
  const user = findUserByEmail(req.userJwt.email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const content = String(req.body?.content || "").trim();
  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  const conversation = createChatConversationForUser(user);
  addConversationMessage(conversation, "user", user.name, content, {
    subject: req.body?.subject,
    topic: req.body?.topic,
  });

  res.json(conversation);
});

app.get("/admin/chat/conversations", verifyAdminToken, (req, res) => {
  sortConversations();
  res.json(chatConversations);
});

app.post("/admin/chat/conversations/:id/read", verifyAdminToken, (req, res) => {
  const conversation = findConversationById(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  markConversationReadForAdmin(conversation);
  res.json(conversation);
});

app.post("/admin/chat/conversations/:id/messages", verifyAdminToken, (req, res) => {
  const conversation = findConversationById(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const content = String(req.body?.content || "").trim();
  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  addConversationMessage(conversation, "admin", ADMIN_USERNAME, content);
  res.json(conversation);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`[AI] provider=${getResolvedAiProvider()} key_loaded=${isAiConfigured() ? "yes" : "no"}`);
  console.log(`[App] frontend=${APP_BASE_URL} admin=${ADMIN_DASHBOARD_URL}`);
});
