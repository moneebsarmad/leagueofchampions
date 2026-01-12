import Image from "next/image";

type PodiumEntry = {
  id: string;
  name: string;
  points: number;
  subtitle?: string;
  avatarUrl?: string;
  accentVar?: string;
};

type PodiumRowProps = {
  first: PodiumEntry;
  second: PodiumEntry;
  third: PodiumEntry;
  metaLeft?: string;
  metaRight?: string;
};

function PodiumCard({
  entry,
  ribbon,
  rankLabel,
  isChampion,
  scoreClassName,
}: {
  entry: PodiumEntry;
  ribbon: string;
  rankLabel: string;
  isChampion?: boolean;
  scoreClassName: string;
}) {
  return (
    <>
      <div className={`ribbon${isChampion ? " ribbon--gold" : ""}`}>{ribbon}</div>
      <div className="podium-inner">
        <div className="podium-top">
          <div className="flex items-start gap-3">
            <div
              className="podium-accent"
              style={{ background: entry.accentVar || "transparent" }}
            />
            <div>
              <div className="podium-name">{entry.name}</div>
              {entry.subtitle ? (
                <div className="podium-sub">{entry.subtitle}</div>
              ) : null}
            </div>
          </div>
          {entry.avatarUrl ? (
            <Image
              src={entry.avatarUrl}
              alt={entry.name}
              width={48}
              height={48}
              className="rounded-full border border-[var(--border)] object-cover"
            />
          ) : null}
        </div>

        <div className="podium-bottom">
          <div className="flex items-end gap-2">
            <div className={`score ${scoreClassName}`}>{entry.points.toLocaleString()}</div>
            <span className="text-xs text-[var(--text-muted)]">pts</span>
          </div>
          {isChampion ? (
            <span className="champ-badge">
              <span className="champ-dot"></span>
              {rankLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              <span
                className="dot"
                style={{
                  background:
                    rankLabel === "#2"
                      ? "rgba(139, 148, 158, 0.8)"
                      : "rgba(138, 90, 68, 0.8)",
                }}
              />
              {rankLabel}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default function PodiumRow({
  first,
  second,
  third,
  metaLeft,
  metaRight,
}: PodiumRowProps) {
  return (
    <section className="podium-section">
      <div className="podium-meta">
        <div className="podium-meta-left">{metaLeft}</div>
        <div className="podium-meta-right">{metaRight}</div>
      </div>

      <div className="podium-grid">
        <div className="order-2 md:order-1 podium podium--silver">
          <PodiumCard
            entry={second}
            ribbon="Runner-up"
            rankLabel="#2"
            scoreClassName="rank-num rank-num--lg"
          />
        </div>

        <div className="order-1 md:order-2 podium podium--gold">
          <PodiumCard
            entry={first}
            ribbon="Champion"
            rankLabel="#1"
            isChampion
            scoreClassName="rank-num rank-num--xl"
          />
        </div>

        <div className="order-3 podium podium--bronze">
          <PodiumCard
            entry={third}
            ribbon="Third Place"
            rankLabel="#3"
            scoreClassName="rank-num rank-num--lg"
          />
        </div>
      </div>
    </section>
  );
}
