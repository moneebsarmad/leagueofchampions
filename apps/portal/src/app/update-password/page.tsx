'use client'

import { useEffect, useState } from 'react'
import { isDemo, supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import CrestLoader from '../../components/CrestLoader'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const ensureSession = async () => {
      if (isDemo) {
        setError('Password updates are disabled in demo mode.')
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setError('Open the password reset link from your email to continue.')
      }
    }

    ensureSession()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    if (isDemo) {
      setError('Password updates are disabled in demo mode.')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }

      setMessage('Password updated. You can sign in now.')
      setTimeout(() => {
        router.push('/')
      }, 1200)
    } catch (err) {
      console.error('Update error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <CrestLoader label="Updating password..." />
  }

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Update Password</h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">Choose a new password.</p>
        </div>

        <form onSubmit={handleUpdate}>
          <div className="mb-5">
            <label htmlFor="password" className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              placeholder="Enter a new password"
              required
            />
          </div>

          <div className="mb-5">
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input w-full"
              placeholder="Re-enter your password"
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
            {isLoading ? 'Updating...' : 'Update password'}
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
