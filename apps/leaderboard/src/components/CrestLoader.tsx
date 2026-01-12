'use client'

type CrestLoaderProps = {
  label?: string
}

export default function CrestLoader({ label = 'Loading...' }: CrestLoaderProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="flex items-center justify-center mx-auto mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--midnight-primary)] to-[var(--midnight-secondary)] text-white border-2 border-[var(--victory-gold)] flex items-center justify-center text-xl font-bold shadow-lg">
              <span className="bg-gradient-to-b from-[var(--victory-gold-light)] to-[var(--victory-gold)] bg-clip-text text-transparent">DA</span>
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[var(--victory-gold)] to-[var(--victory-gold-dark)] opacity-20 blur animate-pulse"></div>
          </div>
        </div>
        <div className="text-xl font-bold text-[var(--text)]">
          League of Champions
        </div>
        <div className="mt-1 text-sm text-[var(--victory-gold)] font-medium">
          Where Champions Are Made
        </div>
        <p className="mt-3 text-[var(--text-muted)] text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
