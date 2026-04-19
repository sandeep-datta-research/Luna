"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, Palette, Users, Cloud, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import GoogleOAuthCard from "@/components/auth/GoogleOAuthCard";
import { fetchApi, setStoredUser } from "@/lib/api-client";

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
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetChallengeToken, setResetChallengeToken] = useState("");
  const [resetVerificationCode, setResetVerificationCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetTokenPreview, setResetTokenPreview] = useState("");
  const [resetCodePreview, setResetCodePreview] = useState("");
  const [mode, setMode] = useState("signin");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const normalizedEmail = (email || "").trim().toLowerCase();
      const displayName = normalizedEmail.split("@")[0] || "Luna User";

      const result = await fetchApi("/api/auth/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, name: displayName, password }),
      });

      if (!result.ok || !result.data?.token || !result.data?.user) {
        setErrorMessage(result.message || "Unable to sign in. Please try again.");
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        setStoredUser(result.data.user);
      }

      setLoading(false);
      navigate("/profile");
    } catch (error) {
      setErrorMessage(error?.message || "Unable to sign in. Please try again.");
      setLoading(false);
    }
  };

  const handleRequestReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setNoticeMessage("");
    setResetChallengeToken("");
    setResetVerificationCode("");
    setResetTokenPreview("");
    setResetCodePreview("");

    try {
      const result = await fetchApi("/api/auth/password/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: (resetEmail || "").trim().toLowerCase() }),
      });

      if (!result.ok) {
        setErrorMessage(result.message || "Unable to start reset.");
        setLoading(false);
        return;
      }

      setNoticeMessage(result.data?.message || "Reset verification started.");
      setResetChallengeToken(result.data?.resetToken || "");
      setResetTokenPreview(result.data?.resetTokenPreview || "");
      setResetCodePreview(result.data?.resetCodePreview || "");
      setMode("reset-confirm");
      setLoading(false);
    } catch (error) {
      setErrorMessage(error?.message || "Unable to start reset.");
      setLoading(false);
    }
  };

  const handleConfirmReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      if (!(resetChallengeToken || "").trim()) {
        throw new Error("Start the reset flow again to get a fresh verification code.");
      }

      const result = await fetchApi("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: (resetEmail || "").trim().toLowerCase(),
          token: (resetChallengeToken || "").trim(),
          verificationCode: (resetVerificationCode || "").trim(),
          newPassword: resetPassword,
          confirmPassword: resetConfirmPassword,
        }),
      });

      if (!result.ok || !result.data?.user) {
        setErrorMessage(result.message || "Unable to reset password.");
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        setStoredUser(result.data.user);
      }

      setLoading(false);
      navigate("/profile");
    } catch (error) {
      setErrorMessage(error?.message || "Unable to reset password.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070d] p-4 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(91,61,245,0.2),transparent_45%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.15),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.09),transparent_55%)]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl py-4 sm:py-6">
        <div className="overflow-hidden rounded-[32px] border border-zinc-800/80 bg-zinc-950/70 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="grid min-h-[unset] lg:min-h-[720px] lg:grid-cols-2">
            <section className="relative m-3 rounded-3xl border border-violet-300/20 bg-gradient-to-br from-[#1d1135] via-[#120f24] to-[#09090f] p-6 text-zinc-100 sm:m-4 sm:p-8 lg:p-10">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold tracking-[0.2em] text-violet-100">LUNA</h1>
                <Link to="/" className="text-sm text-zinc-300 hover:text-white">
                  Back Home
                </Link>
              </div>

              <div className="mt-8 sm:mt-10 lg:mt-12">
                <h2 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">Chat and Learn</h2>
                <p className="mt-4 max-w-md text-sm text-zinc-300 sm:text-base">
                  Sign in to continue building your Luna workspace with polished UI, model routing,
                  and synced history.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:mt-10 sm:gap-4 lg:space-y-5">
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

            <section className="flex items-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-7 text-center sm:mb-8">
                  <h3 className="text-[1.75rem] font-semibold text-white sm:text-3xl">Welcome Back</h3>
                  <p className="mt-2 text-sm text-zinc-400">Sign in to continue your Luna journey</p>
                </div>

                <div className="mb-5 flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setErrorMessage("");
                      setNoticeMessage("");
                      setResetChallengeToken("");
                      setResetVerificationCode("");
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 ${mode === "signin" ? "bg-violet-500/25 text-violet-100" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset-request");
                      setErrorMessage("");
                      setNoticeMessage("");
                      setResetChallengeToken("");
                      setResetVerificationCode("");
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 ${mode !== "signin" ? "bg-violet-500/25 text-violet-100" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    Reset password
                  </button>
                </div>

                {mode === "signin" ? (
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
                  {errorMessage ? (
                    <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                      {errorMessage}
                    </div>
                  ) : null}
                  {noticeMessage ? (
                    <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                      {noticeMessage}
                    </div>
                  ) : null}
                </form>
                ) : null}

                {mode === "reset-request" ? (
                  <form onSubmit={handleRequestReset} className="space-y-5">
                    <div>
                      <label htmlFor="reset-email" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-300">
                        Account email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="reset-email"
                          type="email"
                          value={resetEmail}
                          onChange={(event) => setResetEmail(event.target.value)}
                          required
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 py-3 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-violet-400/70"
                          placeholder="you@example.com"
                        />
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
                          <span className="ml-2">Starting reset...</span>
                        </>
                      ) : (
                        "Send reset code"
                      )}
                    </button>

                    <p className="text-xs text-zinc-500">
                      If email delivery is configured, Luna will send a 6-digit verification code. Otherwise the reset challenge and code are shown below for now.
                    </p>
                    {errorMessage ? <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</div> : null}
                    {noticeMessage ? <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{noticeMessage}</div> : null}
                    {resetTokenPreview ? (
                      <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                        Dev reset challenge: <span className="font-semibold">{resetTokenPreview}</span>
                      </div>
                    ) : null}
                    {resetCodePreview ? (
                      <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                        Dev email code: <span className="font-semibold">{resetCodePreview}</span>
                      </div>
                    ) : null}
                  </form>
                ) : null}

                {mode === "reset-confirm" ? (
                  <form onSubmit={handleConfirmReset} className="space-y-5">
                    <div>
                      <label htmlFor="reset-confirm-email" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-300">
                        Account email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="reset-confirm-email"
                          type="email"
                          value={resetEmail}
                          onChange={(event) => setResetEmail(event.target.value)}
                          required
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 py-3 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-violet-400/70"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reset-verification-code" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-300">
                        Verification code
                      </label>
                      <input
                        id="reset-verification-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={resetVerificationCode}
                        onChange={(event) => setResetVerificationCode(event.target.value)}
                        required
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-violet-400/70"
                        placeholder="Enter the 6-digit code from your email"
                      />
                    </div>

                    <div>
                      <label htmlFor="reset-password" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-300">
                        New password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="reset-password"
                          type="password"
                          value={resetPassword}
                          onChange={(event) => setResetPassword(event.target.value)}
                          required
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 py-3 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-violet-400/70"
                          placeholder="At least 10 chars, upper/lowercase + number"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reset-confirm-password" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-300">
                        Confirm new password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          id="reset-confirm-password"
                          type="password"
                          value={resetConfirmPassword}
                          onChange={(event) => setResetConfirmPassword(event.target.value)}
                          required
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 py-3 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-violet-400/70"
                        />
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
                          <span className="ml-2">Resetting password...</span>
                        </>
                      ) : (
                        "Confirm reset"
                      )}
                    </button>
                    {errorMessage ? <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</div> : null}
                    {noticeMessage ? <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{noticeMessage}</div> : null}
                    {!resetChallengeToken ? (
                      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                        This reset session expired in the browser. Start the reset flow again to get a fresh email code.
                      </div>
                    ) : null}
                  </form>
                ) : null}

                <div className="relative my-6 text-center text-xs text-zinc-500">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-700" />
                  </div>
                  <span className="relative bg-zinc-950 px-2">Or continue with Google</span>
                </div>

                <GoogleOAuthCard onSignedIn={() => navigate("/profile")} />

                <p className="mt-4 text-center text-xs text-zinc-500">
                  Google users can sign in first, then set a Luna password from Profile.
                </p>

                <p className="mt-6 text-center text-sm text-zinc-400">
                  Already signed in?{" "}
                  <Link to="/profile" className="text-violet-300 hover:text-violet-200">
                    Open profile
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
