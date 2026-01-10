"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { VIEWS } from "@/lib/views";

interface HallEntry {
  studentName: string;
  points: number;
}

interface HallSection {
  id: string;
  title: string;
  subtitle: string;
  view: string;
  accent: string;
  tint: string;
  icon: string;
}

const sections: HallSection[] = [
  {
    id: "century",
    title: "Century Club",
    subtitle: "Students with 100+ individual points",
    view: VIEWS.CENTURY_CLUB,
    accent: "var(--accent)",
    tint: "var(--surface-2)",
    icon: "100",
  },
  {
    id: "badr",
    title: "Badr Club",
    subtitle: "Students with 300+ individual points",
    view: VIEWS.BADR_CLUB,
    accent: "var(--house-abu)",
    tint: "var(--surface-2)",
    icon: "🌙",
  },
  {
    id: "fath",
    title: "Fath Club",
    subtitle: "Students with 700+ individual points",
    view: VIEWS.FATH_CLUB,
    accent: "var(--house-khad)",
    tint: "var(--surface-2)",
    icon: "🏆",
  },
];

function normalizeEntry(row: Record<string, unknown>): HallEntry | null {
  const studentRaw =
    row.student_name ??
    row.student ??
    row.name ??
    row.full_name ??
    row.studentName ??
    "";
  const pointsRaw =
    row.total_points ??
    row.points ??
    row.total ??
    row.score ??
    0;

  const studentName = String(studentRaw ?? "").trim();
  if (!studentName) {
    return null;
  }

  return {
    studentName,
    points: Number(pointsRaw) || 0,
  };
}

export default function HallOfFamePage() {
  const [data, setData] = useState<Record<string, HallEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const fetchingRef = useRef(false);

  useEffect(() => {
    async function fetchSection(section: HallSection) {
      const { data, error } = await supabase
        .from(section.view)
        .select("*");
      if (error) {
        throw error;
      }
      const entries =
        data?.map((row: Record<string, unknown>) => normalizeEntry(row)) ?? [];
      return entries.filter(Boolean) as HallEntry[];
    }

    async function fetchAll() {
      if (fetchingRef.current) {
        return;
      }
      fetchingRef.current = true;
      try {
        const results = await Promise.all(
          sections.map(async (section) => ({
            view: section.view,
            entries: await fetchSection(section),
          }))
        );
        const next: Record<string, HallEntry[]> = {};
        results.forEach((result) => {
          next[result.view] = result.entries;
        });
        setData(next);
      } catch (err) {
        console.error("Error fetching Hall of Fame:", err);
        setErrorMessage("Unable to load Hall of Fame right now.");
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    }

    fetchAll();

    const channel = supabase
      .channel("hall-of-fame-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merit_log" },
        () => {
          fetchAll();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    const refreshInterval = setInterval(fetchAll, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 leaderboard-shell flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1">
        <div className="absolute top-4 right-6 flex items-center gap-2">
          <Link
            href="/"
            className="btn-secondary text-xs"
          >
            Leaderboard
          </Link>
          <Link
            href="/house-mvps"
            className="btn-secondary text-xs"
          >
            House MVPs
          </Link>
        </div>

        <header className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">
              DA
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl mb-2">Hall of Fame</h1>
          <p className="text-[var(--text-muted)] text-lg sm:text-xl mt-2">
            Milestones that celebrate student excellence
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[var(--text-muted)] text-lg">Loading Hall of Fame...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[var(--text-muted)] text-lg">{errorMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {sections.map((section) => {
              const entries = data[section.view] || [];

              return (
                <div
                  key={section.id}
                  className="card overflow-hidden"
                  style={{
                    borderLeft: `4px solid ${section.accent}`,
                  }}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xl"
                        style={{ color: section.accent }}
                      >
                        {section.icon}
                      </span>
                      <div>
                        <h2
                          className="text-2xl font-bold"
                          style={{ color: section.accent }}
                        >
                          {section.title}
                        </h2>
                        <p
                          className="text-sm text-[var(--text-muted)]"
                        >
                          {section.subtitle}
                        </p>
                      </div>
                    </div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: section.accent }}
                    >
                      {entries.length} Total
                    </div>
                  </div>

                  <div className="px-5 pb-4">
                    {entries.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        No students have reached this milestone yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {entries.map((entry, index) => (
                          <div
                            key={`${section.id}-${entry.studentName}-${index}`}
                            className="surface-muted flex items-center justify-between rounded-md px-4 py-2"
                          >
                            <span className="text-sm font-semibold text-[var(--text)]">
                              {entry.studentName}
                            </span>
                            <span
                              className="text-sm font-bold"
                              style={{ color: section.accent }}
                            >
                              {entry.points.toLocaleString()} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
