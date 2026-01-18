/**
 * Export parent demo credentials + linked student info to CSV.
 *
 * Usage:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx export-parent-credentials.ts
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssmoznrefecxcuglubuu.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoPass2026!'
const OUTPUT_PATH = process.env.OUTPUT_PATH || join(process.cwd(), 'parent-demo-accounts.csv')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function listAllAuthUsers() {
  const allUsers: { id: string; email?: string }[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Error fetching auth users: ${error.message}`)

    allUsers.push(...data.users)
    if (data.users.length < perPage) break
    page += 1
  }

  return allUsers
}

async function main() {
  console.log('📥 Exporting parent demo credentials...')

  const authUsers = await listAllAuthUsers()
  const authById = new Map(authUsers.map((u) => [u.id, u.email || '']))

  const { data: parentProfiles, error: parentError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'parent')

  if (parentError) {
    throw new Error(`Error fetching parent profiles: ${parentError.message}`)
  }

  const parentIds = (parentProfiles || []).map((p) => p.id)

  const { data: links, error: linksError } = await supabase
    .from('parent_students')
    .select('parent_id, student_id')
    .in('parent_id', parentIds)

  if (linksError) {
    throw new Error(`Error fetching parent links: ${linksError.message}`)
  }

  const studentIds = Array.from(new Set((links || []).map((l) => l.student_id)))

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_id, student_name, grade, section')
    .in('student_id', studentIds)

  if (studentsError) {
    throw new Error(`Error fetching students: ${studentsError.message}`)
  }

  const studentById = new Map(
    (students || []).map((s) => [s.student_id, {
      name: s.student_name || '',
      grade: s.grade ?? '',
      section: s.section ?? '',
    }])
  )

  const rows = (links || []).map((link) => {
    const email = authById.get(link.parent_id) || ''
    const student = studentById.get(link.student_id) || { name: '', grade: '', section: '' }

    return {
      email,
      password: DEMO_PASSWORD,
      role: 'parent',
      student_id: link.student_id,
      student_name: student.name,
      grade: student.grade,
      section: student.section,
    }
  }).filter((row) => row.email)

  const header = ['email', 'password', 'role', 'student_id', 'student_name', 'grade', 'section']
  const csvLines = [header.join(',')]

  for (const row of rows) {
    const values = header.map((key) => {
      const value = (row as Record<string, string | number>)[key] ?? ''
      const escaped = String(value).replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvLines.push(values.join(','))
  }

  writeFileSync(OUTPUT_PATH, csvLines.join('\n'), 'utf8')

  console.log(`✅ Exported ${rows.length} parent credentials to ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('❌ Export failed:', err)
  process.exit(1)
})
