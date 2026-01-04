import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

type CsvRow = Record<string, string>

const normaliseHeader = (value: string) =>
  value
    .trim()
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')

const parseCsv = (text: string) => {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1
      }
      row.push(current)
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row)
      }
      row = []
      current = ''
      continue
    }

    current += char
  }

  row.push(current)
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row)
  }

  if (rows.length === 0) return []

  const headers = rows[0].map(normaliseHeader)
  return rows.slice(1).map((cells) => {
    const record: CsvRow = {}
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? '').trim()
    })
    return record
  })
}

const parseDisciplinePdf = async (file: File) => {
  const { default: pdfParse } = await import('pdf-parse')
  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await pdfParse(buffer)
  const lines = result.text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('--') && !/Author\s*Details\s*Points/i.test(line))

  const rows: CsvRow[] = []
  let currentGrade: number | null = null
  let currentStudent: string | null = null

  const isGradeLine = (line: string) => /^\d{1,2}(st|nd|rd|th)$/i.test(line)
  const isDateLine = (line: string) => /^\d{2}\/\d{2}\/\d{4}/.test(line)
  // Student names are "LastName, FirstName" format - must be capitalized words only
  const isStudentLine = (line: string) => {
    // Must start with a letter and contain exactly one comma separating two capitalized name parts
    if (!line.includes(',') || isDateLine(line)) return false
    // Exclude lines with keywords that appear in event data
    if (/Violation|Description|Resolution|Student Total|Grand Total|MS\s*:|Level\s*\d|salah|class|behavior|warned|talking/i.test(line)) return false
    // Match pattern: "LastName, FirstName" where both parts are capitalized words
    const match = line.match(/^([A-Z][a-zA-Z\s'-]+),\s*([A-Z][a-zA-Z\s'-]*)$/)
    return match !== null
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD
  const convertDate = (dateStr: string) => {
    const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (!match) return dateStr
    const [, month, day, year] = match
    return `${year}-${month}-${day}`
  }

  const parseHeader = (headerLine: string) => {
    const pointsMatch = headerLine.match(/(-?\d+)\s*$/)
    const pointsRaw = pointsMatch ? Number.parseInt(pointsMatch[1], 10) : null
    const points = pointsRaw !== null && !Number.isNaN(pointsRaw) ? Math.abs(pointsRaw) : null
    const header = pointsMatch ? headerLine.slice(0, pointsMatch.index).trim() : headerLine.trim()

    let category = ''
    let subcategory = header
    if (/Support Violation/i.test(header)) {
      category = 'Support Violation'
      subcategory = header.replace(/Support Violation/i, '').trim()
    } else if (/Violation/i.test(header)) {
      category = 'Violation'
      subcategory = header.replace(/Violation/i, '').trim()
    }

    subcategory = subcategory.replace(/^MS\s*:\s*/i, '').replace(/^Level\s*\d+\s*:\s*/i, '').trim()

    const eventType = /Buy Back/i.test(header) || (pointsRaw !== null && pointsRaw < 0) ? 'merit' : 'demerit'

    return { category, subcategory, points, eventType }
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (isGradeLine(line)) {
      currentGrade = Number.parseInt(line, 10)
      i += 1
      continue
    }

    if (isStudentLine(line)) {
      currentStudent = line
      i += 1
      continue
    }

    if (isDateLine(line) && currentStudent) {
      const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/)
      const rawDate = dateMatch ? dateMatch[1] : ''
      const eventDate = convertDate(rawDate)
      const remainder = line.replace(rawDate, '').trim().replace(/^,/, '').trim()

      let staffName = ''
      let headerLine = ''

      // Check if remainder contains "Student Support" or a staff name followed by Violation
      if (/^,?\s*Student\s*Support/i.test(remainder) || /^\s*,\s*Student$/i.test(remainder)) {
        // This is a student support entry (buy back)
        staffName = 'Student Support'
        // Look for Violation keyword
        const violationMatch = remainder.match(/Support\s*(Violation.*)/i)
        if (violationMatch) {
          headerLine = violationMatch[1]
        }
      } else {
        const keywordIndex = remainder.search(/\bViolation\b/i)
        if (keywordIndex > -1) {
          const staffPart = remainder.slice(0, keywordIndex).trim().replace(/,$/, '')
          if (staffPart && !/^\s*$/.test(staffPart)) {
            staffName = staffPart.replace(/^,\s*/, '')
          }
          headerLine = remainder.slice(keywordIndex).trim()
        } else if (remainder && !/student/i.test(remainder)) {
          staffName = remainder.replace(/^,\s*/, '')
        }
      }

      // If no header line yet, check next line
      if (!headerLine && lines[i + 1]) {
        const nextLine = lines[i + 1]
        if (/Violation/i.test(nextLine) || /Support Violation/i.test(nextLine)) {
          headerLine = nextLine
          i += 1
        }
      }

      const headerData = parseHeader(headerLine)
      let description = ''
      let resolution = ''
      let section: 'description' | 'resolution' | null = null

      i += 1
      while (i < lines.length) {
        const nextLine = lines[i]
        if (isDateLine(nextLine) || isStudentLine(nextLine) || isGradeLine(nextLine)) {
          i -= 1
          break
        }
        if (/^Description/i.test(nextLine)) {
          section = 'description'
          description += `${nextLine.replace(/^Description/i, '').trim()} `
        } else if (/^Resolution/i.test(nextLine)) {
          section = 'resolution'
          resolution += `${nextLine.replace(/^Resolution/i, '').trim()} `
        } else if (/^Student Total/i.test(nextLine) || /^Grand Total/i.test(nextLine)) {
          break
        } else if (section === 'description') {
          description += `${nextLine} `
        } else if (section === 'resolution') {
          resolution += `${nextLine} `
        }
        i += 1
      }

      const notes = [description.trim(), resolution.trim()].filter(Boolean).join(' | ')

      rows.push({
        student_name: currentStudent,
        grade: currentGrade ? String(currentGrade) : '',
        section: '',
        event_type: headerData.eventType,
        event_date: eventDate,
        staff_name: staffName,
        category: headerData.category,
        subcategory: headerData.subcategory,
        points: headerData.points !== null ? String(headerData.points) : '0',
        notes,
        source_system: 'Discipline Event Summary PDF',
      })
    }

    i += 1
  }

  return rows
}

const parseDate = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

const parseTime = (value?: string) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return null
  const parts = trimmed.split(':')
  const hours = parts[0].padStart(2, '0')
  const minutes = parts[1].padStart(2, '0')
  const seconds = parts[2] ? parts[2].padStart(2, '0') : '00'
  return `${hours}:${minutes}:${seconds}`
}

const parseIntSafe = (value?: string) => {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const normaliseEventType = (value?: string) => {
  if (!value) return null
  const lowered = value.toLowerCase().trim()
  if (lowered === 'merit' || lowered === 'demerit') return lowered
  return null
}

const normaliseSeverity = (value?: string) => {
  if (!value) return null
  const lowered = value.toLowerCase().trim()
  if (['minor', 'moderate', 'major'].includes(lowered)) return lowered
  return null
}

export async function POST() {
  return NextResponse.json({ error: 'Behaviour uploads are disabled in this read-only demo.' }, { status: 501 })
}
