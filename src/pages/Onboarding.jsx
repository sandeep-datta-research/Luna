import { useNavigate } from "react-router-dom";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#0d0f17] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto w-full max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7a7f9a]">Luna Onboarding</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Personalize your Luna AI</h1>
        <p className="mt-2 text-sm text-[#a8b0d6]">
          Tell Luna what you want so every response feels tailored to you.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <OnboardingFlow onComplete={() => navigate("/chat")} />
      </div>
    </div>
  );
}
