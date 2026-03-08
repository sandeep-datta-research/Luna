import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Crown, Loader2, MessageSquare, ShieldCheck, UserCircle2, Wallet } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function statusBadge(status) {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-300 border-emerald-400/35";
  if (status === "rejected") return "bg-rose-500/15 text-rose-300 border-rose-400/35";
  return "bg-amber-500/15 text-amber-300 border-amber-400/35";
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");
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
      try {
        const raw = localStorage.getItem("luna_google_user");
        const parsed = raw ? JSON.parse(raw) : {};
        const next = {
          ...parsed,
          name: updatedUser.name || payload.name || parsed?.name || "",
          picture: updatedUser.picture || payload.picture || parsed?.picture || "",
          email: updatedUser.email || parsed?.email || "",
        };
        localStorage.setItem("luna_google_user", JSON.stringify(next));
        window.dispatchEvent(new Event("luna-auth-changed"));
      } catch {
        // Ignore local storage sync errors.
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#07070d] px-4 py-8 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">User Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link to="/chat" className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm hover:bg-zinc-800">Open Luna</Link>
            <Link to="/#pricing" className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-2 text-sm text-violet-100 hover:bg-violet-500/30">Upgrade</Link>
          </div>
        </div>

        {loading ? <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-zinc-400">Loading profile...</div> : null}
        {error ? <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">{error}</div> : null}

        {!loading && !error ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="rounded-2xl border border-zinc-800 bg-[linear-gradient(160deg,#131326_0%,#101014_45%,#0d0d12_100%)] p-5 shadow-[0_28px_65px_rgba(0,0,0,0.35)]">
              <div className="flex items-start gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                  {pictureUrl || user?.picture ? (
                    <img src={pictureUrl || user?.picture} alt={user?.name || "User"} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle2 className="h-full w-full text-zinc-500" />
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-200"
                    title="Upload profile picture"
                    disabled={isGuest}
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadPicture}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-white">{user?.name || "Guest User"}</p>
                  <p className="truncate text-sm text-zinc-400">{user?.email || "Not signed in"}</p>
                </div>

                <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${plan === "pro" ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-zinc-700 bg-zinc-800/80 text-zinc-300"}`}>
                  {plan}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-500"><MessageSquare className="h-3.5 w-3.5" />Daily usage</div>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">{usage?.usedToday ?? 0} messages</p>
                  <p className="text-xs text-zinc-500">Date: {usage?.date || "-"}</p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck className="h-3.5 w-3.5" />Limit</div>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">
                    {usage?.unlimited ? "Unlimited" : `${usage?.remainingToday ?? 0} left`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {usage?.unlimited ? "Luna Pro active" : `${usage?.dailyLimit ?? 100} per day`}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-sm font-semibold text-zinc-100">Profile Settings</p>
                <div className="mt-3 grid gap-3">
                  <label className="text-xs text-zinc-400">
                    Username
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isGuest || saving}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
                      placeholder="Enter display name"
                    />
                  </label>

                  <label className="text-xs text-zinc-400">
                    Profile picture URL (optional)
                    <input
                      value={pictureUrl}
                      onChange={(e) => setPictureUrl(e.target.value)}
                      disabled={isGuest || saving}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
                      placeholder="https://..."
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGuest || saving}
                      className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                    >
                      Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isGuest || saving}
                      className="inline-flex items-center rounded-lg border border-violet-400/35 bg-violet-500/20 px-3 py-2 text-xs text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                      Save Profile
                    </button>
                  </div>

                  {isGuest ? <p className="text-xs text-amber-300">Sign in to edit username and profile picture.</p> : null}
                  {saveNote ? <p className="text-xs text-cyan-200">{saveNote}</p> : null}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-violet-400/25 bg-[#120f22] p-4">
                <div className="flex items-center gap-2 text-violet-200"><Crown className="h-4 w-4" />Luna Pro</div>
                <p className="mt-2 text-sm text-zinc-300">Pay at <span className="font-semibold text-zinc-100">{profile?.billing?.upiId || "9366183700@fam"}</span></p>
                <p className="mt-1 text-xs text-zinc-400">Submit transaction id from pricing page. Admin activates manually.</p>
                <Link to="/#pricing" className="mt-3 inline-flex rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs text-violet-100 hover:bg-violet-500/30">
                  Go to Pricing
                </Link>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-zinc-200"><Wallet className="h-4 w-4" />Upgrade Requests</div>
                {requests.length === 0 ? (
                  <p className="text-xs text-zinc-500">No requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {requests.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2 text-xs">
                        <p className="truncate text-zinc-200">Txn: {item.transactionId}</p>
                        <p className="mt-0.5 text-zinc-500">{formatDate(item.createdAt)}</p>
                        <span className={`mt-1 inline-flex rounded-md border px-2 py-0.5 ${statusBadge(item.status)}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}