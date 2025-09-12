#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey)

;(async () => {
  console.log('Fetching vote table...')
  const { data, error } = await supabase
    .from('vote')
    .select('*')
    .limit(200)

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`Rows: ${data.length}`)
  // Print first 20 rows
  data.slice(0, 20).forEach((row, idx) => {
    console.log(`${idx + 1}. SNH=${row.SNH} | option=${row.option}`)
  })

  // Summary counts per option
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  for (const row of data) {
    const parts = String(row.option || '').split(/\s+/).map(s => s.trim()).filter(Boolean)
    for (const p of parts) {
      if (counts[p] !== undefined) counts[p]++
    }
  }
  console.log('Counts:', counts)
})();
