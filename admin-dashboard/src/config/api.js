/**
 * In dev, Vite proxies `/api/*` → `http://localhost:5000/*` (see vite.config.js)
 * so the browser stays same-origin and avoids CORS issues.
 *
 * Override with VITE_API_BASE (no trailing slash), e.g. https://api.example.com
 */
const envBase = import.meta.env.VITE_API_BASE?.trim().replace(/\/$/, "");
const isVercelHost =
  typeof window !== "undefined" && /\.vercel\.app$/i.test(window.location.hostname);

export const API_BASE = envBase || (import.meta.env.DEV || isVercelHost ? "/api" : "https://welp-cfir.onrender.com");
