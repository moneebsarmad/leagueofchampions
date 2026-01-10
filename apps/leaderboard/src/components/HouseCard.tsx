import Image from "next/image";

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

interface HouseCardProps {
  house: House;
}

export default function HouseCard({ house }: HouseCardProps) {
  const podiumClass =
    house.rank === 1
      ? "podium podium--gold"
      : house.rank === 2
        ? "podium podium--silver"
        : house.rank === 3
          ? "podium podium--bronze"
          : "card";
  const medalClass =
    house.rank === 1
      ? "medal medal--gold"
      : house.rank === 2
        ? "medal medal--silver"
        : house.rank === 3
          ? "medal medal--bronze"
          : "medal";
  const isTopThree = house.rank <= 3;
  const medalLabel =
    house.rank === 1
      ? "Champion"
      : house.rank === 2
        ? "Runner-up"
        : house.rank === 3
          ? "Third Place"
          : `#${house.rank}`;
  const scoreClass =
    house.rank === 1 ? "score score--big" : "score text-2xl";

  return (
    <div
      className={`relative overflow-hidden transition-transform hover:scale-[1.02] ${podiumClass}`}
      style={{
        borderLeft: `4px solid ${house.color}`,
      }}
    >
      <div className="absolute top-3 right-3">
        <div className={medalClass}>
          <span className="medal-dot" />
          {medalLabel}
        </div>
      </div>

      <div className="p-4 pr-32">
        {/* House Name */}
        <h2
          className="text-2xl font-bold mb-1"
          style={{ color: house.color }}
        >
          {house.name}
        </h2>

        {/* Virtue */}
        <p className="italic text-lg mb-1 text-[var(--text-muted)]">
          {house.virtue}
        </p>

        {/* Description */}
        <p className="text-sm mb-2 text-[var(--text-muted)]">
          {house.description}
        </p>

        {/* Points */}
        <p className={`font-bold text-[var(--text)] ${scoreClass}`}>
          {house.points.toLocaleString()}
        </p>
        {isTopThree ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--text-muted)]"
              aria-hidden="true"
            >
              <path d="M8 21h8M12 17v4M7 4h10l1 3a6 6 0 0 1-5 7 6 6 0 0 1-5-7l1-3z" />
            </svg>
            Top performer
          </div>
        ) : null}
      </div>

      {/* House Logo - Vertically Centered */}
      {house.logo ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-28 h-28">
          <Image
            src={house.logo}
            alt={`${house.name} Logo`}
            width={112}
            height={112}
            className="object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
