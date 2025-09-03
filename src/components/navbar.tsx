"use client";
import Link from "next/link";
import { createClient } from "../../supabase/client";
import { Button } from "./ui/button";
import { User, UserCircle, Sun, Moon } from "lucide-react";
import UserProfile from "./user-profile";
import { useEffect, useState, useCallback } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Theme initialization
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial =
        (stored as "light" | "dark" | null) ?? (prefersDark ? "dark" : "light");
      setTheme(initial);
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", initial === "dark");
      }
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("theme", next);
        }
      } catch {}
      return next;
    });
  }, []);

  return (
    <nav className="w-full border-b border-gray-200 bg-white dark:bg-background py-2">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link
          href="/"
          prefetch
          className="text-xl font-bold text-purple-600 dark:text-purple-400"
        >
          Reelify
        </Link>
        <div className="flex gap-3 items-center">
          <Button
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {loading ? (
            <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          ) : user ? (
            <>
              <Link href="/dashboard" className="px-0">
                <Button>Dashboard</Button>
              </Link>
              <UserProfile />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
