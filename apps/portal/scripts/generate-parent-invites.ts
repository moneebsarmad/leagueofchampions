/**
 * Generate email-bound parent invite codes (two parents per student) and export CSV.
 *
 * Usage:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/generate-parent-invites.ts
 *
 * Optional env:
 * - OUTPUT_PATH=./parent-invites.csv
 * - OVERWRITE=true (regenerate even if invite exists)
 * - CODE_LENGTH=10
 * - STUDENT_LIMIT=0 (0 = all)
 * - DEMO_PASSWORD=DemoPass2026!
 * - PARENT_EMAIL_MODE=dad-mom (dad-mom | parent1-parent2)
 */

import { createHash, randomBytes } from 'crypto'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssmoznrefecxcuglubuu.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const OUTPUT_PATH = process.env.OUTPUT_PATH || join(process.cwd(), 'parent-invites.csv')
const OVERWRITE = String(process.env.OVERWRITE || '').toLowerCase() === 'true'
const CODE_LENGTH = Math.max(6, Number(process.env.CODE_LENGTH || 10))
const STUDENT_LIMIT = Math.max(0, Number(process.env.STUDENT_LIMIT || 0))
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoPass2026!'
const PARENT_EMAIL_MODE = (process.env.PARENT_EMAIL_MODE || 'dad-mom').toLowerCase()

function buildParentEmails(tag: string) {
  if (PARENT_EMAIL_MODE === 'parent1-parent2') {
    return [`family${tag}.parent1@demo.los`, `family${tag}.parent2@demo.los`]
  }

  return [`family${tag}.dad@demo.los`, `family${tag}.mom@demo.los`]
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type StudentRow = {
  student_id: string
  student_name: string
  grade: number | null
  section: string | null
}

type AuthUser = { id: string; email?: string }
type ProfileRow = { id: string }

function familyTag(index: number) {
  return String(index).padStart(3, '0')
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

async function listAllAuthUsers() {
  const allUsers: AuthUser[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`Error fetching auth users: ${error.message}`)
    }

    allUsers.push(...data.users)
    if (data.users.length < perPage) break
    page += 1
  }

  return allUsers
}

async function createAuthUser(email: string, fullName: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (error) {
    throw new Error(`Auth creation failed: ${error.message}`)
  }

  return data.user.id
}

async function ensureParentProfile(userId: string) {
  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Profile lookup failed: ${existingError.message}`)
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        role: 'parent',
        linked_student_id: null,
      })

    if (insertError) {
      throw new Error(`Profile creation failed: ${insertError.message}`)
    }

    return
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      role: 'parent',
      linked_student_id: null,
    })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`Profile update failed: ${updateError.message}`)
  }
}

async function upsertInvite(params: {
  parentEmail: string
  studentId: string
  codeHash: string
}) {
  const { parentEmail, studentId, codeHash } = params

  if (!OVERWRITE) {
    const { data: existing, error: existingError } = await supabase
      .from('parent_invites')
      .select('invite_id')
      .eq('parent_email', parentEmail)
      .eq('student_id', studentId)
      .maybeSingle()

    if (existingError) {
      throw new Error(`Invite lookup failed: ${existingError.message}`)
    }

    if (existing) {
      return { status: 'skipped' as const }
    }
  }

  const { error } = await supabase
    .from('parent_invites')
    .upsert({
      parent_email: parentEmail,
      student_id: studentId,
      code_hash: codeHash,
      active: true,
      redeemed_by: null,
      redeemed_at: null,
    }, { onConflict: 'parent_email,student_id' })

  if (error) {
    throw new Error(`Invite upsert failed: ${error.message}`)
  }

  return { status: 'created' as const }
}

async function main() {
  console.log('🔧 Generating parent invite codes...')

  console.log('📋 Fetching students...')
  const query = supabase
    .from('students')
    .select('student_id, student_name, grade, section')
    .order('grade', { ascending: true })
    .order('section', { ascending: true })
    .order('student_name', { ascending: true })

  const { data: students, error: studentsError } =
    STUDENT_LIMIT > 0 ? await query.limit(STUDENT_LIMIT) : await query

  if (studentsError) {
    throw new Error(`Error fetching students: ${studentsError.message}`)
  }

  if (!students || students.length === 0) {
    throw new Error('No students found.')
  }

  console.log(`   Using ${students.length} students.\n`)

  console.log('🔍 Loading existing auth users...')
  const authUsers = await listAllAuthUsers()
  const authByEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u.id]))
  console.log(`   Found ${authUsers.length} auth users.\n`)

  console.log('🔍 Loading existing profiles...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')

  if (profilesError) {
    throw new Error(`Error fetching profiles: ${profilesError.message}`)
  }

  const profileIds = new Set((profiles || []).map((p: ProfileRow) => p.id))
  console.log(`   Found ${profiles?.length ?? 0} profiles.\n`)

  const csvRows: Array<Record<string, string | number>> = []
  let createdInvites = 0
  let skippedInvites = 0

  for (let i = 0; i < students.length; i += 1) {
    const student = students[i] as StudentRow
    const tag = familyTag(i + 1)
    if (!OVERWRITE) {
      const { data: existingInvite, error: existingError } = await supabase
        .from('parent_invites')
        .select('invite_id')
        .eq('student_id', student.student_id)
        .limit(1)
        .maybeSingle()

      if (existingError) {
        throw new Error(`Invite lookup failed: ${existingError.message}`)
      }

      if (existingInvite) {
        console.log(`⏭️  Skipping student ${student.student_id} (invites already exist)`)
        continue
      }
    }

    const code = generateCode(CODE_LENGTH)
    const codeHash = hashCode(code)

    const parentEmails = buildParentEmails(tag)

    for (const parentEmail of parentEmails) {
      const emailKey = parentEmail.toLowerCase()
      let userId = authByEmail.get(emailKey) || null
      let isNewUser = false

      if (!userId) {
        userId = await createAuthUser(parentEmail, `Family ${tag} Parent`)
        authByEmail.set(emailKey, userId)
        isNewUser = true
        console.log(`✅ Created auth user for ${parentEmail}`)
      }

      if (userId) {
        await ensureParentProfile(userId)
        profileIds.add(userId)
        console.log(`   📝 Ensured parent profile for ${parentEmail}`)
      }

      const inviteResult = await upsertInvite({
        parentEmail,
        studentId: student.student_id,
        codeHash,
      })

      if (inviteResult.status === 'created') {
        createdInvites += 1
        csvRows.push({
          student_id: student.student_id,
          student_name: student.student_name || '',
          grade: student.grade ?? '',
          section: student.section ?? '',
          parent_email: parentEmail,
          parent_password: isNewUser ? DEMO_PASSWORD : '(existing account)',
          code,
        })
      } else {
        skippedInvites += 1
      }
    }
  }

  const header = [
    'student_id',
    'student_name',
    'grade',
    'section',
    'parent_email',
    'parent_password',
    'code',
  ]

  const csvLines = [header.join(',')]
  for (const row of csvRows) {
    const values = header.map((key) => {
      const value = (row as Record<string, string | number>)[key] ?? ''
      const escaped = String(value).replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvLines.push(values.join(','))
  }

  writeFileSync(OUTPUT_PATH, csvLines.join('\n'), 'utf8')

  console.log(`✅ Created/updated ${createdInvites} invites, skipped ${skippedInvites}.`)
  console.log(`📄 CSV written to ${OUTPUT_PATH}`)
  console.log(`🔑 Demo parent password: ${DEMO_PASSWORD}`)
}

main().catch((err) => {
  console.error('❌ Failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
