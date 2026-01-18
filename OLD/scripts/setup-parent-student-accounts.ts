/**
 * LEAGUE OF STARS - Demo Parent + Student Account Setup Script
 *
 * Creates:
 * - 150 families with 2 parent accounts each (dad + mom)
 * - parent_students links for each parent to an existing student
 *
 * Prerequisites:
 * 1. SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard > Settings > API
 * 2. npm install (in this folder)
 *
 * Usage:
 * SUPABASE_SERVICE_ROLE_KEY=your-key npx tsx setup-parent-student-accounts.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssmoznrefecxcuglubuu.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.error('   Usage: SUPABASE_SERVICE_ROLE_KEY=your-key npx tsx setup-parent-student-accounts.ts')
  process.exit(1)
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoPass2026!'
const FAMILY_COUNT = 150

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

type StudentRow = {
  student_id: string
  student_name: string
  grade: number | null
  section: string | null
}

type CreatedAccount = {
  email: string
  password: string
  role: 'parent'
  status: 'created' | 'skipped' | 'error'
  error?: string
}

function familyTag(index: number) {
  return String(index).padStart(3, '0')
}

async function listAllAuthUsers() {
  const allUsers: { id: string; email?: string }[] = []
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

async function main() {
  console.log('🚀 League of Stars - Demo Parent + Student Account Setup')
  console.log('========================================================\n')

  console.log('📋 Fetching students...')
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_id, student_name, grade, section')
    .order('grade', { ascending: true })
    .order('section', { ascending: true })
    .order('student_name', { ascending: true })
    .limit(FAMILY_COUNT)

  if (studentsError) {
    console.error('❌ Error fetching students:', studentsError.message)
    process.exit(1)
  }

  if (!students || students.length < FAMILY_COUNT) {
    console.error(`❌ Not enough students found. Needed ${FAMILY_COUNT}, found ${students?.length ?? 0}.`)
    process.exit(1)
  }

  console.log(`   Using ${students.length} students for demo families.\n`)

  console.log('🔍 Loading existing auth users...')
  const authUsers = await listAllAuthUsers()
  const authByEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u.id]))
  console.log(`   Found ${authUsers.length} auth users.\n`)

  console.log('🔍 Loading existing profiles...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message)
    process.exit(1)
  }

  const profileIds = new Set((profiles || []).map((p) => p.id))
  console.log(`   Found ${profiles?.length ?? 0} profiles.\n`)

  const results: CreatedAccount[] = []

  for (let i = 0; i < students.length; i += 1) {
    const student = students[i] as StudentRow
    const tag = familyTag(i + 1)

    const dadEmail = `family${tag}.dad@demo.los`
    const momEmail = `family${tag}.mom@demo.los`

    const studentName = String(student.student_name || `Student ${tag}`)

    const accounts = [
      { email: dadEmail, role: 'parent' as const, name: `Family ${tag} - Dad` },
      { email: momEmail, role: 'parent' as const, name: `Family ${tag} - Mom` },
    ]

    for (const account of accounts) {
      const emailKey = account.email.toLowerCase()
      const hasAuth = authByEmail.has(emailKey)
      let userId = hasAuth ? authByEmail.get(emailKey) : null
      const hasProfile = userId ? profileIds.has(userId) : false

      try {
        if (!userId) {
          userId = await createAuthUser(account.email, account.name)
          authByEmail.set(emailKey, userId)
          console.log(`✅ Created auth user for ${account.email}`)
        }

        if (!hasProfile && userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              role: account.role,
              linked_student_id: null,
            })

          if (profileError) {
            throw new Error(`Profile creation failed: ${profileError.message}`)
          }

          profileIds.add(userId)
          console.log(`   📝 Created profile for ${account.email} (${account.role})`)
        } else if (userId) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: account.role,
              linked_student_id: null,
            })
            .eq('id', userId)

          if (updateError) {
            throw new Error(`Profile update failed: ${updateError.message}`)
          }
        }

        results.push({
          email: account.email,
          password: hasAuth ? '(existing account)' : DEMO_PASSWORD,
          role: account.role,
          status: hasAuth ? 'skipped' : 'created',
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`❌ Error for ${account.email}: ${message}`)
        results.push({
          email: account.email,
          password: '',
          role: account.role,
          status: 'error',
          error: message,
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    const parentIds = [authByEmail.get(dadEmail.toLowerCase()), authByEmail.get(momEmail.toLowerCase())]
      .filter(Boolean) as string[]

    for (const parentId of parentIds) {
      const { error: linkError } = await supabase
        .from('parent_students')
        .upsert({
          parent_id: parentId,
          student_id: student.student_id,
        }, { onConflict: 'parent_id,student_id' })

      if (linkError) {
        console.error(`❌ Error linking parent ${parentId} to student ${student.student_id}: ${linkError.message}`)
      }
    }
  }

  const created = results.filter((r) => r.status === 'created').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const errors = results.filter((r) => r.status === 'error').length

  console.log('\n=========================================')
  console.log('📊 SUMMARY')
  console.log('=========================================')
  console.log(`✅ Created: ${created}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log(`📋 Total processed: ${results.length}`)

  const newAccounts = results.filter((r) => r.status === 'created')
  if (newAccounts.length > 0) {
    console.log('\n=========================================')
    console.log('🔑 DEMO ACCOUNT CREDENTIALS')
    console.log('=========================================')
    console.log(`All new demo accounts share the same password: ${DEMO_PASSWORD}`)
    console.log('Examples:')
    console.log('  family001.dad@demo.los')
    console.log('  family001.mom@demo.los')
    console.log('---')
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
