#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1)
    if (error) {
      if (error.code === '42P01') {
        console.log(`${tableName}: NOT_EXISTS`)
      } else {
        console.log(`${tableName}: ERROR ${error.message}`)
      }
    } else {
      console.log(`${tableName}: EXISTS`)
    }
  } catch (e) {
    console.log(`${tableName}: ERROR ${e.message}`)
  }
}

;(async () => {
  console.log('Checking tables: vote, votes')
  await checkTable('vote')
  await checkTable('votes')
})();
