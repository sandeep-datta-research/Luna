import { MessageSquareText, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function formatConversationDate(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function ChatSidebar({
  className,
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onNavigate,
}) {
  return (
    <aside className={cn("flex h-full flex-col bg-[#151617]", className)}>
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Workspace</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-100">Luna</h2>
        </div>

        <button
          type="button"
          onClick={onCreateConversation}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeConversationId;

          return (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-1 rounded-xl border px-2 py-1.5 transition",
                isActive
                  ? "border-zinc-700 bg-zinc-800/90"
                  : "border-transparent hover:border-zinc-800 hover:bg-zinc-800/70",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectConversation(conversation.id);
                  onNavigate?.();
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-zinc-100">
                  {conversation.title || "New chat"}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-400">
                  {formatConversationDate(conversation.updatedAt)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onDeleteConversation(conversation.id)}
                className="rounded-md p-1.5 text-zinc-500 opacity-0 transition hover:bg-zinc-700 hover:text-zinc-300 group-hover:opacity-100"
                aria-label="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <MessageSquareText className="h-3.5 w-3.5" />
          <span>History stored locally</span>
        </div>
      </div>
    </aside>
  );
}
