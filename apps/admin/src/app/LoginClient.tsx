'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CrestLoader from '@/components/CrestLoader'

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const accessError = searchParams.get('error')
  const accessMessage =
    accessError === 'not_admin'
      ? 'Admin access required. Please sign in with an admin account.'
      : ''

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password})

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <CrestLoader label="Signing in..." />
  }

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">
            DA
          </div>
          <h1 className="text-2xl font-semibold">League of Champions</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Admin Portal</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          {accessMessage ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]">
              {accessMessage}
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          <button
            className="btn-primary w-full font-semibold"
            type="submit"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => router.push('/reset-password')}
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Dār al-Arqam Islamic School
        </div>
      </div>
    </div>
  )
}
