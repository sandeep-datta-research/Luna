import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Crown, QrCode, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

const FALLBACK_UPI_ID = "9366183700@fam";
const FALLBACK_PRICE_INR = 90;

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

export default function SimplePricing() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [txId, setTxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitNote, setSubmitNote] = useState("");
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    const result = await fetchApi("/api/profile");
    if (!result.ok) {
      setError(result.message || "Failed to load profile");
      setLoading(false);
      return;
    }

    setProfile(result.data);
    setError("");
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);


  const isGuest = Boolean(profile?.isGuest);
  const currentPlan = profile?.membership?.plan === "pro" ? "pro" : "free";
  const upiId = profile?.billing?.upiId || FALLBACK_UPI_ID;
  const priceInr = Number(profile?.billing?.monthlyPriceInr || FALLBACK_PRICE_INR);
  const requests = Array.isArray(profile?.upgradeRequests) ? profile.upgradeRequests : [];

  useEffect(() => {
    if (currentPlan === "pro") {
      setShowPaymentPanel(false);
    }
  }, [currentPlan]);

  const upiLink = useMemo(() => {
    const params = new URLSearchParams({
      pa: upiId,
      pn: "Luna AI",
      am: String(priceInr),
      cu: "INR",
      tn: "Luna Pro Upgrade",
    });

    return `upi://pay?${params.toString()}`;
  }, [priceInr, upiId]);

  const qrUrl = useMemo(
    () => `https://quickchart.io/qr?size=220&text=${encodeURIComponent(upiLink)}`,
    [upiLink],
  );

  const handleUpgradeSubmit = async (event) => {
    event.preventDefault();
    const transactionId = txId.trim();

    if (isGuest) {
      setSubmitNote("Sign in first, then submit your payment transaction id.");
      return;
    }

    if (transactionId.length < 6) {
      setSubmitNote("Enter a valid transaction id / UPI reference.");
      return;
    }

    setSubmitting(true);
    setSubmitNote("");

    const result = await fetchApi("/api/payments/upgrade-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, amountInr: priceInr }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setSubmitNote(result.message || "Failed to submit request.");
      return;
    }

    setSubmitNote("Payment proof submitted. Admin will activate Luna Pro after verification.");
    setTxId("");
    await loadProfile();
  };

  return (
    <section className="relative overflow-hidden px-4 py-16 text-zinc-100 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(82,39,255,0.18),transparent_48%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-500/10 px-4 py-1 text-xs text-violet-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Luna Plans
          </motion.div>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Free for everyone, Pro for power users</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Free users get up to 100 messages/day. Luna Pro gives unlimited usage and priority access.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/70 p-2">
                <ShieldCheck className="h-5 w-5 text-zinc-200" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Luna Free</h3>
                <p className="text-sm text-zinc-400">Ideal for daily use</p>
              </div>
            </div>

            <div className="mt-5 text-3xl font-bold text-white">Rs 0</div>
            <ul className="mt-5 space-y-3 text-sm text-zinc-300">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-300" />100 messages/day</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-300" />Chat history sync</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-300" />Google sign-in support</li>
            </ul>
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
              Current plan: <span className="font-medium text-zinc-200">{currentPlan === "free" ? "Free" : "Pro"}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-violet-400/35 bg-gradient-to-b from-[#16112a] to-[#0f0f16] p-6 shadow-[0_24px_90px_-55px_rgba(91,61,245,0.95)]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-violet-300/30 bg-violet-500/20 p-2">
                <Crown className="h-5 w-5 text-violet-200" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Luna Pro</h3>
                <p className="text-sm text-zinc-300">Manual activation by admin after payment verification</p>
              </div>
            </div>

            <div className="mt-5 flex items-end gap-2">
              <span className="text-4xl font-bold text-white">Rs {priceInr}</span>
              <span className="pb-1 text-sm text-zinc-300">/ month</span>
            </div>

            <ul className="mt-5 space-y-3 text-sm text-zinc-200">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-300" />Unlimited messages/day</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-300" />Priority provider routing</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-300" />Dedicated admin support</li>
            </ul>

            <div className="mt-5">
              {currentPlan === "pro" ? (
                <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  Luna Pro is already active on your account.
                </div>
              ) : !showPaymentPanel ? (
                <button
                  type="button"
                  onClick={() => setShowPaymentPanel(true)}
                  className="inline-flex items-center rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/30"
                >
                  Buy Now
                </button>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                  <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/70 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
                      <QrCode className="h-3.5 w-3.5" />
                      Scan UPI QR
                    </div>
                    <img
                      src={qrUrl}
                      alt="Luna Pro UPI QR"
                      className="h-[180px] w-[180px] rounded-md border border-zinc-700 bg-white p-1"
                    />
                  </div>

                  <div className="space-y-3 rounded-xl border border-zinc-700/80 bg-zinc-950/70 p-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Wallet className="h-4 w-4 text-violet-300" />
                      Pay to <span className="font-semibold text-zinc-100">{upiId}</span>
                    </div>

                    <form onSubmit={handleUpgradeSubmit} className="space-y-2">
                      <label htmlFor="txn-id" className="text-xs text-zinc-400">
                        After payment, enter transaction id / UPI reference
                      </label>
                      <input
                        id="txn-id"
                        value={txId}
                        onChange={(e) => setTxId(e.target.value)}
                        placeholder="e.g. 405012349887"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                      />

                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? "Submitting..." : "Submit payment proof"}
                      </button>
                    </form>

                    {isGuest ? (
                      <p className="text-xs text-amber-300">
                        Sign in to submit payment proof. <Link to="/signin" className="underline">Open sign in</Link>
                      </p>
                    ) : null}

                    {submitNote ? <p className="text-xs text-cyan-200">{submitNote}</p> : null}
                    {error ? <p className="text-xs text-amber-300">{error}</p> : null}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h4 className="text-sm font-semibold text-zinc-100">Your upgrade requests</h4>
          {loading ? <p className="mt-2 text-xs text-zinc-500">Loading...</p> : null}

          {!loading && requests.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">No payment requests submitted yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {requests.slice(0, 6).map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-zinc-200">Txn: {item.transactionId}</p>
                    <p className="text-zinc-500">Submitted: {formatDate(item.createdAt)}</p>
                  </div>
                  <span className={`inline-flex w-fit rounded-md border px-2 py-1 text-[11px] font-medium ${statusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
