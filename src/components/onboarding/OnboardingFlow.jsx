/**
 * SUPABASE SETUP (required)
 * 1. Go to https://supabase.com and create a new project.
 * 2. In the SQL editor, run the migration below to create `users_memory`.
 * 3. Enable Row Level Security (RLS) on the table.
 * 4. Add RLS policy: users can only read/write their own row.
 * 5. Copy SUPABASE_URL and SUPABASE_ANON_KEY from project settings.
 * 6. Add to .env:
 *    VITE_SUPABASE_URL=your_project_url
 *    VITE_SUPABASE_ANON_KEY=your_anon_key
 * 7. Install Supabase client: npm install @supabase/supabase-js
 *
 * SQL Migration:
 * create table if not exists public.users_memory (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id text not null,
 *   goals text[] default '{}',
 *   subjects text[] default '{}',
 *   response_style text default 'Detailed',
 *   favorite_topics text[] default '{}',
 *   learning_level text default 'Beginner',
 *   created_at timestamp with time zone default now(),
 *   updated_at timestamp with time zone default now()
 * );
 * create unique index if not exists users_memory_user_id_key on public.users_memory (user_id);
 *
 * -- If you previously created user_id with a foreign key, run this once:
 * alter table public.users_memory drop constraint if exists users_memory_user_id_fkey;
 * alter table public.users_memory alter column user_id type text using user_id::text;
 *
 * -- RLS
 * alter table public.users_memory enable row level security;
 * -- If you are using Luna's own auth (not Supabase auth), use the service role key
 * -- on the backend OR create permissive policies:
 * create policy "Allow server access"
 *   on public.users_memory for all
 *   using (true)
 *   with check (true);
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchApi } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";

const STEP_DEFINITIONS = [
  {
    id: "goals",
    title: "What are your goals?",
    type: "multi",
    options: ["Learn faster", "Build projects", "Improve writing", "Prepare for exams", "Career growth", "Daily productivity"],
  },
  {
    id: "subjects",
    title: "What subjects interest you?",
    type: "multi",
    options: ["AI & ML", "Programming", "Design", "Business", "Science", "Math", "Languages"],
  },
  {
    id: "response_style",
    title: "How do you prefer responses?",
    type: "single",
    options: ["Short", "Detailed", "Step by step"],
  },
  {
    id: "favorite_topics",
    title: "What are your favorite topics?",
    type: "multi",
    options: ["Productivity", "Startups", "Research", "Storytelling", "Career advice", "Learning hacks", "Tech news"],
  },
  {
    id: "learning_level",
    title: "What is your learning level?",
    type: "single",
    options: ["Beginner", "Intermediate", "Advanced"],
  },
];

const DEFAULT_ANSWERS = {
  goals: [],
  subjects: [],
  response_style: "Detailed",
  favorite_topics: [],
  learning_level: "Beginner",
};

const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

export default function OnboardingFlow({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let mounted = true;

    const resolveUserId = async () => {
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (mounted && data?.user?.id) {
          setUserId(data.user.id);
          return;
        }
      }

      const result = await fetchApi("/api/auth/me");
      if (mounted && result.ok && result.data?.user?.id) {
        setUserId(result.data.user.id);
      }
    };

    resolveUserId();
    return () => {
      mounted = false;
    };
  }, []);

  const step = STEP_DEFINITIONS[stepIndex];
  const totalSteps = STEP_DEFINITIONS.length;
  const progress = useMemo(() => ((stepIndex + 1) / totalSteps) * 100, [stepIndex, totalSteps]);

  const toggleMulti = (key, value) => {
    setAnswers((prev) => {
      const current = new Set(prev[key]);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [key]: Array.from(current) };
    });
  };

  const setSingle = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setStatus("");

    const payload = {
      user_id: userId,
      goals: answers.goals,
      subjects: answers.subjects,
      response_style: answers.response_style,
      favorite_topics: answers.favorite_topics,
      learning_level: answers.learning_level,
    };

    const result = await fetchApi("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStatus(result.message || "Failed to save onboarding.");
      return;
    }

    setStatus("Onboarding saved. Luna will personalize your experience.");
    onComplete?.();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-[#2a2d45] bg-[#121625]/90 p-6 text-[#e9ecff] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#7a7f9a]">
          <span>Step {stepIndex + 1} of {totalSteps}</span>
          <button type="button" onClick={handleSkip} className="text-[#9aa3c7] hover:text-white">Skip</button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1c2135]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#5b6af5] to-[#7c3aed]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step.id} variants={cardVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
          <h2 className="text-xl font-semibold text-white">{step.title}</h2>
          <div className="flex flex-wrap gap-2">
            {step.options.map((option) => {
              const isActive =
                step.type === "multi"
                  ? answers[step.id].includes(option)
                  : answers[step.id] === option;

              return (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  key={option}
                  type="button"
                  onClick={() => {
                    if (step.type === "multi") toggleMulti(step.id, option);
                    else setSingle(step.id, option);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    isActive
                      ? "border-[#5b6af5] bg-[#2a2f50] text-white shadow-[0_0_18px_rgba(91,106,245,0.25)]"
                      : "border-[#2a2d45] bg-[#151a2d] text-[#c7ccee] hover:border-[#5b6af5]/70"
                  }`}
                >
                  {option}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {status ? <p className="text-sm text-[#9aa3c7]">{status}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="rounded-full border border-[#2a2d45] px-4 py-2 text-sm text-[#c7ccee] transition hover:border-[#5b6af5] disabled:opacity-40"
        >
          Back
        </button>

        {stepIndex < totalSteps - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-full bg-gradient-to-r from-[#5b6af5] to-[#7c3aed] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(91,106,245,0.35)]"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={submitting}
            className="rounded-full bg-gradient-to-r from-[#5b6af5] to-[#7c3aed] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(91,106,245,0.35)] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}
