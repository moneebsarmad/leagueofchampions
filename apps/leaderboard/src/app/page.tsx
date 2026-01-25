"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import HouseCard from "@/components/HouseCard";
import { schoolConfig, canonicalHouseName } from "@/lib/school.config";

interface House {
  rank: number;
  name: string;
  virtue: string;
  description: string;
  points: number;
  color: string;
  bgColor: string;
  logo?: string | null;
  todayPoints?: number;
}

interface RecentAchievement {
  studentName: string;
  points: number;
  domain: string;
}

// Build house config from school config with leaderboard-specific properties
const houseVirtues: Record<string, { virtue: string; description: string; bgColor: string }> = {
  "House of Abū Bakr": {
    virtue: "Loyalty",
    description: "Rooted in honesty, unwavering in loyalty to faith and community.",
    bgColor: "#f6f1fb",
  },
  "House of ʿUmar": {
    virtue: "Moral Courage",
    description: "Living with fairness, speaking truth, and acting with courage.",
    bgColor: "#f2f3fb",
  },
  "House of ʿĀʾishah": {
    virtue: "Creativity",
    description: "Igniting creativity that inspires hearts and serves Allah.",
    bgColor: "#fdf1f1",
  },
  "House of Khadījah": {
    virtue: "Wisdom",
    description: "Guided by wisdom, leading with grace and strength.",
    bgColor: "#f1fbf6",
  },
};

const houseConfig: Record<string, Omit<House, "rank" | "points" | "name" | "todayPoints">> =
  schoolConfig.houses.reduce((acc, house) => {
    const virtueInfo = houseVirtues[house.name] || { virtue: "", description: "", bgColor: "#f5f5f5" };
    acc[house.name] = {
      virtue: virtueInfo.virtue,
      description: virtueInfo.description,
      color: house.color,
      bgColor: virtueInfo.bgColor,
      logo: house.logo,
    };
    return acc;
  }, {} as Record<string, Omit<House, "rank" | "points" | "name" | "todayPoints">>);

const fallbackHouses: House[] = [
  {
    rank: 1,
    name: "House of Abū Bakr",
    points: 4985,
    todayPoints: 0,
    ...houseConfig["House of Abū Bakr"],
  },
  {
    rank: 2,
    name: "House of ʿUmar",
    points: 4175,
    todayPoints: 0,
    ...houseConfig["House of ʿUmar"],
  },
  {
    rank: 3,
    name: "House of ʿĀʾishah",
    points: 3995,
    todayPoints: 0,
    ...houseConfig["House of ʿĀʾishah"],
  },
  {
    rank: 4,
    name: "House of Khadījah",
    points: 3480,
    todayPoints: 0,
    ...houseConfig["House of Khadījah"],
  },
];

function getAcademicWeek(): number {
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const academicStart = new Date(year, 7, 15); // Aug 15
  const diffTime = now.getTime() - academicStart.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, diffWeeks);
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function Home() {
  const [houses, setHouses] = useState<House[]>(fallbackHouses);
  const [loading, setLoading] = useState(true);
  const [recentAchievement, setRecentAchievement] = useState<RecentAchievement | null>(null);
  const [maxPoints, setMaxPoints] = useState(1);
  const fetchingRef = useRef(false);
  const achievementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const weekNumber = getAcademicWeek();

  useEffect(() => {
    async function fetchHouses() {
      if (fetchingRef.current) {
        return;
      }
      fetchingRef.current = true;
      try {
        // Fetch house standings
        const { data, error } = await supabase
          .from("house_standings_view")
          .select("*")
          .order("total_points", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          setHouses(fallbackHouses);
          return;
        }

        // Fetch today's points per house
        const todayDate = getTodayDateString();
        const { data: todayData } = await supabase
          .from("merit_log")
          .select("house, points")
          .eq("date_of_event", todayDate);

        const todayPointsByHouse = new Map<string, number>();
        (todayData ?? []).forEach((row) => {
          const houseName = canonicalHouseName(String(row.house ?? ""));
          if (houseName) {
            todayPointsByHouse.set(houseName, (todayPointsByHouse.get(houseName) || 0) + (row.points || 0));
          }
        });

        const pointsByHouse = new Map<string, number>();

        (data ?? []).forEach((row: Record<string, unknown>) => {
          const houseNameRaw = row.house_name ?? row.house ?? row.name ?? "";
          const houseName = canonicalHouseName(String(houseNameRaw ?? ""));
          if (!houseConfig[houseName]) {
            return;
          }
          const pointsValue = Number(row.total_points ?? row.points ?? 0) || 0;
          pointsByHouse.set(houseName, (pointsByHouse.get(houseName) || 0) + pointsValue);
        });

        const nextHouses = schoolConfig.houses
          .map((house) => ({
            name: house.name,
            points: pointsByHouse.get(house.name) || 0,
            todayPoints: todayPointsByHouse.get(house.name) || 0,
            ...houseConfig[house.name],
          }))
          .sort((a, b) => b.points - a.points)
          .map((house, index) => ({
            ...house,
            rank: index + 1,
          }));

        const max = Math.max(...nextHouses.map(h => h.points), 1);
        setMaxPoints(max);
        setHouses(nextHouses.length > 0 ? nextHouses : fallbackHouses);
      } catch (err) {
        console.error("Error fetching houses:", err);
        setHouses(fallbackHouses);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    }

    fetchHouses();

    const channel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "merit_log" },
        (payload) => {
          // Show recent achievement
          const newRow = payload.new as Record<string, unknown>;
          const studentName = String(newRow.student_name ?? "Student").split(" ")[0];
          const points = Number(newRow.points ?? 0);
          const subcategory = String(newRow.subcategory ?? "achievement");

          setRecentAchievement({
            studentName,
            points,
            domain: subcategory,
          });

          // Clear after 5 seconds
          if (achievementTimeoutRef.current) {
            clearTimeout(achievementTimeoutRef.current);
          }
          achievementTimeoutRef.current = setTimeout(() => {
            setRecentAchievement(null);
          }, 5000);

          fetchHouses();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merit_log" },
        () => {
          fetchHouses();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchHouses();
        }
      )
      .subscribe();

    const refreshInterval = setInterval(fetchHouses, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchHouses();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (achievementTimeoutRef.current) {
        clearTimeout(achievementTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 flex flex-col" style={{ background: "#faf9f7" }}>
      {/* Navigation Links */}
      <div className="absolute top-4 right-6 flex items-center gap-2">
        <Link
          href="/house-mvps"
          className="inline-flex items-center gap-2 rounded-full border border-[#B8860B] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#B8860B] transition hover:bg-[#B8860B] hover:text-white"
          style={{ fontFamily: "var(--font-source-sans), 'Source Sans 3', sans-serif" }}
        >
          House MVPs
        </Link>
        <Link
          href="/hall-of-fame"
          className="inline-flex items-center gap-2 rounded-full border border-[#B8860B] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#B8860B] transition hover:bg-[#B8860B] hover:text-white"
          style={{ fontFamily: "var(--font-source-sans), 'Source Sans 3', sans-serif" }}
        >
          Hall of Fame
        </Link>
      </div>

      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <header className="text-center mb-6 mt-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-2"
            style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
          >
            House Standings
          </h1>
          <p
            className="text-sm text-[#1a1a1a]/50"
            style={{ fontFamily: "var(--font-source-sans), 'Source Sans 3', sans-serif" }}
          >
            Week {weekNumber} - Live Leaderboard
          </p>
        </header>

        {/* House Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[#1a1a1a] text-lg">Loading...</p>
            </div>
          ) : (
            houses.map((house, index) => (
              <HouseCard
                key={house.name}
                house={house}
                maxPoints={maxPoints}
                recentAchievement={index === 0 ? recentAchievement : null}
              />
            ))
          )}
        </div>

        {/* Attribution */}
        <div className="mt-8 text-center">
          <p
            className="text-xs text-[#1a1a1a]/40"
            style={{ fontFamily: "var(--font-source-sans), 'Source Sans 3', sans-serif" }}
          >
            Powered by Nama Learning Systems
          </p>
        </div>
      </div>
    </div>
  );
}
