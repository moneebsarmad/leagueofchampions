"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { VIEWS } from "@/lib/views";
import HouseCard from "@/components/HouseCard";
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
      bgColor: "var(--bg-muted)",
      logo: "/house_of_abubakr.png",
    },
    "House of 'Umar": {
      virtue: "Moral Courage",
      description: "Living with fairness, speaking truth, and acting with courage.",
      color: "var(--house-umar)",
      bgColor: "var(--bg-muted)",
      logo: "/house_of_umar.png",
    },
    "House of 'A'ishah": {
      virtue: "Creativity",
      description: "Igniting creativity that inspires hearts and serves Allah.",
      color: "var(--house-aish)",
      bgColor: "var(--bg-muted)",
      logo: "/house_of_aishah.png",
    },
    "House of Khadijah": {
      virtue: "Wisdom",
      description: "Guided by wisdom, leading with grace and strength.",
      color: "var(--house-khad)",
      bgColor: "var(--bg-muted)",
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

  return (
    <div className="h-screen py-4 px-4 sm:px-6 lg:px-8 flex flex-col leaderboard-shell">
      <div className="absolute top-4 left-6 text-sm font-medium text-[var(--text-muted)]">
        Dār al-Arqam Islamic School
      </div>
      <div className="absolute top-4 right-6 flex items-center gap-2">
        <Link href="/house-mvps" className="btn-secondary text-xs">
          House MVPs
        </Link>
        <Link href="/hall-of-fame" className="btn-secondary text-xs">
          Hall of Fame
        </Link>
      </div>

      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1">
        <header className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">
              DA
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl mb-2">
            League of Champions
          </h1>
          <p className="text-lg sm:text-xl mt-2 text-[var(--text-muted)]">
            Where Champions Are Made
          </p>

        </header>

        <div className="champ-banner text-sm text-[var(--text)] flex items-center justify-between gap-3">
          <span className="font-medium">Weekly Standings · Dār al-Arqam</span>
          <span className="medal medal--gold">
            <span className="medal-dot" />
            Leaderboard
          </span>
        </div>

        {/* Leaderboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {loading ? (
            <div className="col-span-2">
              <CrestLoader label="Loading standings..." />
            </div>
          ) : (
            houses.map((house) => (
              <HouseCard key={house.name} house={house} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
