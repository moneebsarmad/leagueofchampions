'use client'

import { useEffect, useMemo, useState } from 'react'

type UploadRecord = {
  upload_id: string
  file_name: string | null
  source_system: string | null
  created_at: string
}

type UploadResponse = {
  upload_id?: string
  analyzed?: number
  students_updated?: number
  errors?: { row: number; message: string }[]
  error?: string
}

const sampleCsv = `student_id,student_name,grade,section,event_type,event_date,event_time,staff_name,class_context,location,category,subcategory,severity,points,notes
f2a6b2e0-0000-0000-0000-000000000001,Ayah Ali,6,A,merit,2025-01-08,09:15,Maryam Khan,Homeroom,Classroom,Leadership,Helping peers,minor,5,Positive support
f2a6b2e0-0000-0000-0000-000000000002,Adam Bashar,7,B,demerit,2025-01-09,10:30,Sarah Malik,Math,Classroom,Conduct,Talking,moderate,2,Disruptive talking
`

export default function BehaviourIntelligencePage() {
  const [file, setFile] = useState<File | null>(null)
  const [sourceSystem, setSourceSystem] = useState('Manual Upload')
  const [uploading, setUploading] = useState(false)
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [recentUploads, setRecentUploads] = useState<UploadRecord[]>([])
  const [refreshingUploads, setRefreshingUploads] = useState(false)

  const sampleCsvHref = useMemo(() => {
    return `data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`
  }, [])

  const loadUploads = async () => {
    setRefreshingUploads(true)
    setRecentUploads([])
    setRefreshingUploads(false)
  }

  useEffect(() => {
    loadUploads()
  }, [])

  const handleUpload = async () => {
    setUploadError(null)
    setUploadResponse(null)

    if (!file) {
      setUploadError('Please choose a CSV or PDF file to upload.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source_system', sourceSystem.trim() || 'Manual Upload')

      const response = await fetch('/api/behaviour/upload', {
        method: 'POST',
        body: formData})
      const contentType = response.headers.get('content-type') || ''
      const rawBody = (await response.text()).trim()
      let data: UploadResponse
      if (contentType.includes('application/json') && rawBody) {
        try {
          data = JSON.parse(rawBody) as UploadResponse
        } catch (error) {
          data = { error: `Upload failed: ${String(error)}` }
        }
      } else {
        data = { error: rawBody }
      }

      if (!response.ok) {
        setUploadError(data.error || 'Upload failed. Please review the file and try again.')
      } else {
        setUploadResponse(data)
        setFile(null)
        await loadUploads()
      }
    } catch (error) {
      setUploadError((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)] mb-2">Behaviour Intelligence</p>
        <h1
          className="text-3xl font-bold text-[var(--text)] mb-2"
        >
          Behaviour Intelligence Console
        </h1>
        <p className="text-[var(--text-muted)] max-w-2xl">
          Upload merit and demerit logs, track ingestion status, and trigger insight recomputation. All logic is rules-based and
          stored in Supabase for transparent auditability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="card rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[var(--text)] mb-2">
            Analyse Behaviour Data
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Upload discipline reports to generate insights. The system analyses events in-memory and stores only computed patterns
            and summaries - <span className="font-semibold">no raw event data is retained</span>.
          </p>

          <div className="grid gap-5">
            <div className="border border-dashed border-[var(--border)] rounded-2xl p-5 bg-white/60">
              <label className="text-xs tracking-[0.2em] text-[var(--text-muted)]">Behaviour file</label>
              <div className="mt-3 flex flex-col gap-3">
                <input
                  type="file"
                  accept=".csv,.pdf"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="text-sm text-[var(--text-muted)] file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-white file:shadow-sm hover:file:bg-[var(--accent-2)]"
                />
                <div className="text-xs text-[var(--text-muted)]">
                  CSV and PDF reports are supported. PDFs are parsed from the Discipline Event Summary format.
                </div>
                <a
                  href={sampleCsvHref}
                  download="behaviour_events_sample.csv"
                  className="text-xs text-[var(--accent-2)] font-semibold underline underline-offset-4"
                >
                  Download sample CSV
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[var(--border)]">
              <label className="text-xs tracking-[0.2em] text-[var(--text-muted)]">Source system</label>
              <input
                value={sourceSystem}
                onChange={(event) => setSourceSystem(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="Manual Upload"
              />
            </div>

            {uploadError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]">
                {uploadError}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary text-sm font-semibold px-6 py-3 shadow-sm disabled:opacity-60"
            >
              {uploading ? 'Analysing...' : 'Analyse Behaviour File'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">
              Latest Analysis Result
            </h3>
            {!uploadResponse && <p className="text-sm text-[var(--text-muted)]">No analyses yet.</p>}
            {uploadResponse && (
              <div className="space-y-3 text-sm">
                {uploadResponse.error && <p className="text-[var(--danger)]">{uploadResponse.error}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Upload ID</span>
                  <span className="font-semibold text-[var(--text)]">{uploadResponse.upload_id || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Events analysed</span>
                  <span className="font-semibold text-[var(--text)]">{uploadResponse.analyzed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Students updated</span>
                  <span className="font-semibold text-[var(--text)]">{uploadResponse.students_updated ?? 0}</span>
                </div>
                {uploadResponse.errors && uploadResponse.errors.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--text-muted)]">
                    <p className="font-semibold text-[var(--text)] mb-2">Row issues</p>
                    <ul className="space-y-1">
                      {uploadResponse.errors.slice(0, 4).map((item) => (
                        <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>
                      ))}
                      {uploadResponse.errors.length > 4 && <li>+{uploadResponse.errors.length - 4} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text)]">
                Recent Uploads
              </h3>
              <button
                onClick={loadUploads}
                className="text-xs font-semibold text-[var(--accent-2)] underline underline-offset-4"
                disabled={refreshingUploads}
              >
                {refreshingUploads ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {recentUploads.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No uploads recorded yet.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {recentUploads.map((upload) => (
                  <div key={upload.upload_id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{upload.file_name || 'Manual upload'}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {upload.source_system || 'Unknown source'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-[var(--text-muted)]">
                      {new Date(upload.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
