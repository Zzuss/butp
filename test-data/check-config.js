// 配置检查脚本
require('dotenv').config({ path: '.env.local' });

console.log('🔧 检查环境配置...\n');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASELOCAL_URL', 
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY'
];

console.log('环境变量状态:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: 未设置`);
  }
});

console.log('\n推荐的配置:');
console.log('确保 .env.local 文件包含以下变量之一:');
console.log('- NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('- NEXT_PUBLIC_SUPABASELOCAL_URL + NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY');
console.log('- 可选: SUPABASE_SERVICE_ROLE_KEY (用于管理员操作)');

// 测试当前配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY;

console.log('\n当前使用的配置:');
console.log(`URL: ${supabaseUrl || '未配置'}`);
console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : '未配置'}`);

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ 配置不完整，请检查 .env.local 文件');
} else {
  console.log('\n✅ 配置看起来正常');
}
