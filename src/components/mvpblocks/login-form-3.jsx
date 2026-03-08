"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, Palette, Users, Cloud, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import GoogleOAuthCard from "@/components/auth/GoogleOAuthCard";

const featureItems = [
  {
    icon: Palette,
    title: "Advanced Design Tools",
    desc: "Professional-grade tools for every project",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Work together seamlessly in real-time",
  },
  {
    icon: Cloud,
    title: "Cloud Sync",
    desc: "Access your workspace from anywhere",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    desc: "Bank-level security for your data",
  },
];

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (typeof window !== "undefined") {
        const normalizedEmail = (email || "").trim().toLowerCase();
        if (normalizedEmail) {
          const existingToken = (localStorage.getItem("luna_auth_token") || "").trim();
          const nextToken = existingToken || `local_${Date.now()}`;
          const displayName = normalizedEmail.split("@")[0] || "Luna User";
          localStorage.setItem("luna_google_user", JSON.stringify({ name: displayName, email: normalizedEmail }));
          localStorage.setItem("luna_auth_token", nextToken);
          window.dispatchEvent(new Event("luna-auth-changed"));
        }
      }

      setLoading(false);
      navigate("/chat");
    }, 700);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070d] p-4 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(91,61,245,0.2),transparent_45%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.15),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.09),transparent_55%)]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl py-6">
        <div className="overflow-hidden rounded-[32px] border border-zinc-800/80 bg-zinc-950/70 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="grid min-h-[720px] lg:grid-cols-2">
            <section className="relative m-4 rounded-3xl border border-violet-300/20 bg-gradient-to-br from-[#1d1135] via-[#120f24] to-[#09090f] p-10 text-zinc-100">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold tracking-[0.2em] text-violet-100">LUNA</h1>
                <Link to="/" className="text-sm text-zinc-300 hover:text-white">
                  Back Home
                </Link>
              </div>

              <div className="mt-12">
                <h2 className="text-4xl font-semibold leading-tight sm:text-5xl">Chat and Learn</h2>
                <p className="mt-4 max-w-md text-sm text-zinc-300 sm:text-base">
                  Sign in to continue building your Luna workspace with polished UI, model routing,
                  and synced history.
                </p>
              </div>

              <div className="mt-10 space-y-5">
                {featureItems.map((feature) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div key={feature.title} className="flex items-start gap-3 rounded-xl border border-zinc-700/70 bg-zinc-900/35 px-3 py-3">
                      <div className="mt-0.5 rounded-lg border border-violet-300/35 bg-violet-400/20 p-2 text-violet-200">
                        <FeatureIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{feature.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">{feature.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="flex items-center px-6 py-10 sm:px-10">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-8 text-center">
                  <h3 className="text-3xl font-semibold text-white">Welcome Back</h3>
                  <p className="mt-2 text-sm text-zinc-400">Sign in to continue your Luna journey</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-300">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 py-3 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-violet-400/70"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-300">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 py-3 pl-10 pr-11 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-violet-400/70"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2">Signing in...</span>
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </button>
                </form>

                <div className="relative my-6 text-center text-xs text-zinc-500">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-700" />
                  </div>
                  <span className="relative bg-zinc-950 px-2">Or continue with Google</span>
                </div>

                <GoogleOAuthCard />

                <p className="mt-6 text-center text-sm text-zinc-400">
                  Already signed in?{" "}
                  <Link to="/chat" className="text-violet-300 hover:text-violet-200">
                    Open Luna chat
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
