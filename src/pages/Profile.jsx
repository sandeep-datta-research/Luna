import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  ChevronRight,
  Crown,
  Loader2,
  LogOut,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Wallet,
  WandSparkles,
} from "lucide-react";
import { clearStoredUser, fetchApi, getStoredUser, setStoredUser } from "@/lib/api-client";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function statusBadge(status) {
  if (status === "approved") return "border-emerald-400/35 bg-emerald-500/15 text-emerald-300";
  if (status === "rejected") return "border-rose-400/35 bg-rose-500/15 text-rose-300";
  return "border-amber-400/35 bg-amber-500/15 text-amber-300";
}

function MetricCard({ label, value, hint, icon: Icon, tone = "violet" }) {
  const tones = {
    violet: "border-violet-400/20 bg-violet-500/8 text-violet-100",
    cyan: "border-cyan-400/20 bg-cyan-500/8 text-cyan-100",
    emerald: "border-emerald-400/20 bg-emerald-500/8 text-emerald-100",
    amber: "border-amber-400/20 bg-amber-500/8 text-amber-100",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.violet}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/65">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/60">{hint}</p>
    </div>
  );
}

function ActionTile({ to, label, desc, icon: Icon, tone = "violet", onClick }) {
  const tones = {
    violet: "border-violet-400/25 bg-[linear-gradient(180deg,rgba(124,92,255,0.18),rgba(124,92,255,0.07))]",
    cyan: "border-cyan-400/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(34,211,238,0.06))]",
    emerald: "border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(16,185,129,0.06))]",
    amber: "border-amber-400/25 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(245,158,11,0.06))]",
  };

  const className = `group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-white/20 ${tones[tone] || tones.violet}`;
  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-white/45 transition group-hover:translate-x-0.5 group-hover:text-white/80" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs leading-6 text-zinc-300">{desc}</p>
    </>
  );

  if (to) {
    return <Link to={to} className={className}>{content}</Link>;
  }

  return (
    <button type="button" onClick={onClick} className={`${className} text-left`}>
      {content}
    </button>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNote, setPasswordNote] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchApi("/api/profile");
      if (!result.ok) {
        setError(result.message || "Failed to load profile");
        setLoading(false);
        return;
      }

      setProfile(result.data);
      setDisplayName(result.data?.user?.name || "");
      setPictureUrl(result.data?.user?.picture || "");
      setError("");
      setLoading(false);
    };

    load();
  }, []);

  const isGuest = Boolean(profile?.isGuest);
  const user = profile?.user;
  const plan = profile?.membership?.plan === "pro" ? "pro" : "free";
  const usage = profile?.usage;
  const requests = Array.isArray(profile?.upgradeRequests) ? profile.upgradeRequests : [];
  const account = profile?.account || {};

  const providerLabels = useMemo(() => {
    if (!Array.isArray(account.authProviders) || account.authProviders.length === 0) {
      return ["guest"];
    }
    return account.authProviders;
  }, [account.authProviders]);

  const pendingRequests = requests.filter((item) => item.status === "pending").length;

  const handleUploadPicture = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveNote("Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSaveNote("Image too large. Use up to 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (value) {
        setPictureUrl(value);
        setSaveNote("Image selected. Click Save Profile to apply.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (isGuest) {
      setSaveNote("Sign in first to update your profile.");
      return;
    }

    const payload = {
      name: (displayName || "").trim(),
      picture: (pictureUrl || "").trim(),
    };

    if (!payload.name && !payload.picture) {
      setSaveNote("Please enter a name or profile picture.");
      return;
    }

    setSaving(true);
    setSaveNote("");

    const result = await fetchApi("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!result.ok) {
      setSaveNote(result.message || "Failed to update profile.");
      return;
    }

    const updatedUser = result.data?.user || {};
    setProfile((prev) => ({ ...(prev || {}), user: updatedUser }));
    setDisplayName(updatedUser.name || payload.name);
    setPictureUrl(updatedUser.picture || payload.picture);
    setSaveNote("Profile updated successfully.");

    if (typeof window !== "undefined") {
      const current = getStoredUser() || {};
      setStoredUser({
        ...current,
        name: updatedUser.name || payload.name || current?.name || "",
        picture: updatedUser.picture || payload.picture || current?.picture || "",
        email: updatedUser.email || current?.email || "",
      });
    }
  };

  const handleSavePassword = async () => {
    if (isGuest) {
      setPasswordNote("Sign in first to manage your password.");
      return;
    }

    setPasswordSaving(true);
    setPasswordNote("");

    const result = await fetchApi("/api/auth/password/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });

    setPasswordSaving(false);

    if (!result.ok) {
      setPasswordNote(result.message || "Failed to update password.");
      return;
    }

    setProfile((prev) => ({
      ...(prev || {}),
      user: result.data?.user || prev?.user || null,
      account: result.data?.account || prev?.account || {},
    }));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordNote(result.data?.message || "Password updated.");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await fetchApi("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    clearStoredUser();
    setSigningOut(false);
    navigate("/signin");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#07070d] px-4 py-8 text-zinc-100 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(91,61,245,0.18),transparent_32%),radial-gradient(circle_at_78%_22%,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,#07070d,#090912)]" />
      <div className="relative mx-auto max-w-6xl">
        {loading ? <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-zinc-400">Loading profile...</div> : null}
        {error ? <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">{error}</div> : null}

        {!loading && !error ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(145deg,rgba(14,16,28,0.96),rgba(9,10,18,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
              <div className="grid gap-6 px-5 py-6 md:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)] md:px-7 md:py-7">
                <div>
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
                      {pictureUrl || user?.picture ? (
                        <img src={pictureUrl || user?.picture} alt={user?.name || "User"} className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle2 className="h-full w-full text-zinc-500" />
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-zinc-200 backdrop-blur-sm"
                        title="Upload profile picture"
                        disabled={isGuest}
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPicture} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-semibold text-white sm:text-3xl">
                          {user?.name || "Guest User"}
                        </h1>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] ${plan === "pro" ? "border-violet-400/35 bg-violet-500/15 text-violet-200" : "border-zinc-700 bg-zinc-800/80 text-zinc-300"}`}>
                          {plan}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm text-zinc-400">{user?.email || "Not signed in"}</p>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
                        Manage your Luna identity, security, billing status, and workspace shortcuts from one place.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {providerLabels.map((provider) => (
                          <span key={provider} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-zinc-300">
                            {provider}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="Today"
                      value={`${usage?.usedToday ?? 0}`}
                      hint={`Messages on ${usage?.date || "today"}`}
                      icon={MessageSquare}
                      tone="violet"
                    />
                    <MetricCard
                      label="Remaining"
                      value={usage?.unlimited ? "∞" : `${usage?.remainingToday ?? 0}`}
                      hint={usage?.unlimited ? "Pro account active" : `${usage?.dailyLimit ?? 100} per day`}
                      icon={Sparkles}
                      tone="cyan"
                    />
                    <MetricCard
                      label="Security"
                      value={account.hasPassword ? "Ready" : "Add Password"}
                      hint={account.hasPassword ? "Password enabled" : "Recommended for Google users too"}
                      icon={ShieldCheck}
                      tone="emerald"
                    />
                    <MetricCard
                      label="Requests"
                      value={`${pendingRequests}`}
                      hint={pendingRequests ? "Upgrade reviews pending" : "No pending billing reviews"}
                      icon={Wallet}
                      tone="amber"
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,14,24,0.96),rgba(8,10,18,0.96))] p-5">
                  <p className="text-xs uppercase tracking-[0.32em] text-violet-200/70">Quick Tools</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                    <ActionTile to="/chat" label="Open Luna" desc="Jump back into chat with your saved account context." icon={Rocket} tone="violet" />
                    <ActionTile to="/features" label="Explore Features" desc="Review workspace capabilities and new product surfaces." icon={WandSparkles} tone="cyan" />
                    <ActionTile to="/pricing" label="Upgrade Plan" desc="Check Luna Pro pricing, payments, and current request status." icon={Crown} tone="amber" />
                    <ActionTile onClick={handleSignOut} label={signingOut ? "Signing Out..." : "Sign Out"} desc="End the current browser session on this device." icon={LogOut} tone="emerald" />
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
              <section className="space-y-6">
                <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,17,28,0.95),rgba(9,12,18,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Profile Studio</p>
                      <p className="mt-1 text-xs text-zinc-400">Update how your account appears across Luna.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGuest || saving}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-60"
                    >
                      Upload Avatar
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs text-zinc-400">
                      Display name
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={isGuest || saving}
                        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-3 text-sm text-zinc-100 outline-none"
                        placeholder="Enter display name"
                      />
                    </label>

                    <label className="text-xs text-zinc-400">
                      Profile picture URL
                      <input
                        value={pictureUrl}
                        onChange={(e) => setPictureUrl(e.target.value)}
                        disabled={isGuest || saving}
                        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-3 text-sm text-zinc-100 outline-none"
                        placeholder="https://..."
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isGuest || saving}
                      className="inline-flex items-center rounded-xl border border-violet-400/35 bg-violet-500/20 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Profile
                    </button>
                    {isGuest ? <p className="text-xs text-amber-300">Sign in to edit your profile.</p> : null}
                    {saveNote ? <p className="text-xs text-cyan-200">{saveNote}</p> : null}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,17,28,0.95),rgba(9,12,18,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                  <p className="text-sm font-semibold text-white">Account Security</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {account.hasPassword
                      ? "Your account already has a Luna password. Change it below."
                      : "No Luna password is set yet. Add one so you can sign in without Google on this device later."}
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {account.hasPassword ? (
                      <label className="text-xs text-zinc-400 sm:col-span-2">
                        Current password
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          disabled={isGuest || passwordSaving}
                          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-3 text-sm text-zinc-100 outline-none"
                          placeholder="Enter current password"
                        />
                      </label>
                    ) : null}

                    <label className="text-xs text-zinc-400">
                      New password
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isGuest || passwordSaving}
                        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-3 text-sm text-zinc-100 outline-none"
                        placeholder="10+ chars, upper/lowercase + number"
                      />
                    </label>

                    <label className="text-xs text-zinc-400">
                      Confirm password
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isGuest || passwordSaving}
                        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-3 text-sm text-zinc-100 outline-none"
                        placeholder="Repeat password"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSavePassword}
                      disabled={isGuest || passwordSaving}
                      className="inline-flex items-center rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-sm text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-60"
                    >
                      {passwordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {account.hasPassword ? "Update Password" : "Set Password"}
                    </button>
                    {account.passwordUpdatedAt ? (
                      <p className="text-xs text-zinc-500">Last changed {formatDate(account.passwordUpdatedAt)}</p>
                    ) : null}
                    {passwordNote ? <p className="text-xs text-cyan-200">{passwordNote}</p> : null}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-[28px] border border-violet-400/25 bg-[linear-gradient(180deg,rgba(30,20,56,0.92),rgba(16,12,29,0.98))] p-5">
                  <div className="flex items-center gap-2 text-violet-200">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-semibold">Plan & Billing</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">
                    Pay at <span className="font-semibold text-zinc-100">{profile?.billing?.upiId || "9366183700@fam"}</span> and submit the transaction ID from the pricing page. Admin activates Luna Pro manually after review.
                  </p>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-violet-200/70">Current plan</p>
                    <p className="mt-2 text-xl font-semibold text-white">{plan === "pro" ? "Luna Pro" : "Luna Free"}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {plan === "pro" ? "Unlimited daily messages unlocked." : "Upgrade for unlimited usage and future premium features."}
                    </p>
                  </div>
                  <Link to="/pricing" className="mt-4 inline-flex items-center rounded-xl border border-violet-400/35 bg-violet-500/20 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/30">
                    Open Pricing
                  </Link>
                </div>

                <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,17,28,0.95),rgba(9,12,18,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                  <div className="flex items-center gap-2 text-sm text-zinc-100">
                    <Wallet className="h-4 w-4" />
                    Upgrade Requests
                  </div>
                  {requests.length === 0 ? (
                    <p className="mt-3 text-xs text-zinc-500">No requests yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {requests.slice(0, 5).map((item) => (
                        <div key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm text-zinc-100">Txn: {item.transactionId}</p>
                              <p className="mt-1 text-xs text-zinc-500">{formatDate(item.createdAt)}</p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusBadge(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,17,28,0.95),rgba(9,12,18,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                  <div className="flex items-center gap-2 text-sm text-zinc-100">
                    <Sparkles className="h-4 w-4" />
                    Workspace Shortcuts
                  </div>
                  <div className="mt-4 grid gap-3">
                    <ActionTile to="/chat" label="Resume Chat" desc="Continue your latest conversations and saved context." icon={MessageSquare} tone="violet" />
                    <ActionTile to="/features" label="See Product Surface" desc="Review what Luna supports across chat, tools, and UI." icon={WandSparkles} tone="cyan" />
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
