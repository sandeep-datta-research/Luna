import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Crown, RefreshCw, Save, Shield, ShieldAlert, SlidersHorizontal, Users, WandSparkles, XCircle } from "lucide-react";
import { fetchApi, getAuthToken, getStoredUser } from "@/lib/api-client";
import CardNav from "@/component/CardNav";
import logo from "@/assets/luna-logo.svg";

const ALLOWED_ADMIN_EMAILS = new Set([
  "seiuasatou@gmail.com",
  "sandeepdatta866@gmail.com",
]);

const ADMIN_NAV_ITEMS = [
  {
    label: "Home",
    bgColor: "#0D0716",
    textColor: "#fff",
    links: [{ label: "Home", href: "/", ariaLabel: "Go home" }],
  },
  {
    label: "Features",
    bgColor: "#170D27",
    textColor: "#fff",
    links: [{ label: "Features", href: "/#features", ariaLabel: "View features" }],
  },
  {
    label: "Pricing",
    bgColor: "#1E1630",
    textColor: "#fff",
    links: [{ label: "Pricing", href: "/#pricing", ariaLabel: "View pricing" }],
  },
  {
    label: "Profile",
    bgColor: "#2A203B",
    textColor: "#fff",
    links: [{ label: "My Profile", href: "/profile", ariaLabel: "Open profile" }],
  },
  {
    label: "Luna",
    bgColor: "#33224A",
    textColor: "#fff",
    links: [{ label: "Open Chat", href: "/chat", ariaLabel: "Open chat" }],
  },
  {
    label: "Admin",
    icon: Shield,
    bgColor: "#3B2552",
    textColor: "#fff",
    links: [{ label: "Dashboard", href: "/admin", ariaLabel: "Open admin dashboard" }],
  },
];

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusBadge(status) {
  if (status === "approved") return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200";
  if (status === "rejected") return "border-rose-400/35 bg-rose-500/15 text-rose-200";
  return "border-amber-400/35 bg-amber-500/15 text-amber-200";
}

function AccessCard({ title, description, email }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07070d] px-4 text-zinc-200">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950/80 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
        <div className="mb-4 inline-flex rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-rose-300">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
        {email ? <p className="mt-1 text-xs text-zinc-500">Signed in as: {email}</p> : null}
        <div className="mt-6 flex gap-3">
          <Link to="/signin" className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
            Go to Sign In
          </Link>
          <Link to="/" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
            Back Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AdminDashboard() {
  const [authState, setAuthState] = useState("loading");
  const [userEmail, setUserEmail] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [settings, setSettings] = useState({ proMonthlyPriceInr: 90, proSystemPrompt: "", updatedAt: "" });
  const [proPriceInput, setProPriceInput] = useState("90");
  const [proPromptInput, setProPromptInput] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsNote, setSettingsNote] = useState("");
  const [referralCodes, setReferralCodes] = useState([]);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralPercentInput, setReferralPercentInput] = useState("10");
  const [referralExpiryInput, setReferralExpiryInput] = useState("");
  const [referralActiveInput, setReferralActiveInput] = useState(true);
  const [referralNote, setReferralNote] = useState("");

  const isAllowed = useMemo(() => ALLOWED_ADMIN_EMAILS.has(normalizeEmail(userEmail)), [userEmail]);

  const isReferralExpired = (expiresAt) => {
    if (!expiresAt) return false;
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return true;
    return date.getTime() < Date.now();
  };

  const applySettings = (rawSettings) => {
    const price = Number(rawSettings?.proMonthlyPriceInr || 90);
    const prompt = typeof rawSettings?.proSystemPrompt === "string" ? rawSettings.proSystemPrompt : "";
    const referrals = Array.isArray(rawSettings?.referralCodes) ? rawSettings.referralCodes : [];

    setSettings({
      proMonthlyPriceInr: Number.isFinite(price) && price > 0 ? price : 90,
      proSystemPrompt: prompt,
      updatedAt: rawSettings?.updatedAt || "",
      updatedBy: rawSettings?.updatedBy || "",
    });
    setProPriceInput(String(Number.isFinite(price) && price > 0 ? price : 90));
    setProPromptInput(prompt);
    setReferralCodes(referrals);
  };

  const loadAdminData = async () => {
    setLoadingData(true);
    setError("");

    const [overviewRes, usersRes, reqRes, settingsRes, feedbackRes] = await Promise.all([
      fetchApi("/api/admin/overview"),
      fetchApi("/api/admin/users"),
      fetchApi("/api/admin/upgrade-requests"),
      fetchApi("/api/admin/settings"),
      fetchApi("/api/admin/feedback"),
    ]);

    if (!overviewRes.ok) {
      setError(overviewRes.message || "Cannot load admin overview");
      setLoadingData(false);
      return;
    }

    setOverview(overviewRes.data?.stats || null);
    setUsers(Array.isArray(usersRes.data?.users) ? usersRes.data.users : []);
    setRequests(Array.isArray(reqRes.data?.requests) ? reqRes.data.requests : []);
    setFeedbackItems(Array.isArray(feedbackRes.data?.feedback) ? feedbackRes.data.feedback : []);

    if (settingsRes.ok) {
      applySettings(settingsRes.data?.settings || {});
    }

    setLoadingData(false);
  };

  useEffect(() => {
    const boot = async () => {
      const localUser = getStoredUser();
      const email = normalizeEmail(localUser?.email);
      setUserEmail(email);

      if (!email) {
        setAuthState("signin");
        return;
      }

      if (!ALLOWED_ADMIN_EMAILS.has(email)) {
        setAuthState("denied");
        return;
      }

      const token = getAuthToken();
      if (!token) {
        setAuthState("signin");
        return;
      }

      const me = await fetchApi("/api/auth/me");
      if (!me.ok || !me.data?.user) {
        setAuthState("signin");
        return;
      }

      setAuthState("allowed");
      await loadAdminData();
    };

    boot();
  }, []);

  const reviewRequest = async (id, status) => {
    setActionBusy(true);
    const result = await fetchApi(`/api/admin/upgrade-requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActionBusy(false);

    if (!result.ok) {
      setError(result.message || "Failed to update request");
      return;
    }

    await loadAdminData();
  };

  const changeUserPlan = async (userId, plan) => {
    setActionBusy(true);
    const result = await fetchApi(`/api/admin/users/${userId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    setActionBusy(false);

    if (!result.ok) {
      setError(result.message || "Failed to update user plan");
      return;
    }

    await loadAdminData();
  };

  const setFeedbackFeatured = async (feedbackId, featured) => {
    setActionBusy(true);
    const result = await fetchApi(`/api/admin/feedback/${feedbackId}/featured`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured }),
    });
    setActionBusy(false);

    if (!result.ok) {
      setError(result.message || "Failed to update feedback visibility");
      return;
    }

    setFeedbackItems((prev) => prev.map((item) => (item.id === feedbackId ? result.data?.feedback || item : item)));
  };

  const saveProPrice = async () => {
    const amountInr = Number(proPriceInput);
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      setSettingsNote("Enter a valid Pro price.");
      return;
    }

    setSettingsBusy(true);
    setSettingsNote("");

    const result = await fetchApi("/api/admin/settings/pro-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountInr }),
    });

    setSettingsBusy(false);
    if (!result.ok) {
      setSettingsNote(result.message || "Failed to update Pro price.");
      return;
    }

    applySettings(result.data?.settings || {});
    setSettingsNote("Pro price updated successfully.");
    await loadAdminData();
  };

  const saveProPrompt = async () => {
    setSettingsBusy(true);
    setSettingsNote("");

    const result = await fetchApi("/api/admin/settings/pro-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proSystemPrompt: proPromptInput }),
    });

    setSettingsBusy(false);
    if (!result.ok) {
      setSettingsNote(result.message || "Failed to update Pro prompt.");
      return;
    }

    applySettings(result.data?.settings || {});
    setSettingsNote("Pro custom prompt saved. It now applies to Pro users only.");
  };

    const saveReferral = async () => {
    const code = referralCodeInput.trim();
    const discountPercent = Number(referralPercentInput);
    const expiresAt = referralExpiryInput ? new Date(referralExpiryInput).toISOString() : "";

    if (!code) {
      setReferralNote("Enter a referral code.");
      return;
    }

    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 90) {
      setReferralNote("Discount must be between 1 and 90.");
      return;
    }

    if (!expiresAt) {
      setReferralNote("Select an expiry date/time.");
      return;
    }

    setSettingsBusy(true);
    setReferralNote("");

    const result = await fetchApi("/api/admin/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        discountPercent,
        expiresAt,
        active: referralActiveInput,
      }),
    });

    setSettingsBusy(false);

    if (!result.ok) {
      setReferralNote(result.message || "Failed to save referral code.");
      return;
    }

    applySettings(result.data?.settings || {});
    setReferralNote("Referral code saved.");
    setReferralCodeInput("");
    setReferralPercentInput("10");
    setReferralExpiryInput("");
  };

  const toggleReferral = async (code, active) => {
    setSettingsBusy(true);
    setReferralNote("");

    const result = await fetchApi(`/api/admin/referrals/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });

    setSettingsBusy(false);

    if (!result.ok) {
      setReferralNote(result.message || "Failed to update referral.");
      return;
    }

    applySettings(result.data?.settings || {});
  };

  const deleteReferral = async (code) => {
    setSettingsBusy(true);
    setReferralNote("");

    const result = await fetchApi(`/api/admin/referrals/${encodeURIComponent(code)}`, {
      method: "DELETE",
    });

    setSettingsBusy(false);

    if (!result.ok) {
      setReferralNote(result.message || "Failed to remove referral.");
      return;
    }

    applySettings(result.data?.settings || {});
  };

  if (authState === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-[#07070d] text-zinc-300">Checking admin access...</main>;
  }

  if (authState === "signin") {
    return (
      <AccessCard
        title="Admin Login Required"
        description="Please sign in with an authorized admin Google account to open the dashboard."
      />
    );
  }

  if (!isAllowed || authState === "denied") {
    return (
      <AccessCard
        title="Access Denied"
        description="This admin dashboard is restricted to selected accounts only."
        email={userEmail}
      />
    );
  }

  return (
    <div className="dark min-h-screen bg-[#07070d] text-zinc-100">
      <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#07070d]/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <CardNav
            logo={logo}
            logoAlt="Luna Logo"
            items={ADMIN_NAV_ITEMS}
            className="w-full"
            ease="power3.out"
            baseColor="#09090f"
            menuColor="#f4f4f5"
            buttonBgColor="#5B3DF5"
            buttonTextColor="#ffffff"
          />
        </div>
      </nav>

      <main className="px-4 pb-6 pt-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">Luna Admin Dashboard</h1>
              <p className="mt-1 text-sm text-zinc-400">Live data from users, chats, and payment requests.</p>
            </div>
            <button
              type="button"
              onClick={loadAdminData}
              disabled={loadingData || actionBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {error ? <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{error}</div> : null}

          <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <SlidersHorizontal className="h-5 w-5 text-violet-300" />
              Pro Controls
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm font-medium text-zinc-200">Pro plan monthly price (INR)</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={proPriceInput}
                    onChange={(e) => setProPriceInput(e.target.value)}
                    className="w-36 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={saveProPrice}
                    disabled={settingsBusy || loadingData || actionBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-400/35 bg-violet-500/20 px-3 py-2 text-sm text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />Update Price
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm font-medium text-zinc-200">Custom Luna prompt for Pro users</p>
                <p className="mt-1 text-xs text-zinc-500">Only active for Pro plan chats.</p>
                <textarea
                  value={proPromptInput}
                  onChange={(e) => setProPromptInput(e.target.value)}
                  placeholder="Example: Give concise bullet answers with practical next steps."
                  className="mt-3 min-h-[110px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={saveProPrompt}
                    disabled={settingsBusy || loadingData || actionBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
                  >
                    <WandSparkles className="h-4 w-4" />Save Prompt
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
              <span>Current: Rs {settings.proMonthlyPriceInr}/month</span>
              <span>{settings.updatedAt ? `Updated: ${formatDate(settings.updatedAt)}` : "Not updated yet"}</span>
            </div>
            {settingsNote ? <p className="mt-2 text-xs text-cyan-200">{settingsNote}</p> : null}
          </section>          <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Shield className="h-5 w-5 text-violet-200" />
              Referral Codes
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm font-medium text-zinc-200">Create referral code</p>
                <div className="mt-3 grid gap-3">
                  <input
                    value={referralCodeInput}
                    onChange={(event) => setReferralCodeInput(event.target.value.toUpperCase())}
                    placeholder="e.g. LUNA10"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={referralPercentInput}
                      onChange={(event) => setReferralPercentInput(event.target.value)}
                      placeholder="Discount %"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <input
                      type="datetime-local"
                      value={referralExpiryInput}
                      onChange={(event) => setReferralExpiryInput(event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={referralActiveInput}
                      onChange={(event) => setReferralActiveInput(event.target.checked)}
                      className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900"
                    />
                    Active on creation
                  </label>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={saveReferral}
                    disabled={settingsBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-400/35 bg-violet-500/20 px-3 py-2 text-xs text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />Save Code
                  </button>
                </div>

                {referralNote ? <p className="mt-2 text-xs text-cyan-200">{referralNote}</p> : null}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm font-medium text-zinc-200">Active referral codes</p>
                {referralCodes.length === 0 ? (
                  <p className="mt-3 text-xs text-zinc-500">No referral codes yet.</p>
                ) : (
                  <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                    {referralCodes.map((ref) => {
                      const expired = isReferralExpired(ref.expiresAt);
                      const statusLabel = expired ? "Expired" : ref.active ? "Active" : "Paused";
                      const statusClass = expired
                        ? "border-rose-400/35 bg-rose-500/15 text-rose-200"
                        : ref.active
                          ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
                          : "border-amber-400/35 bg-amber-500/15 text-amber-200";

                      return (
                        <div key={ref.id || ref.code} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm text-zinc-100">{ref.code}</p>
                              <p className="text-xs text-zinc-500">
                                {ref.discountPercent}% off - Expires {formatDate(ref.expiresAt) || "-"} - Used {ref.usageCount || 0}x
                              </p>
                              {ref.lastUsedAt ? (
                                <p className="text-[11px] text-zinc-600">Last used: {formatDate(ref.lastUsedAt)}</p>
                              ) : null}
                            </div>
                            <span className={`rounded-md border px-2 py-1 text-[11px] ${statusClass}`}>{statusLabel}</span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={settingsBusy}
                              onClick={() => toggleReferral(ref.code, !ref.active)}
                              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                            >
                              {ref.active ? "Disable" : "Activate"}
                            </button>
                            <button
                              type="button"
                              disabled={settingsBusy}
                              onClick={() => deleteReferral(ref.code)}
                              className="rounded-md border border-rose-400/35 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-500">Users</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.users ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-500">Pro Users</p>
              <p className="mt-1 text-2xl font-semibold text-violet-200">{overview?.proUsers ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-500">Revenue (INR)</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-200">Rs {overview?.revenueInr ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-500">Pending Requests</p>
              <p className="mt-1 text-2xl font-semibold text-amber-200">{overview?.pendingUpgradeRequests ?? 0}</p>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1fr]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Upgrade Requests</h2>
              {requests.length === 0 ? <p className="text-sm text-zinc-500">No upgrade requests found.</p> : null}
              <div className="space-y-2">
                {requests.map((item) => (
                  <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-zinc-200">{item.userName || item.userEmail || item.userId}</p>
                        <p className="text-xs text-zinc-500">Txn: {item.transactionId} | Rs {item.amountInr}</p>
                        <p className="text-xs text-zinc-600">{formatDate(item.createdAt)}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-xs ${statusBadge(item.status)}`}>{item.status}</span>
                    </div>

                    {item.status === "pending" ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => reviewRequest(item.id, "approved")}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => reviewRequest(item.id, "rejected")}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-400/35 bg-rose-500/15 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/25 disabled:opacity-60"
                        >
                          <XCircle className="h-3.5 w-3.5" />Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Users & Plan Control</h2>
              {users.length === 0 ? <p className="text-sm text-zinc-500">No users available.</p> : null}
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-200">{user.name || "Unnamed user"}</p>
                        <p className="truncate text-xs text-zinc-500">{user.email || user.id}</p>
                        <p className="mt-1 text-xs text-zinc-600">Usage today: {user.usageToday ?? 0}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-xs ${user.plan === "pro" ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-zinc-700 bg-zinc-800 text-zinc-300"}`}>
                        {user.plan}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionBusy || user.plan === "pro"}
                        onClick={() => changeUserPlan(user.id, "pro")}
                        className="inline-flex items-center gap-1 rounded-md border border-violet-400/35 bg-violet-500/15 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/25 disabled:opacity-60"
                      >
                        <Crown className="h-3.5 w-3.5" />Set Pro
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy || user.plan === "free"}
                        onClick={() => changeUserPlan(user.id, "free")}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-60"
                      >
                        <Users className="h-3.5 w-3.5" />Set Free
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Feedback Carousel Control</h2>
            {feedbackItems.length === 0 ? <p className="text-sm text-zinc-500">No feedback submitted yet.</p> : null}
            <div className="space-y-2">
              {feedbackItems.slice(0, 80).map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-200">{item.name || "Luna User"}</p>
                      <p className="text-xs text-zinc-500">{item.email || item.userId || "Guest"}</p>
                      <p className="mt-1 text-sm text-zinc-300">{item.message}</p>
                      <p className="mt-1 text-xs text-zinc-500">Rating: {item.rating}/5 | {formatDate(item.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => setFeedbackFeatured(item.id, !item.featured)}
                      className={`rounded-md border px-2 py-1 text-xs ${item.featured ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200" : "border-zinc-700 bg-zinc-800 text-zinc-200"} disabled:opacity-60`}
                    >
                      {item.featured ? "Featured" : "Show in Carousel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-500">
            <p>Approved requests contribute to revenue. Pro activation can also be manually toggled per user.</p>
            <p className="mt-1">Signed in admin: {userEmail}</p>
          </div>
        </div>
      </main>
    </div>
  );
}








