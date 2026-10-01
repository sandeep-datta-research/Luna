import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Home, PenSquare, Search, Settings, Trash2, UserCircle2, X } from "lucide-react";
import { SidebarButton } from "./SidebarButton";
import { formatHistoryTime } from "../utils";
import { Skeleton } from "./Skeleton";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  brandLogo: string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  navigate: (path: string) => void;
  createFreshSession: () => void;
  historyList: any[];
  activeSession: any;
  handleSelectSession: (id: string) => void;
  handleDeleteSession: (id: string) => void;
  user: any;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (val: boolean) => void;
  historyLoading?: boolean;
}

function ProfileBlock({ user, collapsed = false }) {
  return (
    <div className={`flex items-center rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-surface)] p-3 ${collapsed ? "justify-center" : "gap-3"}`}>
      {user.picture ? (
        <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-[#294249]">
          <img src={user.picture} alt={user.name} className="h-full w-full object-cover" />
        </span>
      ) : (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--luna-border-strong)] bg-[var(--luna-panel)] text-[var(--luna-text)]">
          <UserCircle2 className="h-5 w-5" />
        </span>
      )}

      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--luna-text)]">{user.name}</p>
          <p className="truncate text-xs text-[var(--luna-muted)]">{user.email}</p>
        </div>
      ) : null}
    </div>
  );
}

function HistoryList({ historyLoading = false, historyList, activeSession, handleSelectSession, handleDeleteSession }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-bg-soft)]">
      <div className="border-b border-[var(--luna-border)] px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--luna-subtle)]">Recent chats</p>
      </div>
      <div className="luna-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        {historyLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-surface)] p-3">
              <Skeleton width="76%" height="14px" />
              <div className="mt-2">
                <Skeleton width="42%" height="10px" />
              </div>
            </div>
          ))
        ) : historyList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--luna-border-strong)] px-4 py-5 text-sm text-[var(--luna-muted)]">
            No chats yet. Start a new thread.
          </div>
        ) : (
          historyList.map((session) => {
            const active = session.id === activeSession?.id;
            return (
              <div
                key={session.id}
                className={`group relative rounded-2xl border p-3 ${active ? "border-[var(--luna-accent)] bg-[var(--luna-panel-raised)]" : "border-[var(--luna-border)] bg-[var(--luna-surface)] hover:border-[var(--luna-border-strong)] hover:bg-[var(--luna-panel)]"}`}
              >
                <button type="button" onClick={() => handleSelectSession(session.id)} className="block w-full pr-9 text-left">
                  <p className="truncate text-sm font-medium text-[var(--luna-text)]">{session.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--luna-muted)]">{formatHistoryTime(session.updatedAt)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSession(session.id)}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-[var(--luna-subtle)] transition hover:bg-[var(--luna-panel-raised)] hover:text-[var(--luna-text)]"
                  title="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  brandLogo,
  searchQuery,
  setSearchQuery,
  navigate,
  createFreshSession,
  historyList,
  activeSession,
  handleSelectSession,
  handleDeleteSession,
  user,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  historyLoading = false,
}: SidebarProps) {
  const desktopWidth = isSidebarOpen ? "w-[300px]" : "w-[96px]";

  return (
    <>
      <aside className={`hidden ${desktopWidth} border-r border-[var(--luna-border)] bg-[var(--luna-shell-soft)] md:flex md:min-h-[100dvh] md:flex-col`}>
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className={`flex min-w-0 items-center gap-3 ${isSidebarOpen ? "" : "w-full justify-center"}`}>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--luna-border-strong)] bg-[var(--luna-panel)]">
                <img src={brandLogo} alt="Luna logo" className="h-full w-full object-cover" />
              </span>
              {isSidebarOpen ? (
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--luna-subtle)]">Workspace</p>
                  <h1 className="truncate text-xl font-semibold text-[var(--luna-text)]" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Luna
                  </h1>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--luna-border-strong)] bg-[var(--luna-panel)] text-[var(--luna-text)] ${isSidebarOpen ? "" : "mx-auto"}`}
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          {isSidebarOpen ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea5a0]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search chats"
                className="w-full rounded-xl border border-[var(--luna-border)] bg-[var(--luna-surface)] py-3 pl-11 pr-4 text-sm text-[var(--luna-text)] outline-none focus:border-[var(--luna-accent)]"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <SidebarButton icon={PenSquare} label="New Chat" collapsed={!isSidebarOpen} onClick={() => createFreshSession()} />
            <SidebarButton icon={Home} label="Home" collapsed={!isSidebarOpen} onClick={() => navigate("/")} />
            <SidebarButton icon={Settings} label="Settings" collapsed={!isSidebarOpen} onClick={() => navigate("/profile")} />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {isSidebarOpen ? (
              <HistoryList
                historyLoading={historyLoading}
                historyList={historyList}
                activeSession={activeSession}
                handleSelectSession={handleSelectSession}
                handleDeleteSession={handleDeleteSession}
              />
            ) : (
              <div className="flex h-full flex-col items-center gap-3 pt-2">
                {historyList.slice(0, 6).map((session) => {
                  const active = session.id === activeSession?.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className={`h-10 w-10 rounded-2xl border ${active ? "border-[#7fc7ba]/50 bg-[#143038]" : "border-[#294249] bg-[#102126]"}`}
                      title={session.title}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <ProfileBlock user={user} collapsed={!isSidebarOpen} />
        </div>
      </aside>

      <AnimatePresence>
        {mobileSidebarOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <motion.aside
              initial={{ x: -24 }}
              animate={{ x: 0 }}
              exit={{ x: -24 }}
              className="flex h-full w-[92vw] max-w-[360px] flex-col border-r border-[var(--luna-border)] bg-[var(--luna-shell-soft)] p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-[var(--luna-border-strong)] bg-[var(--luna-panel)]">
                    <img src={brandLogo} alt="Luna logo" className="h-full w-full object-cover" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--luna-subtle)]">Workspace</p>
                    <h2 className="text-lg font-semibold text-[var(--luna-text)]" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Luna
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#294249] bg-[#102126] text-[#e5f1ee]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea5a0]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chats"
                  className="w-full rounded-xl border border-[var(--luna-border)] bg-[var(--luna-surface)] py-3 pl-11 pr-4 text-sm text-[var(--luna-text)] outline-none focus:border-[var(--luna-accent)]"
                />
              </div>

              <div className="space-y-2">
                <SidebarButton icon={PenSquare} label="New Chat" onClick={() => { createFreshSession(); setMobileSidebarOpen(false); }} />
                <SidebarButton icon={Home} label="Home" onClick={() => { navigate("/"); setMobileSidebarOpen(false); }} />
                <SidebarButton icon={Settings} label="Settings" onClick={() => { navigate("/profile"); setMobileSidebarOpen(false); }} />
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-hidden">
                <HistoryList
                  historyLoading={historyLoading}
                  historyList={historyList}
                  activeSession={activeSession}
                  handleSelectSession={(id) => {
                    handleSelectSession(id);
                    setMobileSidebarOpen(false);
                  }}
                  handleDeleteSession={handleDeleteSession}
                />
              </div>

              <div className="mt-4">
                <ProfileBlock user={user} />
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
