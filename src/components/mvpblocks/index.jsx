import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Crown, Megaphone, RefreshCw, Save, Shield, ShieldAlert, SlidersHorizontal, Sparkles, Users, WandSparkles, XCircle } from "lucide-react";
import { fetchApi, getStoredUser, hydrateUser } from "@/lib/api-client";
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
    links: [{ label: "Pricing", href: "/pricing", ariaLabel: "View pricing" }],
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

function AdminShellSection({ title, icon: Icon, description, actions = null, children, className = "" }) {
  return (
    <section className={`mb-6 overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,21,35,0.96),rgba(12,14,24,0.94))] shadow-[0_28px_80px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="border-b border-white/6 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-white">
              {Icon ? <Icon className="h-5 w-5 text-violet-300" /> : null}
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
          </div>
          {actions}
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function AdminMetricCard({ label, value, tone = "default", hint }) {
  const toneClass = {
    default: "text-white",
    violet: "text-violet-200",
    emerald: "text-emerald-200",
    amber: "text-amber-200",
  }[tone] || "text-white";

  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
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
  const [announcements, setAnnouncements] = useState([]);
  const [announcementId, setAnnouncementId] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementVariant, setAnnouncementVariant] = useState("info");
  const [announcementStartAt, setAnnouncementStartAt] = useState("");
  const [announcementEndAt, setAnnouncementEndAt] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementCtaLabel, setAnnouncementCtaLabel] = useState("");
  const [announcementCtaHref, setAnnouncementCtaHref] = useState("");
  const [announcementNote, setAnnouncementNote] = useState("");

  const isAllowed = useMemo(() => ALLOWED_ADMIN_EMAILS.has(normalizeEmail(userEmail)), [userEmail]);
  const modelUsageEntries = useMemo(() => {
    const counts = overview?.modelUsage?.counts || {};
    return Object.entries(counts).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
  }, [overview]);
  const featuredFeedbackCount = useMemo(
    () => feedbackItems.filter((item) => item.featured).length,
    [feedbackItems],
  );

  const isReferralExpired = (expiresAt) => {
    if (!expiresAt) return false;
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return true;
    return date.getTime() < new Date().getTime();
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

  const resetAnnouncementForm = () => {
    setAnnouncementId("");
    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setAnnouncementVariant("info");
    setAnnouncementStartAt("");
    setAnnouncementEndAt("");
    setAnnouncementActive(true);
    setAnnouncementCtaLabel("");
    setAnnouncementCtaHref("");
  };

  const loadAnnouncementForm = (item) => {
    setAnnouncementId(item?.id || "");
    setAnnouncementTitle(item?.title || "");
    setAnnouncementMessage(item?.message || "");
    setAnnouncementVariant(item?.variant || "info");
    setAnnouncementStartAt(item?.startAt ? item.startAt.slice(0, 16) : "");
    setAnnouncementEndAt(item?.endAt ? item.endAt.slice(0, 16) : "");
    setAnnouncementActive(item?.active !== false);
    setAnnouncementCtaLabel(item?.ctaLabel || "");
    setAnnouncementCtaHref(item?.ctaHref || "");
  };

  const loadAdminData = useCallback(async () => {
    setLoadingData(true);
    setError("");

    const [overviewRes, usersRes, reqRes, settingsRes, feedbackRes, announcementsRes] = await Promise.all([
      fetchApi("/api/admin/overview"),
      fetchApi("/api/admin/users"),
      fetchApi("/api/admin/upgrade-requests"),
      fetchApi("/api/admin/settings"),
      fetchApi("/api/admin/feedback"),
      fetchApi("/api/admin/announcements"),
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
    setAnnouncements(Array.isArray(announcementsRes.data?.announcements) ? announcementsRes.data.announcements : []);

    if (settingsRes.ok) {
      applySettings(settingsRes.data?.settings || {});
    }

    setLoadingData(false);
  }, []);

  useEffect(() => {
    const boot = async () => {
      await hydrateUser();
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

      const me = await fetchApi("/api/auth/me");
      if (!me.ok || !me.data?.user) {
        setAuthState("signin");
        return;
      }

      setAuthState("allowed");
      await loadAdminData();
    };

    boot();
  }, [loadAdminData]);

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

  const saveAnnouncement = async () => {
    const title = announcementTitle.trim();
    const message = announcementMessage.trim();
    if (!title || !message) {
      setAnnouncementNote("Title and message are required.");
      return;
    }

    setSettingsBusy(true);
    setAnnouncementNote("");

    const payload = {
      title,
      message,
      variant: announcementVariant,
      startAt: announcementStartAt ? new Date(announcementStartAt).toISOString() : "",
      endAt: announcementEndAt ? new Date(announcementEndAt).toISOString() : "",
      active: announcementActive,
      ctaLabel: announcementCtaLabel.trim(),
      ctaHref: announcementCtaHref.trim(),
    };

    const result = announcementId
      ? await fetchApi(`/api/admin/announcements/${announcementId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetchApi("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSettingsBusy(false);

    if (!result.ok) {
      setAnnouncementNote(result.message || "Failed to save announcement.");
      return;
    }

    setAnnouncementNote(announcementId ? "Announcement updated." : "Announcement created.");
    resetAnnouncementForm();
    await loadAdminData();
  };

  const toggleAnnouncement = async (id, active) => {
    setSettingsBusy(true);
    setAnnouncementNote("");

    const result = await fetchApi(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });

    setSettingsBusy(false);
    if (!result.ok) {
      setAnnouncementNote(result.message || "Failed to update announcement.");
      return;
    }

    await loadAdminData();
  };

  const deleteAnnouncement = async (id) => {
    setSettingsBusy(true);
    setAnnouncementNote("");

    const result = await fetchApi(`/api/admin/announcements/${id}`, {
      method: "DELETE",
    });

    setSettingsBusy(false);
    if (!result.ok) {
      setAnnouncementNote(result.message || "Failed to delete announcement.");
      return;
    }

    if (announcementId === id) {
      resetAnnouncementForm();
    }
    await loadAdminData();
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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,61,245,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]" />
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

      <main className="relative px-4 pb-8 pt-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,rgba(28,19,51,0.95),rgba(14,17,30,0.94)_50%,rgba(8,28,40,0.94))] px-5 py-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-violet-100">
                  <Shield className="h-3.5 w-3.5" />
                  Admin Control Center
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Luna Admin Dashboard</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                  Track revenue, moderate requests, update messaging, and tune the Pro experience from one operational workspace.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Signed in</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{userEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={loadAdminData}
                  disabled={loadingData || actionBusy}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-zinc-100 transition hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <AdminMetricCard label="Users" value={overview?.users ?? 0} hint="Total accounts tracked" />
              <AdminMetricCard label="Pro Users" value={overview?.proUsers ?? 0} tone="violet" hint="Active premium members" />
              <AdminMetricCard label="Revenue" value={`Rs ${overview?.revenueInr ?? 0}`} tone="emerald" hint="Captured upgrade revenue" />
              <AdminMetricCard label="Pending" value={overview?.pendingUpgradeRequests ?? 0} tone="amber" hint="Requests needing review" />
              <AdminMetricCard label="Featured Feedback" value={featuredFeedbackCount} hint="Visible testimonials" />
            </div>
          </div>

          {error ? <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{error}</div> : null}

          <AdminShellSection
            title="Pro Controls"
            icon={SlidersHorizontal}
            description="Adjust pricing and response behavior for premium users."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
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

              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
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
          </AdminShellSection>
          <AdminShellSection
            title="Referral Codes"
            icon={Shield}
            description="Launch discount campaigns and track referral usage."
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
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

              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
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
                        <div key={ref.id || ref.code} className="rounded-xl border border-white/6 bg-black/20 p-3">
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
          </AdminShellSection>

          <AdminShellSection
            title="Announcements & Alerts"
            icon={Megaphone}
            description="Control banners, promos, and time-bound notices shown inside Luna."
          >
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-zinc-200">Create announcement</p>
                <div className="mt-3 grid gap-3">
                  <input
                    value={announcementTitle}
                    onChange={(event) => setAnnouncementTitle(event.target.value)}
                    placeholder="Title (e.g. Pro discount weekend)"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                  <textarea
                    value={announcementMessage}
                    onChange={(event) => setAnnouncementMessage(event.target.value)}
                    placeholder="Write the announcement details"
                    className="min-h-[90px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={announcementVariant}
                      onChange={(event) => setAnnouncementVariant(event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                    >
                      <option value="info">Info</option>
                      <option value="event">Event</option>
                      <option value="discount">Discount</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                      <input
                        type="checkbox"
                        checked={announcementActive}
                        onChange={(event) => setAnnouncementActive(event.target.checked)}
                        className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900"
                      />
                      Active
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="datetime-local"
                      value={announcementStartAt}
                      onChange={(event) => setAnnouncementStartAt(event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <input
                      type="datetime-local"
                      value={announcementEndAt}
                      onChange={(event) => setAnnouncementEndAt(event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={announcementCtaLabel}
                      onChange={(event) => setAnnouncementCtaLabel(event.target.value)}
                      placeholder="CTA label (optional)"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <input
                      value={announcementCtaHref}
                      onChange={(event) => setAnnouncementCtaHref(event.target.value)}
                      placeholder="CTA link (optional)"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={saveAnnouncement}
                    disabled={settingsBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-400/35 bg-violet-500/20 px-3 py-2 text-xs text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {announcementId ? "Update" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={resetAnnouncementForm}
                    disabled={settingsBusy}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    Clear
                  </button>
                </div>
                {announcementNote ? <p className="mt-2 text-xs text-cyan-200">{announcementNote}</p> : null}
              </div>

              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-zinc-200">Live announcements</p>
                {announcements.length === 0 ? (
                  <p className="mt-3 text-xs text-zinc-500">No announcements scheduled.</p>
                ) : (
                  <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                    {announcements.map((item) => (
                      <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-zinc-100">{item.title}</p>
                            <p className="text-xs text-zinc-500">{item.message}</p>
                            <p className="mt-1 text-[11px] text-zinc-600">
                              {item.variant || "info"} • {formatDate(item.startAt)} {item.endAt ? `→ ${formatDate(item.endAt)}` : ""}
                            </p>
                          </div>
                          <span className={`rounded-md border px-2 py-1 text-[11px] ${item.active ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200" : "border-zinc-700 bg-zinc-800 text-zinc-300"}`}>
                            {item.active ? "Active" : "Paused"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={settingsBusy}
                            onClick={() => loadAnnouncementForm(item)}
                            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={settingsBusy}
                            onClick={() => toggleAnnouncement(item.id, !item.active)}
                            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                          >
                            {item.active ? "Disable" : "Activate"}
                          </button>
                          <button
                            type="button"
                            disabled={settingsBusy}
                            onClick={() => deleteAnnouncement(item.id)}
                            className="rounded-md border border-rose-400/35 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AdminShellSection>

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

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Model Usage</h2>
              {modelUsageEntries.length === 0 ? (
                <p className="text-sm text-zinc-500">No model usage recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {modelUsageEntries.map(([llm, count]) => (
                    <div key={llm} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm">
                      <span className="truncate text-zinc-200">{llm}</span>
                      <span className="text-xs text-zinc-400">{count} replies</span>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-zinc-500">
                    Total assistant replies: {overview?.modelUsage?.totalAssistantMessages ?? 0}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Provider Status</h2>
              {overview?.providerStatus?.length ? (
                <div className="space-y-2">
                  {overview.providerStatus.map((provider) => (
                    <div key={provider.llm} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm">
                      <span className="text-zinc-200">{provider.llm}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${provider.configured ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>
                        {provider.configured ? "Configured" : "Missing key"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Provider status unavailable.</p>
              )}
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
