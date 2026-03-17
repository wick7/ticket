"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { CreateBoardModal } from "./boards/CreateBoardModal";

interface Board {
  id: string;
  name: string;
  savedFilter: Record<string, string>;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBoards = useCallback(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data: Board[]) => setBoards(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBoards();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: User) => setUser(data))
      .catch(() => {});
  }, [fetchBoards]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleDeleteBoard(id: string) {
    setDeletingId(id);
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setDeletingId(null);
    if (pathname === `/boards/${id}`) router.push("/dashboard");
  }

  const isActive = (href: string) => pathname === href;

  function NavItem({
    href,
    label,
    icon,
    badge,
  }: {
    href: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }) {
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
          isActive(href)
            ? "bg-orange-500/15 text-white border border-orange-500/30"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
        }`}
      >
        <span className={isActive(href) ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-300"}>
          {icon}
        </span>
        <span className="flex-1">{label}</span>
        {badge !== undefined && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            isActive(href) ? "bg-orange-500 text-white" : "bg-zinc-700 text-zinc-300"
          }`}>
            {badge}
          </span>
        )}
      </Link>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <aside className="w-52 flex flex-col bg-zinc-950 border-r border-zinc-800/60 shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">TF</span>
            </div>
            <span className="font-bold text-white text-sm tracking-tight">TicketFlow</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* WORKSPACE */}
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              Workspace
            </p>
            <div className="space-y-0.5">
              <NavItem
                href="/dashboard"
                label="Board"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                }
              />
              <NavItem
                href="/time"
                label="Time Log"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* BOARDS */}
          <div>
            <div className="flex items-center justify-between px-3 pb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Boards
              </p>
              <button
                onClick={() => setShowCreateBoard(true)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                title="New board"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="6" y1="1" x2="6" y2="11" />
                  <line x1="1" y1="6" x2="11" y2="6" />
                </svg>
              </button>
            </div>
            <div className="space-y-0.5">
              {boards.length === 0 ? (
                <button
                  onClick={() => setShowCreateBoard(true)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  New Board
                </button>
              ) : (
                boards.map((board) => (
                  <div key={board.id} className="group relative">
                    <Link
                      href={`/boards/${board.id}`}
                      className={`flex items-center gap-3 px-3 py-2 pr-8 rounded-lg text-sm transition-colors truncate ${
                        pathname === `/boards/${board.id}`
                          ? "bg-orange-500/15 text-white border border-orange-500/30"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                      }`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-600">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      <span className="truncate">{board.name}</span>
                    </Link>
                    <button
                      onClick={() => handleDeleteBoard(board.id)}
                      disabled={deletingId === board.id}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all rounded"
                      title="Delete board"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="1" y1="1" x2="9" y2="9" />
                        <line x1="9" y1="1" x2="1" y2="9" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SYSTEM */}
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              System
            </p>
            <div className="space-y-0.5">
              {/* <NavItem
                href="/settings"
                label="Sources"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                }
              /> */}
              <NavItem
                href="/config"
                label="Configuration"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M19.07 19.07l-1.41-1.41M5.34 5.34l-1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3" />
                  </svg>
                }
              />
            </div>
          </div>
        </nav>

        {/* User info + sign out */}
        <div className="p-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg group">
            <div className="w-7 h-7 rounded-full bg-orange-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {user?.name || user?.email || "…"}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all"
              title="Sign out"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {showCreateBoard && (
        <CreateBoardModal
          onClose={() => setShowCreateBoard(false)}
          onCreated={(board) => {
            setBoards((prev) => [...prev, board as Board]);
            setShowCreateBoard(false);
            router.push(`/boards/${board.id}`);
          }}
        />
      )}
    </>
  );
}
