"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { VIEWS } from "@/lib/views";

const houseConfig: Record<
  string,
  { color: string; bgColor: string; logo?: string | null }
> = {
  "House of Abu Bakr": {
    color: "var(--house-abu)",
    bgColor: "var(--surface-2)",
    logo: "/house_of_abubakr.png",
  },
  "House of 'Umar": {
    color: "var(--house-umar)",
    bgColor: "var(--surface-2)",
    logo: "/house_of_umar.png",
  },
  "House of 'A'ishah": {
    color: "var(--house-aish)",
    bgColor: "var(--surface-2)",
    logo: "/house_of_aishah.png",
  },
  "House of Khadijah": {
    color: "var(--house-khad)",
    bgColor: "var(--surface-2)",
    logo: "/house_of_khadijah.png",
  },
};

interface StudentEntry {
  houseName: string;
  studentName: string;
  points: number;
  rank?: number | null;
}

function normalizeHouseName(raw: string): string {
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .trim();
  if (!cleaned) {
    return "Unknown House";
  }
  const key = cleaned
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = key.replace(/\s+/g, "");
  if (key.includes("abu bakr") || compact.includes("abubakr")) {
    return "House of Abu Bakr";
  }
  if (key.includes("umar")) {
    return "House of 'Umar";
  }
  if (key.includes("aishah") || compact.includes("aishah")) {
    return "House of 'A'ishah";
  }
  if (key.includes("khadijah")) {
    return "House of Khadijah";
  }
  return cleaned;
}

export default function HouseMvpsPage() {
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const fetchingRef = useRef(false);

  useEffect(() => {
    function getRowValue(
      row: Record<string, unknown>,
      keys: string[]
    ): unknown {
      for (const key of keys) {
        if (key in row) {
          return row[key];
        }
      }
      const normalizedKeys = Object.keys(row).reduce<Record<string, string>>(
        (acc, key) => {
          acc[key.toLowerCase()] = key;
          return acc;
        },
        {}
      );
      for (const key of keys) {
        const normalized = normalizedKeys[key.toLowerCase()];
        if (normalized) {
          return row[normalized];
        }
      }
      return undefined;
    }

    async function fetchTopStudents() {
      if (fetchingRef.current) {
        return;
      }
      fetchingRef.current = true;
      try {
        const { data, error } = await supabase
          .from(VIEWS.TOP_STUDENTS_HOUSE)
          .select("*");

        if (error) {
          setErrorMessage("Unable to load House MVPs right now.");
          console.error("Supabase error:", error);
          return;
        }

        const normalized =
          data?.map((row: Record<string, unknown>) => {
            const houseNameRaw =
              getRowValue(row, ["house"]) ?? "";
            const studentNameRaw =
              getRowValue(row, ["student_name"]) ?? "";
            const pointsRaw =
              getRowValue(row, ["total_points"]) ?? 0;
            const rankRaw =
              getRowValue(row, ["house_rank"]) ?? NaN;

            const houseName = normalizeHouseName(
              String(houseNameRaw ?? "")
            );
            const studentName =
              String(studentNameRaw ?? "").trim() ||
              "Unnamed Student";
            const pointsValue = Number(pointsRaw) || 0;
            const rankValue = Number(rankRaw);

            return {
              houseName,
              studentName,
              points: pointsValue,
              rank: Number.isFinite(rankValue) ? rankValue : null,
            };
          }) ?? [];

        setStudents(normalized);
      } catch (err) {
        console.error("Error fetching House MVPs:", err);
        setErrorMessage("Unable to load House MVPs right now.");
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    }

    fetchTopStudents();

    const channel = supabase
      .channel("house-mvps-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merit_log" },
        () => {
          fetchTopStudents();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchTopStudents();
        }
      )
      .subscribe();

    const refreshInterval = setInterval(fetchTopStudents, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchTopStudents();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, StudentEntry[]> = {};
    students.forEach((entry) => {
      if (!groups[entry.houseName]) {
        groups[entry.houseName] = [];
      }
      groups[entry.houseName].push(entry);
    });

    Object.values(groups).forEach((houseStudents) => {
      houseStudents.sort((a, b) => {
        if (a.rank != null && b.rank != null) {
          return a.rank - b.rank;
        }
        if (a.rank != null) {
          return -1;
        }
        if (b.rank != null) {
          return 1;
        }
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return a.studentName.localeCompare(b.studentName);
      });
    });

    return groups;
  }, [students]);

  const houseOrder = useMemo(() => {
    const configured = Object.keys(houseConfig);
    const extras = Object.keys(grouped).filter(
      (houseName) => !configured.includes(houseName)
    );
    return [...configured, ...extras.sort()];
  }, [grouped]);

  const visibleHouses = useMemo(
    () => houseOrder.filter((houseName) => (grouped[houseName] || []).length > 0),
    [grouped, houseOrder]
  );

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 leaderboard-shell flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1">
        <div className="absolute top-4 right-6">
          <Link
            href="/"
            className="btn-secondary text-xs"
          >
            Back to Leaderboard
          </Link>
        </div>
        <header className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">
              DA
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl mb-2">House MVPs</h1>
          <p className="text-[var(--text-muted)] text-lg sm:text-xl mt-2">
            Top 5 students from each house
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[var(--text-muted)] text-lg">Loading House MVPs...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[var(--text-muted)] text-lg">{errorMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleHouses.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center py-12">
                <p className="text-[var(--text-muted)] text-lg">No MVPs found yet.</p>
              </div>
            ) : (
              visibleHouses.map((houseName) => {
              const config = houseConfig[houseName] || {
                color: "var(--text)",
                bgColor: "var(--surface-2)",
                logo: null,
              };
              const houseStudents = grouped[houseName] || [];

              return (
                <div
                  key={houseName}
                  className="card relative overflow-hidden"
                  style={{
                    borderLeft: `4px solid ${config.color}`,
                    background: config.bgColor,
                  }}
                >
                  <div className="p-5 pr-28">
                    <h2
                      className="text-2xl font-bold mb-2"
                      style={{ color: config.color }}
                    >
                      {houseName}
                    </h2>
                    <ol className="space-y-2">
                      {houseStudents.length === 0 ? (
                        <li
                          className="text-sm text-[var(--text-muted)]"
                        >
                          No MVPs found yet.
                        </li>
                      ) : (
                        houseStudents.slice(0, 5).map((student, index) => (
                          <li
                            key={`${houseName}-${student.studentName}-${index}`}
                            className="flex items-center justify-between text-sm text-[var(--text)]"
                          >
                            <span>
                              {student.rank ?? index + 1}. {student.studentName}
                            </span>
                            <span className="font-semibold">
                              {student.points.toLocaleString()}
                            </span>
                          </li>
                        ))
                      )}
                    </ol>
                  </div>
                  {config.logo ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20">
                      <Image
                        src={config.logo}
                        alt={`${houseName} Logo`}
                        width={80}
                        height={80}
                        className="object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
