import { cn } from "@/lib/utils";

function buildGradientStops(colors) {
  const safe = Array.isArray(colors) && colors.length > 0 ? colors : ["#5227FF", "#FF9FFC", "#B19EEF"];

  if (safe[0] === safe[safe.length - 1]) {
    return safe;
  }

  return [...safe, safe[0]];
}

export default function GradientText({
  colors = ["#5227FF", "#FF9FFC", "#B19EEF"],
  animationSpeed = 8,
  showBorder = false,
  className,
  children,
}) {
  const gradientStops = buildGradientStops(colors);

  return (
    <span
      className={cn(
        "gradient-text-visible inline-block",
        showBorder ? "rounded-xl border border-white/15 px-3 py-1" : null,
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradientStops.join(", ")})`,
        animationDuration: `${animationSpeed}s`,
      }}
    >
      {children}
    </span>
  );
}
