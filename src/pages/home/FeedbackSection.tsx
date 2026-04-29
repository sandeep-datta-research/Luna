import { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { SectionSkeleton } from "./SectionSkeleton";
import { hoverFloat } from "./constants";
import { FeedbackForm, Testimonial } from "./types";

const TestimonialsCarousel = lazy(() => import("@/components/mvpblocks/testimonials-carousel"));

interface FeedbackSectionProps {
  feedbackForm: FeedbackForm;
  setFeedbackForm: React.Dispatch<React.SetStateAction<FeedbackForm>>;
  feedbackBusy: boolean;
  feedbackNote: string;
  handleFeedbackSubmit: (event: React.FormEvent) => Promise<void>;
  carouselTestimonials: Testimonial[];
  compact?: boolean;
}

export function FeedbackSection({
  feedbackForm,
  setFeedbackForm,
  feedbackBusy,
  feedbackNote,
  handleFeedbackSubmit,
  carouselTestimonials,
  compact = false,
}: FeedbackSectionProps) {
  return (
    <motion.section
      {...(compact ? {} : hoverFloat)}
      className={`rounded-3xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 ${compact ? "px-4 py-5" : "px-6 py-6 sm:px-8"}`}
    >
      <h2 className="text-lg font-semibold text-white">Feedback</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Share your experience. Admin can feature selected feedback in the carousel below.
      </p>

      <form onSubmit={handleFeedbackSubmit} className={`mt-5 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <label className="text-xs text-zinc-400">
          Name
          <input
            value={feedbackForm.name}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your name"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="text-xs text-zinc-400">
          Email
          <input
            value={feedbackForm.email}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className={`text-xs text-zinc-400 ${compact ? "" : "sm:col-span-2"}`}>
          Feedback
          <textarea
            value={feedbackForm.message}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="Tell us what to improve in Luna..."
            className="mt-1 min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="text-xs text-zinc-400">
          Rating
          <select
            value={feedbackForm.rating}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          >
            <option value={5}>5 - Excellent</option>
            <option value={4}>4 - Good</option>
            <option value={3}>3 - Average</option>
            <option value={2}>2 - Needs work</option>
            <option value={1}>1 - Poor</option>
          </select>
        </label>

        <div className={`flex items-end ${compact ? "" : "justify-end sm:col-span-1"}`}>
          <button
            type="submit"
            disabled={feedbackBusy}
            className="rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
          >
            {feedbackBusy ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>

        {feedbackNote ? <p className={`${compact ? "" : "sm:col-span-2"} text-xs text-cyan-200`}>{feedbackNote}</p> : null}
      </form>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40">
        <Suspense fallback={<SectionSkeleton compact={compact} className="rounded-2xl border-0 bg-transparent" />}>
          <TestimonialsCarousel
            testimonials={carouselTestimonials}
            title="Luna Community"
            subtitle="Featured feedback selected by admin."
            autoplaySpeed={3600}
            className={compact ? "py-8" : "py-10 md:py-14"}
          />
        </Suspense>
      </div>
    </motion.section>
  );
}
