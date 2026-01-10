'use client'

type CrestLoaderProps = {
  label: string
}

export default function CrestLoader({ label }: CrestLoaderProps) {
  return (
    <div className="flex items-center justify-center h-64 pt-10 md:pt-14 lg:pt-16">
      <div className="text-center">
        <div className="flex items-center justify-center mx-auto mb-5 md:mb-6">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center text-lg md:text-xl font-semibold animate-pulse">
            DA
          </div>
        </div>
        <div className="text-xl md:text-2xl font-semibold text-[var(--text)]">
          League of Champions
        </div>
        <div className="mt-2 md:mt-3 text-[10px] md:text-sm font-semibold tracking-[0.18em] md:tracking-[0.2em]">
          <span className="text-[var(--house-abu)]">Loyalty</span>
          <span className="text-[var(--text-muted)]"> | </span>
          <span className="text-[var(--house-khad)]">Wisdom</span>
          <span className="text-[var(--text-muted)]"> | </span>
          <span className="text-[var(--house-umar)]">Moral Courage</span>
          <span className="text-[var(--text-muted)]"> | </span>
          <span className="text-[var(--house-aish)]">Creativity</span>
        </div>
        <p className="text-[var(--text-muted)] font-medium">{label}</p>
      </div>
    </div>
  )
}
