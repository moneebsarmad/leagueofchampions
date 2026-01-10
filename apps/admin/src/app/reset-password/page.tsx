'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CrestLoader from '@/components/CrestLoader'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const redirectTo = `${window.location.origin}/update-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setMessage('Password reset email sent. Check your inbox.')
    } catch (err) {
      console.error('Reset error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <CrestLoader label="Sending reset link..." />
  }

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Reset Password</h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            We will email you a reset link.
          </p>
        </div>

        <form onSubmit={handleReset}>
          <div className="mb-5">
            <label htmlFor="email" className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
              Admin Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="Enter your admin email"
              required
            />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--success)]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full font-semibold disabled:opacity-60"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
