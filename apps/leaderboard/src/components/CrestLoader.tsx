'use client'

type CrestLoaderProps = {
  label?: string
}

export default function CrestLoader({ label = 'Loading...' }: CrestLoaderProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="flex items-center justify-center mx-auto mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center text-lg font-semibold animate-pulse">
            DAAIS
          </div>
        </div>
        <div className="text-xl font-semibold text-[var(--text)] mb-2">
          League of Champions
        </div>
        <p className="text-[var(--text-muted)] text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
