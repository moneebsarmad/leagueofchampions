'use client'

import { useState, useEffect } from 'react'

interface TableStatus {
  exists: boolean
  count?: number
  error?: string
}

interface SetupStatus {
  tables: Record<string, TableStatus>
}

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/setup')
      const data = await res.json()
      if (data.success) {
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to check status:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const runAction = async (action: string, label: string) => {
    setActionLoading(action)
    setMessage(null)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message || `${label} completed successfully` })
        await checkStatus()
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to execute action' })
    }
    setActionLoading(null)
  }

  const sqlMigration = `-- Run this SQL in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Decision Log Table
CREATE TABLE IF NOT EXISTS decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_end_date date NOT NULL,
  due_date date,
  status text DEFAULT 'Pending',
  owner text,
  action_type text,
  title text,
  outcome_tag text,
  notes text,
  selected_actions jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Huddle Log Table
CREATE TABLE IF NOT EXISTS huddle_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_end_date date NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Action Menu Table
CREATE TABLE IF NOT EXISTS action_menu (
  id serial PRIMARY KEY,
  title text NOT NULL UNIQUE,
  category text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddle_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_menu ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Enable all for authenticated users" ON decision_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON huddle_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON action_menu
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON action_menu
  FOR INSERT TO authenticated WITH CHECK (true);`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlMigration)
    setMessage({ type: 'success', text: 'SQL copied to clipboard!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const tables = [
    { key: 'decision_log', name: 'Decision Log', description: 'Stores cycle decisions and outcomes' },
    { key: 'huddle_log', name: 'Huddle Log', description: 'Tracks huddle meetings per cycle' },
    { key: 'action_menu', name: 'Action Menu', description: 'Available actions for decisions' },
  ]

  return (
    <div className="min-h-screen bg-[var(--stone)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--navy)] mb-2">Database Setup</h1>
          <p className="text-gray-600">Configure and initialize database tables for Implementation Health</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Table Status */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--navy)]">Table Status</h2>
              <button
                onClick={checkStatus}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {tables.map((table) => {
              const tableStatus = status?.tables?.[table.key]
              const exists = tableStatus?.exists ?? false

              return (
                <div key={table.key} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{table.name}</h3>
                    <p className="text-sm text-gray-500">{table.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {loading ? (
                      <span className="text-sm text-gray-400">Checking...</span>
                    ) : exists ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Exists
                        {tableStatus?.count !== undefined && ` (${tableStatus.count} rows)`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Missing
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[var(--navy)]">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={() => runAction('seed_action_menu', 'Seed Action Menu')}
              disabled={actionLoading !== null || !status?.tables?.action_menu?.exists}
              className="w-full flex items-center justify-between p-3 bg-[var(--navy)] text-white rounded-lg hover:bg-[var(--navy-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Seed Default Action Menu Items</span>
              </div>
              {actionLoading === 'seed_action_menu' && (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </button>
            {!status?.tables?.action_menu?.exists && (
              <p className="text-sm text-amber-600">Create the action_menu table first before seeding data.</p>
            )}
          </div>
        </div>

        {/* SQL Migration */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--navy)]">SQL Migration</h2>
                <p className="text-sm text-gray-500 mt-1">Copy and run in Supabase SQL Editor</p>
              </div>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-[var(--brass)] text-white rounded-lg hover:bg-[var(--brass-light)] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy SQL
              </button>
            </div>
          </div>
          <div className="p-4">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {sqlMigration}
            </pre>
          </div>
          <div className="p-4 bg-amber-50 border-t border-amber-100">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-800">Instructions</h4>
                <ol className="mt-2 text-sm text-amber-700 space-y-1 list-decimal list-inside">
                  <li>Go to your Supabase Dashboard</li>
                  <li>Navigate to <strong>SQL Editor</strong> in the sidebar</li>
                  <li>Click <strong>New Query</strong></li>
                  <li>Paste the SQL above and click <strong>Run</strong></li>
                  <li>Return here and click <strong>Refresh</strong> to verify</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
