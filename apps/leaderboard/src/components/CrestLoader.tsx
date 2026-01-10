'use client'

import Image from 'next/image'

type CrestLoaderProps = {
  label?: string
}

export default function CrestLoader({ label = 'Loading...' }: CrestLoaderProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="flex items-center justify-center mx-auto mb-4">
          <Image
            src="/crest.png"
            alt="League of Champions crest"
            width={100}
            height={100}
            className="animate-pulse"
            priority
          />
        </div>
        <div
          className="text-xl font-semibold text-white mb-2"
          style={{ fontFamily: "var(--font-crimson), Georgia, serif" }}
        >
          League of Champions
        </div>
        <p className="text-[var(--brass)] text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
