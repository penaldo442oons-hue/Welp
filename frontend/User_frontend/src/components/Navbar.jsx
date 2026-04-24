import { Link, NavLink, useNavigate } from "react-router-dom";
import WelpLogo from "./WelpLogo";
import { getUserToken, setUserToken } from "./ProtectedRoute.jsx";

function Navbar() {
  const navigate = useNavigate();
  const signedIn = Boolean(getUserToken());

  const signOut = () => {
    setUserToken(null);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-white/[0.07] bg-welp-void/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/workspace" className="group flex min-w-0 max-w-[min(100%,calc(100%-11rem))] items-center gap-2.5 py-1 md:max-w-none md:gap-3">
          <WelpLogo className="transition-opacity group-hover:opacity-95" />
          <span className="hidden flex-col border-l border-white/10 pl-2.5 leading-none sm:flex md:pl-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">AI Workspace</span>
          </span>
        </Link>

        <nav className="flex flex-shrink-0 items-center gap-2">
          <NavLink
            to="/workspace"
            className={({ isActive }) =>
              [
                "rounded-full px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-white/10 text-white shadow-welp-inset ring-1 ring-white/10"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              ].join(" ")
            }
          >
            Workspace
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              [
                "rounded-full px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-white/10 text-white shadow-welp-inset ring-1 ring-white/10"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              ].join(" ")
            }
          >
            Contact Admin
          </NavLink>
          {signedIn ? (
            <button
              type="button"
              onClick={signOut}
              className="rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
            >
              Sign out
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
