/**
 * Create demo parent accounts + parents table rows and link 1-3 students per family.
 *
 * Usage:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/setup-demo-families.ts
 *
 * Optional env:
 * - FAMILY_COUNT=5
 * - MIN_KIDS=1
 * - MAX_KIDS=3
 * - DEMO_PASSWORD=DemoPass2026!
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssmoznrefecxcuglubuu.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const FAMILY_COUNT = Math.max(1, Number(process.env.FAMILY_COUNT || 5))
const MIN_KIDS = Math.max(1, Number(process.env.MIN_KIDS || 1))
const MAX_KIDS = Math.max(MIN_KIDS, Number(process.env.MAX_KIDS || 3))
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoPass2026!'

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

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(items: T[]) {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]
    copy[i] = copy[j]
    copy[j] = temp
  }
  return copy
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

async function upsertParentRecord(params: {
  parentId: string
  email: string
  firstName: string
  lastName: string
  relationship: 'father' | 'mother'
}) {
  const { parentId, email, firstName, lastName, relationship } = params
  const { error } = await supabase
    .from('parents')
    .upsert({
      parent_id: parentId,
      email,
      first_name: firstName,
      last_name: lastName,
      relationship,
    }, { onConflict: 'parent_id' })

  if (error) {
    throw new Error(`Parent upsert failed: ${error.message}`)
  }
}

async function main() {
  console.log('🔧 Setting up demo families...')

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_id, student_name, grade, section')
    .order('grade', { ascending: true })
    .order('section', { ascending: true })
    .order('student_name', { ascending: true })

  if (studentsError) {
    throw new Error(`Error fetching students: ${studentsError.message}`)
  }

  if (!students || students.length === 0) {
    throw new Error('No students found.')
  }

  const shuffledStudents = shuffle(students as StudentRow[])

  const minNeeded = FAMILY_COUNT * MIN_KIDS
  if (shuffledStudents.length < minNeeded) {
    throw new Error(`Not enough students. Need at least ${minNeeded}, found ${shuffledStudents.length}.`)
  }

  const authUsers = await listAllAuthUsers()
  const authByEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u.id]))

  let studentIndex = 0
  let createdUsers = 0
  let linkedPairs = 0

  for (let i = 0; i < FAMILY_COUNT; i += 1) {
    const tag = familyTag(i + 1)
    const lastName = `Family${tag}`
    const dadEmail = `family${tag}.dad@demo.los`
    const momEmail = `family${tag}.mom@demo.los`

    const parents = [
      { email: dadEmail, firstName: 'Dad', lastName, relationship: 'father' as const },
      { email: momEmail, firstName: 'Mom', lastName, relationship: 'mother' as const },
    ]

    const kidsCount = randomInt(MIN_KIDS, MAX_KIDS)
    const assignedStudents = shuffledStudents.slice(studentIndex, studentIndex + kidsCount)
    studentIndex += kidsCount

    for (const parent of parents) {
      const emailKey = parent.email.toLowerCase()
      let userId = authByEmail.get(emailKey) || null

      if (!userId) {
        userId = await createAuthUser(parent.email, `${parent.firstName} ${parent.lastName}`)
        authByEmail.set(emailKey, userId)
        createdUsers += 1
        console.log(`✅ Created auth user for ${parent.email}`)
      }

      if (userId) {
        await ensureParentProfile(userId)
        await upsertParentRecord({
          parentId: userId,
          email: parent.email,
          firstName: parent.firstName,
          lastName: parent.lastName,
          relationship: parent.relationship,
        })

        for (const student of assignedStudents) {
          const { error: linkError } = await supabase
            .from('parent_students')
            .upsert({
              parent_id: userId,
              student_id: student.student_id,
            }, { onConflict: 'parent_id,student_id' })

          if (linkError) {
            throw new Error(`Link failed for ${parent.email}: ${linkError.message}`)
          }

          linkedPairs += 1
        }
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
