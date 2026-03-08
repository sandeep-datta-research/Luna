import { Download, Home, Menu, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import ChatSidebar from "@/components/ui/chat/ChatSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function IconButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default function ChatHeader({
  title,
  isMobileSidebarOpen,
  onMobileSidebarOpenChange,
  sidebarProps,
  onExportConversation,
  onClearConversation,
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-[#111214]/95 px-4 py-3 backdrop-blur-xl sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <Sheet open={isMobileSidebarOpen} onOpenChange={onMobileSidebarOpenChange}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 md:hidden"
              aria-label="Open chat history"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[84vw] border-zinc-800 bg-[#151617] p-0 sm:max-w-xs">
            <ChatSidebar {...sidebarProps} onNavigate={() => onMobileSidebarOpenChange(false)} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-zinc-100 sm:text-lg">{title || "Luna"}</h1>
          <p className="text-xs text-zinc-400 sm:text-sm">Luna AI chat</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <IconButton onClick={onExportConversation} label="Export current chat">
          <Download className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={onClearConversation} label="Clear current chat">
          <RotateCcw className="h-4 w-4" />
        </IconButton>
        <Link
          to="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          aria-label="Go home"
          title="Go home"
        >
          <Home className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
