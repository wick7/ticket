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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
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

  const navItem = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        pathname === href
          ? "bg-zinc-700 text-white"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <aside className="w-56 flex flex-col bg-zinc-900 border-r border-zinc-800 shrink-0">
        <div className="px-4 py-5 border-b border-zinc-800">
          <span className="font-bold text-white text-lg">TicketFlow</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItem("/dashboard", "All Tickets")}
          {/* {navItem("/settings", "Settings")} */}
          {navItem("/time", "Time")}
          {navItem("/config", "Configuration")}

          {/* Boards section */}
          <div className="pt-4 pb-1 px-1 flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Boards
            </span>
            <button
              onClick={() => setShowCreateBoard(true)}
              className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded"
              title="New board"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="7" y1="2" x2="7" y2="12" />
                <line x1="2" y1="7" x2="12" y2="7" />
              </svg>
            </button>
          </div>

          {boards.length === 0 ? (
            <button
              onClick={() => setShowCreateBoard(true)}
              className="block w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              + New board
            </button>
          ) : (
            boards.map((board) => (
              <div key={board.id} className="group relative">
                <Link
                  href={`/boards/${board.id}`}
                  className={`block px-3 py-2 pr-8 rounded-lg text-sm transition-colors truncate ${
                    pathname === `/boards/${board.id}`
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {board.name}
                </Link>
                <button
                  onClick={() => handleDeleteBoard(board.id)}
                  disabled={deletingId === board.id}
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 transition-all rounded"
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
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
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
