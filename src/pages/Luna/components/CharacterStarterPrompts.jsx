export function CharacterStarterPrompts({ prompts = [], onSelect }) {
  if (!Array.isArray(prompts) || prompts.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {prompts.slice(0, 4).map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect?.(prompt)}
          className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-2 text-xs text-[#d7e8e5] transition duration-150 hover:-translate-y-0.5 hover:border-[#4f7c75] hover:bg-[#102126]"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
