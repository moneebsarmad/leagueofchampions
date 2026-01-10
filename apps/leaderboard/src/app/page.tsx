"use client";

import Image from "next/image";
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
      color: "#1e2a3a",
      bgColor: "#f4f1eb",
      logo: "/house_of_abubakr.png",
    },
    "House of 'Umar": {
      virtue: "Moral Courage",
      description: "Living with fairness, speaking truth, and acting with courage.",
      color: "#4a5568",
      bgColor: "#f4f1eb",
      logo: "/house_of_umar.png",
    },
    "House of 'A'ishah": {
      virtue: "Creativity",
      description: "Igniting creativity that inspires hearts and serves Allah.",
      color: "#744210",
      bgColor: "#f4f1eb",
      logo: "/house_of_aishah.png",
    },
    "House of Khadijah": {
      virtue: "Wisdom",
      description: "Guided by wisdom, leading with grace and strength.",
      color: "#2d5a27",
      bgColor: "#f4f1eb",
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
    <div className="h-screen py-4 px-4 sm:px-6 lg:px-8 flex flex-col" style={{ background: "var(--navy)" }}>
      {/* School Branding */}
      <div
        className="absolute top-4 left-6 text-sm tracking-wide font-medium"
        style={{
          color: "var(--brass)",
          fontFamily: "var(--font-inter), sans-serif"
        }}
      >
        Dar Al-Arqam Islamic School
      </div>
      <div className="absolute top-4 right-6 flex items-center gap-2">
        <Link
          href="/house-mvps"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--brass)] px-4 py-2 text-xs uppercase tracking-[0.15em] text-[var(--brass)] transition hover:bg-[var(--brass)] hover:text-white"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          House MVPs
        </Link>
        <Link
          href="/hall-of-fame"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--brass)] px-4 py-2 text-xs uppercase tracking-[0.15em] text-[var(--brass)] transition hover:bg-[var(--brass)] hover:text-white"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Hall of Fame
        </Link>
      </div>

      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1">
        {/* Header with Crest */}
        <header className="text-center mb-4">
          {/* Crest */}
          <div className="flex justify-center mb-2">
            <Image
              src="/crest.png"
              alt="League of Champions Crest"
              width={100}
              height={100}
              className="drop-shadow-lg"
              priority
            />
          </div>

          {/* Title */}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl text-white mb-2 pb-1"
            style={{ fontFamily: "var(--font-crimson), Georgia, serif" }}
          >
            League of Champions
          </h1>

          {/* Tagline */}
          <p
            className="text-lg sm:text-xl mt-3"
            style={{
              color: "var(--brass)",
              fontFamily: "var(--font-crimson), Georgia, serif"
            }}
          >
            Where Champions Are Made
          </p>

        </header>

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
