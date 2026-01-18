/**
 * Generate student invite codes (one per student) and export CSV.
 *
 * Usage:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx generate-student-invite-codes.ts
 *
 * Optional env:
 * - OUTPUT_PATH=./student-invite-codes.csv
 * - OVERWRITE=true (regenerate even if code exists)
 * - CODE_LENGTH=10
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'
import { writeFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssmoznrefecxcuglubuu.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const OUTPUT_PATH = process.env.OUTPUT_PATH || join(process.cwd(), 'student-invite-codes.csv')
const OVERWRITE = String(process.env.OVERWRITE || '').toLowerCase() === 'true'
const CODE_LENGTH = Math.max(6, Number(process.env.CODE_LENGTH || 10))

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type StudentRow = {
  student_id: string
  student_name: string
  grade: number | null
  section: string | null
  parent_code?: string | null
}

function generateCode(length: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = randomBytes(length)
  for (let i = 0; i < length; i += 1) {
    code += alphabet[bytes[i] % alphabet.length]
  }
  return code
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

async function main() {
  console.log('🔧 Generating student invite codes...')

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_id, student_name, grade, section, parent_code')
    .order('grade', { ascending: true })
    .order('section', { ascending: true })
    .order('student_name', { ascending: true })

  if (studentsError) {
    throw new Error(`Error fetching students: ${studentsError.message}`)
  }

  const rows: Array<Record<string, string | number>> = []
  let created = 0
  let skipped = 0

  for (const student of (students || []) as StudentRow[]) {
    const hasExisting = Boolean(student.parent_code)
    if (hasExisting && !OVERWRITE) {
      skipped += 1
      continue
    }

    const code = generateCode(CODE_LENGTH)
    const codeHash = hashCode(code)

    const { error: updateError } = await supabase
      .from('students')
      .update({ parent_code: codeHash })
      .eq('student_id', student.student_id)

    if (updateError) {
      throw new Error(`Error updating code for ${student.student_id}: ${updateError.message}`)
    }

    rows.push({
      student_id: student.student_id,
      student_name: student.student_name || '',
      grade: student.grade ?? '',
      section: student.section ?? '',
      code,
    })

    created += 1
  }

  const header = ['student_id', 'student_name', 'grade', 'section', 'code']
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

  console.log(`✅ Created/updated ${created} codes, skipped ${skipped}.`)
  console.log(`📄 CSV written to ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
