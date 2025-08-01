// 测试环境变量
require('dotenv').config({ path: '.env.local' });

console.log('环境变量测试:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '已设置' : '未设置');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已设置' : '未设置');

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log('URL长度:', process.env.NEXT_PUBLIC_SUPABASE_URL.length);
}
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('KEY长度:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length);
} 