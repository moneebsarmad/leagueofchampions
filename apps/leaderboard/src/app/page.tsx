"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { VIEWS } from "@/lib/views";
import PodiumRow from "@/components/PodiumRow";
import CrestLoader from "@/components/CrestLoader";

interface House {
  rank: number;
  name: string;
  virtue: string;
  description: string;
  points: number;
  color: string;
  bgColor: string;
  logo?: string | null;
}

function canonicalHouse(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[''`]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (normalized.includes("bakr") || normalized.includes("abu")) {
    return "House of Abu Bakr";
  }
  if (normalized.includes("khadijah") || normalized.includes("khad")) {
    return "House of Khadijah";
  }
  if (normalized.includes("umar")) {
    return "House of 'Umar";
  }
  if (normalized.includes("aishah") || normalized.includes("aish")) {
    return "House of 'A'ishah";
  }
  return value.trim();
}

const houseConfig: Record<string, Omit<House, "rank" | "points" | "name">> = {
  "House of Abu Bakr": {
    virtue: "Loyalty",
    description: "Rooted in honesty, unwavering in loyalty to faith and community.",
    color: "var(--house-abu)",
    bgColor: "var(--surface-2)",
    logo: "/house_of_abubakr.png",
  },
  "House of 'Umar": {
    virtue: "Moral Courage",
    description: "Living with fairness, speaking truth, and acting with courage.",
    color: "var(--house-umar)",
    bgColor: "var(--surface-2)",
    logo: "/house_of_umar.png",
  },
  "House of 'A'ishah": {
    virtue: "Creativity",
    description: "Igniting creativity that inspires hearts and serves Allah.",
    color: "var(--house-aish)",
    bgColor: "var(--surface-2)",
    logo: "/house_of_aishah.png",
  },
  "House of Khadijah": {
    virtue: "Wisdom",
    description: "Guided by wisdom, leading with grace and strength.",
    color: "var(--house-khad)",
    bgColor: "var(--surface-2)",
    logo: "/house_of_khadijah.png",
  },
};

const fallbackHouses: House[] = [
  {
    rank: 1,
    name: "House of Abu Bakr",
    points: 4985,
    ...houseConfig["House of Abu Bakr"],
  },
  {
    rank: 2,
    name: "House of 'Umar",
    points: 4175,
    ...houseConfig["House of 'Umar"],
  },
  {
    rank: 3,
    name: "House of 'A'ishah",
    points: 3995,
    ...houseConfig["House of 'A'ishah"],
  },
  {
    rank: 4,
    name: "House of Khadijah",
    points: 3480,
    ...houseConfig["House of Khadijah"],
  },
];

export default function Home() {
  const [houses, setHouses] = useState<House[]>(fallbackHouses);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    async function fetchHouses() {
      if (fetchingRef.current) {
        return;
      }
      fetchingRef.current = true;
      try {
        const { data, error } = await supabase
          .from(VIEWS.HOUSE_STANDINGS)
          .select("*")
          .order("total_points", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          setHouses(fallbackHouses);
          return;
        }

        const mapped =
          data?.map((row: Record<string, unknown>, index: number) => {
            const houseNameRaw = row.house_name ?? row.house ?? row.name ?? "";
            const houseName = canonicalHouse(String(houseNameRaw ?? ""));
            const config = houseConfig[houseName];
            if (!config) {
              return null;
            }
            const pointsValue =
              Number(row.total_points ?? row.points ?? 0) || 0;
            return {
              rank: index + 1,
              name: houseName,
              points: pointsValue,
              ...config,
            };
          }) ?? [];

        const valid = mapped.filter(Boolean) as House[];
        setHouses(valid.length > 0 ? valid : fallbackHouses);
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
    };
  }, []);

  const [first, second, third] = houses;
  const updatedLabel = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen app-shell flex flex-col">
      {/* Championship Header Banner */}
      <div className="victory-arena border-b-2 border-[var(--victory-gold)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--victory-gold)] to-[var(--victory-gold-dark)] flex items-center justify-center shadow-lg">
                <span className="text-[var(--midnight-primary)] font-bold text-lg">DAAIS</span>
              </div>
              <div className="absolute -inset-0.5 rounded-xl bg-[var(--victory-gold)] opacity-30 blur"></div>
            </div>
            <div>
              <div className="display text-2xl sm:text-3xl font-bold text-white">League of Champions</div>
              <div className="text-sm text-[var(--victory-gold)] font-medium">Dār al-Arqam Islamic School</div>
            </div>
          </div>
          <span className="champ-badge">
            <span className="champ-dot"></span>
            Weekly Standings
          </span>
        </div>
      </div>

      <div className="w-full flex-1 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto w-full flex flex-col flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">Weekly Standings</h1>
              <p className="text-sm text-[var(--victory-gold)] font-medium">Where Champions Are Made</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/house-mvps" className="btn-secondary text-xs">
                House MVPs
              </Link>
              <Link href="/hall-of-fame" className="btn-secondary text-xs">
                Hall of Fame
              </Link>
            </div>
          </div>

          {loading ? (
            <CrestLoader label="Loading standings..." />
          ) : first && second && third ? (
            <PodiumRow
              first={{
                id: first.name,
                name: first.name,
                points: first.points,
                subtitle: first.virtue,
                accentVar: first.color,
              }}
              second={{
                id: second.name,
                name: second.name,
                points: second.points,
                subtitle: second.virtue,
                accentVar: second.color,
              }}
              third={{
                id: third.name,
                name: third.name,
                points: third.points,
                subtitle: third.virtue,
                accentVar: third.color,
              }}
              metaLeft="Week of Jan 11"
              metaRight={`Updated ${updatedLabel}`}
            />
          ) : null}

          {!loading ? (
            <div className="mt-6">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>House</th>
                    <th>Virtue</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {houses.map((house) => {
                    const isFirst = house.rank === 1;
                    const isSecond = house.rank === 2;
                    const isThird = house.rank === 3;
                    const rowStyle = isFirst
                      ? { borderLeft: "3px solid var(--gold)", background: "var(--gold-soft)" }
                      : isSecond
                        ? { borderLeft: "3px solid rgba(139, 148, 158, 0.6)" }
                        : isThird
                          ? { borderLeft: "3px solid rgba(138, 90, 68, 0.6)" }
                          : { borderLeft: "3px solid transparent" };

                    return (
                      <tr key={house.name} style={rowStyle}>
                        <td className="score">{house.rank}</td>
                        <td className="font-semibold">{house.name}</td>
                        <td className="muted">{house.virtue}</td>
                        <td className="score">{house.points.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
