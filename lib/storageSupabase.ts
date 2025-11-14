import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 按需创建，避免在构建期因缺失环境变量而抛错
export function getStorageSupabase(): SupabaseClient {
  const storageSupabaseUrl = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL
  const storageSupabaseAnonKey = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY

  if (!storageSupabaseUrl || !storageSupabaseAnonKey) {
    throw new Error('Storage Supabase 环境变量缺失：请设置 NEXT_PUBLIC_STORAGE_SUPABASE_URL 与 NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY')
  }

  return createClient(storageSupabaseUrl, storageSupabaseAnonKey)
}
