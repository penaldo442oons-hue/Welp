import { NavLink, useNavigate } from "react-router-dom";
import WelpLogo from "./WelpLogo";

function navClass({ isActive }) {
  return [
    "rounded-xl px-3 py-2.5 text-sm font-medium transition",
    isActive
      ? "bg-white/10 text-white shadow-welp-inset ring-1 ring-white/10"
      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
  ].join(" ");
}

export default function Sidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-dvh w-[240px] flex-col border-r border-white/[0.08] bg-welp-ink/95 px-3 py-5 backdrop-blur-xl lg:w-[260px]">
      <div className="border-b border-white/10 px-2 pb-4">
        <NavLink to="/dashboard" className="block outline-none ring-welp-accent/40 focus-visible:ring-2">
          <WelpLogo className="h-7 max-w-[190px]" />
        </NavLink>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Admin console</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2 pt-5">
        <NavLink to="/dashboard" end className={navClass}>
          Overview
        </NavLink>
        <NavLink to="/users" className={navClass}>
          Users
        </NavLink>
        <NavLink to="/inbox" className={navClass}>
          Contact Inbox
        </NavLink>
        <NavLink to="/admin-queue" className={navClass}>
          AI Queue
        </NavLink>
      </nav>

      <div className="border-t border-white/10 p-2 pt-3">
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-zinc-300 shadow-welp-inset transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
