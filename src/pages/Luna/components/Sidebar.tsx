import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  PenSquare,
  Search,
  Settings,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
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
    <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] p-3`}>
      {user.picture ? (
        <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/10">
          <img src={user.picture} alt={user.name} className="h-full w-full object-cover" />
        </span>
      ) : (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#142428] text-[#dceae7]">
          <UserCircle2 className="h-5 w-5" />
        </span>
      )}
      {!collapsed ? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#eef6f3]">{user.name}</p>
          <p className="truncate text-[11px] text-[#7f9792]">{user.email}</p>
        </div>
      ) : null}
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
  const desktopWidth = isSidebarOpen ? "w-[288px]" : "w-[92px]";

  return (
    <>
      <aside
        className={`hidden ${desktopWidth} border-r border-white/6 bg-[linear-gradient(180deg,#071317,#09191d)] md:flex md:min-h-[100dvh] md:flex-col`}
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className={`flex min-w-0 items-center gap-3 ${isSidebarOpen ? "" : "w-full justify-center"}`}>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#102126] shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
                <img src={brandLogo} alt="Luna logo" className="h-full w-full object-cover" />
              </span>
              {isSidebarOpen ? (
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7d9993]">Workspace</p>
                  <h1 className="truncate text-xl font-semibold text-[#f6fbfa]" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Luna
                  </h1>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#294249] bg-[#102126] text-[#d7ebe7] transition hover:border-[#7fc7ba]/70 ${isSidebarOpen ? "" : "mx-auto"}`}
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          {isSidebarOpen ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8682]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search saved chats"
                className="w-full rounded-[20px] border border-white/8 bg-[#0c171a] py-3 pl-11 pr-4 text-sm text-[#edf5f2] outline-none transition focus:border-[#7fc7ba]/70"
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
              <div className="flex h-full flex-col overflow-hidden rounded-[26px] border border-white/6 bg-[#0a1417]/90">
                <div className="border-b border-white/6 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#76918b]">Recent Chats</p>
                </div>
                <div className="luna-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
                  {historyLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="rounded-[18px] border border-white/5 bg-white/[0.02] p-3">
                        <Skeleton width="78%" height="14px" />
                        <div className="mt-2">
                          <Skeleton width="40%" height="10px" />
                        </div>
                      </div>
                    ))
                  ) : historyList.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-white/10 px-4 py-5 text-sm text-[#7c928d]">
                      No chats yet. Start a new thread.
                    </div>
                  ) : (
                    historyList.map((session) => {
                      const active = session.id === activeSession?.id;
                      return (
                        <div
                          key={session.id}
                          className={`group relative rounded-[18px] border p-3 transition ${
                            active
                              ? "border-[#7fc7ba]/40 bg-[linear-gradient(180deg,#102126,#0f1d21)] shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                              : "border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                          }`}
                        >
                          <button type="button" onClick={() => handleSelectSession(session.id)} className="block w-full pr-8 text-left">
                            <p className="truncate text-sm font-medium text-[#ecf5f2]">{session.title}</p>
                            <p className="mt-1 text-[11px] text-[#78918b]">{formatHistoryTime(session.updatedAt)}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-[#91ada7] opacity-0 transition hover:bg-white/[0.06] hover:text-white group-hover:opacity-100"
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
            ) : (
              <div className="flex h-full flex-col items-center gap-3 pt-2">
                {historyList.slice(0, 6).map((session) => {
                  const active = session.id === activeSession?.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className={`h-10 w-10 rounded-2xl border transition ${active ? "border-[#7fc7ba]/50 bg-[#143038]" : "border-white/8 bg-white/[0.03] hover:border-white/14"}`}
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
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <motion.aside
              initial={{ x: -32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -32, opacity: 0 }}
              className="flex h-full w-[92vw] max-w-[360px] flex-col bg-[linear-gradient(180deg,#071317,#0a191d)] p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#102126]">
                    <img src={brandLogo} alt="Luna logo" className="h-full w-full object-cover" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#7d9993]">Workspace</p>
                    <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Luna</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#294249] bg-[#102126] text-[#dcece8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8682]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search saved chats"
                  className="w-full rounded-[20px] border border-white/8 bg-[#0c171a] py-3 pl-11 pr-4 text-sm text-[#edf5f2] outline-none transition focus:border-[#7fc7ba]/70"
                />
              </div>

              <div className="space-y-2">
                <SidebarButton icon={PenSquare} label="New Chat" onClick={() => { createFreshSession(); setMobileSidebarOpen(false); }} />
                <SidebarButton icon={Home} label="Home" onClick={() => { navigate("/"); setMobileSidebarOpen(false); }} />
                <SidebarButton icon={Settings} label="Settings" onClick={() => { navigate("/profile"); setMobileSidebarOpen(false); }} />
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[26px] border border-white/6 bg-[#0a1417]/90">
                <div className="border-b border-white/6 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#76918b]">Recent Chats</p>
                </div>
                <div className="luna-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
                  {historyLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="rounded-[18px] border border-white/5 bg-white/[0.02] p-3">
                        <Skeleton width="78%" height="14px" />
                        <div className="mt-2">
                          <Skeleton width="40%" height="10px" />
                        </div>
                      </div>
                    ))
                  ) : historyList.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-white/10 px-4 py-5 text-sm text-[#7c928d]">
                      No chats yet. Start a new thread.
                    </div>
                  ) : (
                    historyList.map((session) => {
                      const active = session.id === activeSession?.id;
                      return (
                        <div
                          key={session.id}
                          className={`group relative rounded-[18px] border p-3 transition ${
                            active
                              ? "border-[#7fc7ba]/40 bg-[linear-gradient(180deg,#102126,#0f1d21)]"
                              : "border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectSession(session.id);
                              setMobileSidebarOpen(false);
                            }}
                            className="block w-full pr-8 text-left"
                          >
                            <p className="truncate text-sm font-medium text-[#ecf5f2]">{session.title}</p>
                            <p className="mt-1 text-[11px] text-[#78918b]">{formatHistoryTime(session.updatedAt)}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-[#91ada7] hover:bg-white/[0.06] hover:text-white"
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
