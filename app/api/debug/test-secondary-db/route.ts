import { NextRequest, NextResponse } from 'next/server';
import { supabaseSecondary } from '@/lib/supabaseSecondary';

export async function GET(request: NextRequest) {
  try {
    // 这里假设表名为 'course'，如有不同请修改
    const { data, error } = await supabaseSecondary.from('student_number_hash_mapping_rows').select('*').limit(1);
    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
