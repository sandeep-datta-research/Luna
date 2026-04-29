import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Home, 
  PenSquare, 
  Settings, 
  Trash2, 
  UserCircle2, 
  X 
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
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden h-full flex-col overflow-hidden border-r border-white/6 bg-[linear-gradient(180deg,rgba(7,14,16,0.98),rgba(10,20,23,0.96))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] transition-[width] duration-300 md:flex ${
          isSidebarOpen ? "w-[260px]" : "w-[82px]"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/6 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className={`flex items-center gap-2 ${isSidebarOpen ? "" : "justify-center w-full"}`}>
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 rgba(255,255,255,0.08)",
                      "0 0 18px rgba(255,255,255,0.25)",
                      "0 0 0 rgba(255,255,255,0.08)",
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0f2124]"
                >
                  <img src={brandLogo} alt="Luna logo" className="h-full w-full object-cover rounded-[inherit] drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]" />
                </motion.div>
                {isSidebarOpen ? (
                  <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Luna
                  </h1>
                ) : null}
              </div>

              {isSidebarOpen ? (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-xl border border-[#274149] bg-[#0f1f24] p-1.5 text-[#cbe0dc] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75]"
                  title="Collapse"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="mx-auto rounded-xl border border-[#274149] bg-[#0f1f24] p-1.5 text-[#cbe0dc] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75]"
                  title="Expand"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
            </div>

            {isSidebarOpen ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8682]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-2xl border border-[#1f3135] bg-[#0c1719] py-2 pl-9 pr-3 text-sm text-[#e7f0ee] outline-none transition focus:border-[#4f7c75] focus:shadow-[0_0_0_2px_rgba(79,124,117,0.2)]"
                />
              </div>
            ) : null}
          </div>

          <div className="luna-scrollbar flex-1 overflow-y-auto px-3 py-3">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.04 },
                },
              }}
              className="space-y-2"
            >
              <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                <SidebarButton icon={Home} label="Home" collapsed={!isSidebarOpen} onClick={() => navigate("/")} />
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                <SidebarButton icon={PenSquare} label="New Chat" collapsed={!isSidebarOpen} onClick={() => createFreshSession()} />
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                <SidebarButton icon={Settings} label="Settings" collapsed={!isSidebarOpen} onClick={() => navigate("/profile")} />
              </motion.div>
            </motion.div>

            {isSidebarOpen ? (
              <>
                <div className="mb-2 mt-5 px-1 text-[11px] uppercase tracking-[0.14em] text-[#6f8682]">Recent Chats</div>
                <div className="luna-scrollbar max-h-[400px] space-y-2 overflow-y-auto pr-1">
                  {historyLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="px-2 py-2 space-y-2">
                        <Skeleton width="80%" height="14px" />
                        <Skeleton width="40%" height="10px" />
                      </div>
                    ))
                  ) : historyList.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-[#7a938e]">No chats found.</p>
                  ) : (
                    historyList.map((session) => {
                      const active = session.id === activeSession?.id;

                      return (
                        <div
                          key={session.id}
                          className={`group relative rounded-xl border px-2.5 py-2 transition ${
                            active
                              ? "border-[#4f7c75] bg-[#102126]"
                              : "border-transparent bg-[#0c1719] hover:border-[#274149]"
                          }`}
                        >
                          {active ? (
                            <motion.span
                              layoutId="luna-active-session"
                              className="absolute left-0 top-1/2 h-[70%] w-[3px] -translate-y-1/2 rounded-r-full bg-[#e1ba6d]"
                            />
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleSelectSession(session.id)}
                            className="w-full text-left"
                          >
                            <p className="truncate pr-6 text-sm text-[#ecf5f3] font-medium">{session.title}</p>
                            <p className="text-[11px] text-[#7a938e]">{formatHistoryTime(session.updatedAt)}</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            className="absolute right-1.5 top-1.5 rounded-md p-1 text-[#9ab7b1] opacity-0 transition group-hover:opacity-100 hover:bg-[#102126]"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="border-t border-white/6 p-3">
            {isSidebarOpen ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[#1f3135] bg-[#0c1719]/95 px-2.5 py-2.5 shadow-lg">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="h-9 w-9 rounded-full object-cover border border-white/10" />
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#102126] text-[#d5ebe6] border border-white/10">
                    <UserCircle2 className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#f0f6f5]">{user.name}</p>
                  <p className="truncate text-[11px] text-[#6f8682]">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="h-9 w-9 rounded-full object-cover border border-white/10" />
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#102126] text-[#d5ebe6] border border-white/10">
                    <UserCircle2 className="h-5 w-5" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <motion.div
              initial={{ x: -22, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -22, opacity: 0 }}
              className="h-full w-[90vw] max-w-[340px] border-r border-white/6 bg-[linear-gradient(180deg,rgba(7,14,16,0.98),rgba(10,20,23,0.96))]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-14 items-center justify-between border-b border-white/6 px-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#0f2124]">
                    <img src={brandLogo} alt="Luna logo" className="h-full w-full object-cover rounded-[inherit]" />
                  </span>
                  <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-lg font-semibold">Luna</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="rounded-xl border border-[#274149] bg-[#0f1f24] p-1.5 transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="luna-scrollbar h-[calc(100%-56px)] overflow-y-auto p-3">
                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8682]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search chats..."
                    className="w-full rounded-2xl border border-[#1f3135] bg-[#0c1719] py-2 pl-9 pr-3 text-sm text-[#e7f0ee] outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <SidebarButton icon={Home} label="Home" onClick={() => { navigate("/"); setMobileSidebarOpen(false); }} />
                  <SidebarButton icon={PenSquare} label="New Chat" onClick={() => { createFreshSession(); setMobileSidebarOpen(false); }} />
                  <SidebarButton icon={Settings} label="Settings" onClick={() => { navigate("/profile"); setMobileSidebarOpen(false); }} />
                </div>

                <div className="mb-2 mt-6 text-[11px] uppercase tracking-[0.14em] text-[#6f8682] px-1">Recent Chats</div>
                <div className="space-y-1.5">
                  {historyLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-2 py-2 space-y-2">
                        <Skeleton width="90%" height="14px" />
                        <Skeleton width="50%" height="10px" />
                      </div>
                    ))
                  ) : (
                    historyList.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleSelectSession(session.id)}
                        className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          session.id === activeSession?.id
                            ? "bg-[#102126] text-[#ecf5f3] border border-[#4f7c75]/50"
                            : "bg-[#0c1719] text-[#d5e6e3] border border-transparent"
                        }`}
                      >
                        <p className="truncate font-medium">{session.title}</p>
                        <p className="text-[11px] text-[#7a938e]">{formatHistoryTime(session.updatedAt)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
