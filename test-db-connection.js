const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 加载 .env.local 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  console.log('Looking for env file at:', envPath);
  console.log('File exists:', fs.existsSync(envPath));
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('Env file content:');
    console.log(envContent);
    
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
          console.log('Set env var:', key, '=', value);
        }
      }
    });
  }
}

loadEnvFile();

// 从环境变量获取Supabase配置（在loadEnvFile之后）
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 如果环境变量未设置，使用默认值
if (!supabaseUrl) {
  supabaseUrl = 'https://your-project-ref.supabase.co';
  console.log('Using default Supabase URL');
}
if (!supabaseKey) {
  supabaseKey = 'your-supabase-anon-key';
  console.log('Using default Supabase Key');
}

console.log('After loading env file:');
console.log('Supabase URL from env:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key from env:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Direct access to supabaseUrl:', supabaseUrl);
console.log('Direct access to supabaseKey:', supabaseKey);

console.log('Testing database connection...');
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Supabase Key:', supabaseKey ? 'Set (length: ' + supabaseKey.length + ')' : 'Not set');
console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Testing basic connection...');
    
    // 测试基本连接
    const { data, error } = await supabase
      .from('academic_results')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return;
    }
    
    console.log('✅ Database connection successful!');
    console.log('📊 Sample data:', data);
    
    // 测试特定哈希值查询
    console.log('🔍 Testing hash validation...');
    const testHash = '1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890';
    
    const { data: hashData, error: hashError } = await supabase
      .from('academic_results')
      .select('SNH')
      .eq('SNH', testHash)
      .limit(1);
    
    if (hashError) {
      console.error('❌ Hash validation failed:', hashError);
      return;
    }
    
    console.log('✅ Hash validation successful!');
    console.log('🔍 Hash found:', hashData && hashData.length > 0);
    console.log('📊 Hash data:', hashData);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection(); 