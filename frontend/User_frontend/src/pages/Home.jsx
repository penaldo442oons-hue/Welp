import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import WelpLogo from "../components/WelpLogo";
import { API_BASE } from "../config/api.js";
import { getUserToken } from "../components/ProtectedRoute.jsx";

const workflow = [
  {
    title: "Describe the build",
    desc: "Ask for a SaaS, dashboard, commerce flow, admin system, or feature set and the builder maps the project structure immediately.",
  },
  {
    title: "Inspect files and steps",
    desc: "The workspace behaves more like a builder cockpit: generated files, commands, build checklist, and preview notes live side by side.",
  },
  {
    title: "Escalate to an admin",
    desc: "If you want human help, the contact-admin lane is available directly from the product with a dedicated inbox on the admin side.",
  },
];

export default function HomePage() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalBuilds: 0,
    directSupportThreads: 0,
    availableDevelopers: 0,
  });
  const [availability, setAvailability] = useState({
    availableDevelopers: 0,
    availableUntil: null,
    isAvailable: false,
  });

  const signedIn = Boolean(getUserToken());

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [metricsRes, availabilityRes] = await Promise.all([
          fetch(`${API_BASE}/public/metrics`),
          fetch(`${API_BASE}/availability`),
        ]);

        const metricsData = await metricsRes.json().catch(() => ({}));
        const availabilityData = await availabilityRes.json().catch(() => ({}));

        if (!active) return;

        if (metricsRes.ok) {
          setMetrics({
            totalUsers: Number(metricsData.totalUsers || 0),
            totalBuilds: Number(metricsData.totalBuilds || 0),
            directSupportThreads: Number(metricsData.directSupportThreads || 0),
            availableDevelopers: Number(metricsData.availableDevelopers || 0),
          });
        }

        if (availabilityRes.ok) {
          setAvailability({
            availableDevelopers: Number(availabilityData.availableDevelopers || 0),
            availableUntil: availabilityData.availableUntil || null,
            isAvailable: Boolean(availabilityData.isAvailable),
          });
        }
      } catch {
        // Leave defaults in place.
      }
    };

    void loadData();
    const interval = setInterval(loadData, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const availableUntilLabel = availability.availableUntil
    ? new Date(availability.availableUntil).toLocaleString()
    : null;

  const primaryCta = signedIn ? "/workspace" : "/register";
  const contactCta = signedIn ? "/contact" : "/login";

  return (
    <div className="min-h-screen overflow-hidden bg-[#06111f] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06111f]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="inline-flex items-center">
            <WelpLogo className="h-9 max-w-[min(220px,48vw)] md:h-10" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#builder" className="hover:text-white">Builder</a>
            <a href="#workflow" className="hover:text-white">Workflow</a>
            <a href="#contact-admin" className="hover:text-white">Contact Admin</a>
          </nav>

          <div className="flex gap-3">
            <Link to="/login" className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10">
              Login
            </Link>
            <Link to={primaryCta} className="rounded-full bg-[#8ec5ff] px-4 py-2 text-sm font-semibold text-[#06111f] transition hover:bg-white">
              {signedIn ? "Open Workspace" : "Start Building"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute left-[-10%] top-[-18%] h-[32rem] w-[32rem] rounded-full bg-cyan-400/15 blur-3xl" aria-hidden />
          <div className="absolute right-[-12%] top-[10%] h-[24rem] w-[24rem] rounded-full bg-orange-400/15 blur-3xl" aria-hidden />
          <div className="absolute bottom-[-15%] left-[28%] h-[20rem] w-[20rem] rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />

          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:py-24 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="relative z-10">
              <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-200">
                AI builder with direct admin backup
              </div>

              <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
                Build the whole product,
                <span className="block bg-gradient-to-r from-cyan-200 via-white to-orange-200 bg-clip-text text-transparent">
                  not just a chat reply.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                WELP now pushes toward the experience you actually asked for: a builder workspace with project files, step-by-step execution, commands, preview notes, and a human admin lane when you need real help.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link to={primaryCta} className="rounded-full bg-[#8ec5ff] px-7 py-3.5 text-sm font-semibold text-[#06111f] transition hover:bg-white">
                  {signedIn ? "Open The Builder" : "Create Account"}
                </Link>
                <Link to={contactCta} className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                  Contact Admin
                </Link>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="text-3xl font-semibold text-cyan-200">{metrics.totalUsers}</div>
                  <div className="mt-1 text-sm text-white/60">registered users</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="text-3xl font-semibold text-orange-200">{metrics.totalBuilds}</div>
                  <div className="mt-1 text-sm text-white/60">builder tasks run</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="text-3xl font-semibold text-emerald-200">{metrics.directSupportThreads}</div>
                  <div className="mt-1 text-sm text-white/60">admin support threads</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="text-3xl font-semibold text-cyan-200">{availability.availableDevelopers}</div>
                  <div className="mt-1 text-sm text-white/60">developers available now</div>
                </div>
              </div>
            </div>

            <div id="builder" className="relative z-10">
              <div className="rounded-[2rem] border border-white/10 bg-[#081220]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.04] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Builder workspace</div>
                    <div className="mt-2 text-xl font-semibold text-white">Project cockpit</div>
                  </div>
                  <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Builder flow
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Plan</div>
                      <div className="mt-3 text-sm text-white/80">AI maps the app shell, stack, routes, and execution order before you even touch the first file.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Files</div>
                      <div className="mt-3 space-y-2 text-sm text-white/80">
                        <div className="rounded-xl bg-white/[0.05] px-3 py-2">src/App.jsx</div>
                        <div className="rounded-xl bg-white/[0.05] px-3 py-2">src/pages/HomePage.jsx</div>
                        <div className="rounded-xl bg-white/[0.05] px-3 py-2">server/routes/build.js</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Support lane</div>
                      <div className="mt-3 text-sm text-white/80">If the build needs human input, contact admin from inside the product and continue from a dedicated inbox.</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#050a12] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Live prompt</div>
                      <div className="text-xs text-zinc-500">$2 builder checkout</div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4 text-sm text-white/80">
                      Build me an admin platform with user analytics, a direct support inbox, and a cleaner dashboard flow.
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-sm font-semibold text-cyan-200">Builder response</div>
                      <div className="mt-3 text-sm leading-relaxed text-white/75">
                        I generated the project brief, starter files, route plan, user analytics schema, and a dedicated inbox flow. Open the builder to inspect the file explorer and build checklist.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-[#08111e]/80 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Workflow</div>
                <h2 className="mt-2 text-3xl font-semibold text-white md:text-4xl">How the new builder works</h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-white/60">
                The goal is to make the product feel less like a chatbot and more like an actual product-building environment with support behind it.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {workflow.map((item, index) => (
                <div key={item.title} className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 shadow-welp ring-1 ring-white/[0.04]">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    0{index + 1}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact-admin" className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-orange-300/10 bg-gradient-to-br from-orange-400/10 via-white/[0.04] to-cyan-300/10 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200/70">Contact admin section</div>
                <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                  Need a human to step in?
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
                  The contact-admin lane is back. Users can open a dedicated support thread, and the admin dashboard now handles those messages in a separate inbox where the admin can select a user and respond cleanly.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link to={contactCta} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-cyan-100">
                    Open Contact Admin
                  </Link>
                  <Link to={primaryCta} className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                    Open Builder
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[#081220]/90 p-8 shadow-welp ring-1 ring-white/[0.04]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Availability</div>
                <div className="mt-4 text-6xl font-semibold text-cyan-200">{availability.availableDevelopers}</div>
                <p className="mt-4 text-white/70">
                  {availability.isAvailable
                    ? `${availability.availableDevelopers} developer${availability.availableDevelopers === 1 ? "" : "s"} currently available`
                    : "No developers are marked available right now"}
                </p>
                <p className="mt-3 text-sm text-white/45">
                  {availableUntilLabel ? `Visible until ${availableUntilLabel}` : "The admin dashboard controls this window live."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
