import { createClient } from '@supabase/supabase-js'

// 专门用于文件存储的Supabase实例
const storageSupabaseUrl = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL || ''
const storageSupabaseAnonKey = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY || ''

export const storageSupabase = createClient(storageSupabaseUrl, storageSupabaseAnonKey)
