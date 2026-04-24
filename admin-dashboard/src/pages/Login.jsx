import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WelpLogo from "../components/WelpLogo";
import { API_BASE } from "../config/api.js";

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: identifier,
          email: identifier,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch {
      setError("Could not reach the API server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-welp-panel/60 p-8 shadow-welp ring-1 ring-white/[0.05] backdrop-blur-xl md:p-10">
        <div className="flex flex-col items-center text-center">
          <WelpLogo className="h-10 max-w-[220px]" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Admin</p>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-400">Use your admin credentials to manage requests, availability, and chats.</p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={login} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">Username or email</label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-welp-accent/50"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-welp-accent/50"
              placeholder="admin123"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-welp-accent to-sky-300 py-3 text-sm font-semibold text-welp-void shadow-[0_12px_40px_rgba(142,197,255,0.22)] transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Continue to dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
