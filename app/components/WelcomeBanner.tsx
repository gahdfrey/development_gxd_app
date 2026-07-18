"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";

interface Greeting {
  title: string;
  firstname: string;
  lastname: string;
  previews: string[];
}

// Fixed-date holidays (Nigeria-relevant + universal). Keyed by MM-DD.
const HOLIDAYS: Record<string, string> = {
  "01-01": "Happy New Year! 🎉",
  "05-01": "Happy Workers' Day!",
  "06-12": "Happy Democracy Day, Nigeria! 🇳🇬",
  "10-01": "Happy Independence Day, Nigeria! 🇳🇬",
  "12-24": "Merry Christmas Eve! 🎄",
  "12-25": "Merry Christmas! 🎄",
  "12-26": "Happy Boxing Day!",
  "12-31": "Cheers to the year ahead! 🎊",
};

const DISPLAY_MS = 60_000; // banner lasts 1 minute

function timeOfDay(d: Date): { greeting: string; icon: "sun" | "sunset" | "moon" } {
  const h = d.getHours();
  if (h < 12) return { greeting: "Good morning", icon: "sun" };
  if (h < 17) return { greeting: "Good afternoon", icon: "sunset" };
  return { greeting: "Good evening", icon: "moon" };
}

function holidayFor(d: Date): string | null {
  const key = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return HOLIDAYS[key] ?? null;
}

export default function WelcomeBanner() {
  const [data, setData] = useState<Greeting | null>(null);
  const [visible, setVisible] = useState(false);
  // Guard so the one-shot flag is consumed exactly once, even under React
  // Strict Mode's double-invoked effects in development.
  const ranRef = useRef(false);

  // Show only right after a fresh login (LoginForm sets the flag).
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem("carevault:justLoggedIn")) return;
    sessionStorage.removeItem("carevault:justLoggedIn");

    fetch("/api/greeting")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Greeting | null) => {
        if (d) {
          setData(d);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  const now = new Date();
  const { greeting, icon } = timeOfDay(now);
  const holiday = holidayFor(now);
  const dateLine = now
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  const displayName = data
    ? data.title
      ? `${data.title} ${data.lastname}`
      : data.firstname || data.lastname
    : "";

  const TimeIcon = icon === "moon" ? MoonIcon : SunIcon;
  const iconTint =
    icon === "moon"
      ? "bg-indigo-500"
      : icon === "sunset"
        ? "bg-amber-500"
        : "bg-blue-600";

  return (
    <AnimatePresence>
      {visible && data && (
        <div className="pointer-events-none fixed inset-x-0 top-5 z-[60] flex justify-center px-4">
          <motion.div
            initial={{ y: -48, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -32, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 shadow-2xl shadow-slate-900/40 ring-1 ring-white/10"
            role="status"
            aria-live="polite"
          >
            <div className="relative flex items-start gap-4 p-5">
              {/* Soft accent glow behind the icon (solid color, blurred) */}
              <div
                className={`pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl ${iconTint}`}
                aria-hidden
              />

              {/* Time-of-day icon */}
              <motion.span
                initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${iconTint}`}
              >
                <TimeIcon className="h-6 w-6" />
              </motion.span>

              {/* Content */}
              <div className="relative min-w-0 flex-1">
                <motion.p
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.12, duration: 0.35, ease: "easeOut" }}
                  className="text-[11px] font-semibold tracking-[0.18em] text-slate-500"
                >
                  {dateLine}
                </motion.p>

                <motion.h3
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                  className="mt-1 truncate text-lg font-bold tracking-tight text-white"
                >
                  {greeting}, {displayName}
                </motion.h3>

                {holiday && (
                  <motion.span
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.35, ease: "easeOut" }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/20"
                  >
                    <SparklesIcon className="h-3.5 w-3.5" />
                    {holiday}
                  </motion.span>
                )}

                {data.previews.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {data.previews.map((p, i) => (
                      <motion.li
                        key={i}
                        initial={{ x: -12, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.38 + i * 0.12, duration: 0.35, ease: "easeOut" }}
                        className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-300"
                      >
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        {p}
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <motion.p
                    initial={{ x: -12, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.38, duration: 0.35, ease: "easeOut" }}
                    className="mt-2 text-[13px] text-slate-400"
                  >
                    All caught up — have a great day ahead.
                  </motion.p>
                )}
              </div>

              {/* Close */}
              <button
                onClick={() => setVisible(false)}
                aria-label="Dismiss"
                className="relative shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* 60-second countdown bar */}
            <div className="h-[3px] w-full bg-white/5">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: DISPLAY_MS / 1000, ease: "linear" }}
                className="h-full rounded-r-full bg-blue-500"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
