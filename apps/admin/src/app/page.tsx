import { Suspense } from 'react'
import CrestLoader from '@/components/CrestLoader'
import LoginClient from './LoginClient'

export default function LoginPage() {
  return (
    <Suspense fallback={<CrestLoader label="Loading..." />}>
      <LoginClient />
    </Suspense>
  )
}
