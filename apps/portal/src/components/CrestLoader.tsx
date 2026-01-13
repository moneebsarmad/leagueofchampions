'use client'

type CrestLoaderProps = {
  label: string
}

export default function CrestLoader({ label }: CrestLoaderProps) {
  return (
    <div className="flex items-center justify-center h-64 pt-10 md:pt-14 lg:pt-16">
      <div className="text-center">
        <div className="flex items-center justify-center mx-auto mb-5 md:mb-6">
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[var(--royal-purple)] to-[var(--royal-purple-light)] text-white border-2 border-[var(--gold)] flex items-center justify-center text-lg md:text-xl font-bold shadow-lg" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              <span className="text-[var(--gold)]">DA</span>
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] opacity-20 blur animate-pulse"></div>
          </div>
        </div>
        <div className="text-xl md:text-2xl text-[var(--text)]" style={{ fontFamily: 'var(--font-playfair), serif' }}>
          League of Champions
        </div>
        <div className="mt-1 text-sm text-[var(--gold-dark)] font-medium">
          Where Champions Are Made
        </div>
        <div className="mt-3 md:mt-4 text-[10px] md:text-xs font-semibold tracking-[0.15em] md:tracking-[0.18em]">
          <span className="text-[var(--house-abu)]">Loyalty</span>
          <span className="text-[var(--gold)] mx-1">|</span>
          <span className="text-[var(--house-khad)]">Wisdom</span>
          <span className="text-[var(--gold)] mx-1">|</span>
          <span className="text-[var(--house-umar)]">Courage</span>
          <span className="text-[var(--gold)] mx-1">|</span>
          <span className="text-[var(--house-aish)]">Creativity</span>
        </div>
        <p className="mt-4 text-[var(--text-muted)] font-medium text-sm">{label}</p>
      </div>
    </div>
  )
}
