'use client'

type CrestLoaderProps = {
  label: string
}

export default function CrestLoader({ label }: CrestLoaderProps) {
  return (
    <div className="flex items-center justify-center h-64 pt-10 md:pt-14 lg:pt-16">
      <div className="text-center">
        <div className="flex items-center justify-center mx-auto mb-5 md:mb-6">
          <img src="/crest.png" alt="League of Champions crest" className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 object-contain animate-pulse" />
        </div>
        <div className="text-xl md:text-2xl font-semibold text-[var(--charcoal)]">
          League of Champions
        </div>
        <div className="mt-2 md:mt-3 text-[10px] md:text-sm font-semibold uppercase tracking-[0.18em] md:tracking-[0.2em]">
          <span className="text-[var(--house-abu-bakr)]">Loyalty</span>
          <span className="text-[var(--charcoal)]/40"> | </span>
          <span className="text-[var(--house-khadijah)]">Wisdom</span>
          <span className="text-[var(--charcoal)]/40"> | </span>
          <span className="text-[var(--house-umar)]">Moral Courage</span>
          <span className="text-[var(--charcoal)]/40"> | </span>
          <span className="text-[var(--house-aishah)]">Creativity</span>
        </div>
        <p className="text-[var(--charcoal)]/60 font-medium">{label}</p>
      </div>
    </div>
  )
}
