/**
 * Hard-link demo parents to students (no code redemption needed).
 *
 * Usage:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/link-demo-parents.ts
 *
 * Optional env:
 * - STUDENT_LIMIT=0 (0 = all)
 * - DEMO_PASSWORD=DemoPass2026!
 * - PARENT_EMAIL_MODE=dad-mom (dad-mom | parent1-parent2)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssmoznrefecxcuglubuu.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const STUDENT_LIMIT = Math.max(0, Number(process.env.STUDENT_LIMIT || 0))
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoPass2026!'
const PARENT_EMAIL_MODE = (process.env.PARENT_EMAIL_MODE || 'dad-mom').toLowerCase()

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

function familyTag(index: number) {
  return String(index).padStart(3, '0')
}

function buildParentEmails(tag: string) {
  if (PARENT_EMAIL_MODE === 'parent1-parent2') {
    return [`family${tag}.parent1@demo.los`, `family${tag}.parent2@demo.los`]
  }

  return [`family${tag}.dad@demo.los`, `family${tag}.mom@demo.los`]
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
    user_metadata: { full_name: fullName },
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

async function main() {
  console.log('🔧 Hard-linking demo parents to students...')

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

  const authUsers = await listAllAuthUsers()
  const authByEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u.id]))

  let createdUsers = 0
  let linkedPairs = 0

  for (let i = 0; i < students.length; i += 1) {
    const student = students[i] as StudentRow
    const tag = familyTag(i + 1)
    const parentEmails = buildParentEmails(tag)

    for (const parentEmail of parentEmails) {
      const emailKey = parentEmail.toLowerCase()
      let userId = authByEmail.get(emailKey) || null

      if (!userId) {
        userId = await createAuthUser(parentEmail, `Family ${tag} Parent`)
        authByEmail.set(emailKey, userId)
        createdUsers += 1
        console.log(`✅ Created auth user for ${parentEmail}`)
      }

      if (userId) {
        await ensureParentProfile(userId)
        const { error: linkError } = await supabase
          .from('parent_students')
          .upsert({
            parent_id: userId,
            student_id: student.student_id,
          }, { onConflict: 'parent_id,student_id' })

        if (linkError) {
          throw new Error(`Link failed for ${parentEmail}: ${linkError.message}`)
        }

        linkedPairs += 1
      }
    }
  }

  console.log(`✅ Linked ${linkedPairs} parent-student pairs.`)
  if (createdUsers > 0) {
    console.log(`🔑 Demo parent password: ${DEMO_PASSWORD}`)
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
