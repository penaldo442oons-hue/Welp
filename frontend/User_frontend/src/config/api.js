const envBase = import.meta.env.VITE_API_BASE?.trim().replace(/\/$/, "");
const isVercelHost =
  typeof window !== "undefined" && /\.vercel\.app$/i.test(window.location.hostname);

export const API_BASE = envBase || (import.meta.env.DEV || isVercelHost ? "/api" : "https://welp-cfir.onrender.com");
