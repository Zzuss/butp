// 测试从student_abilities_rada表获取能力数据
const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端（需要替换为实际的配置）
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAbilityData() {
  try {
    console.log('测试从student_abilities_rada表获取数据...');
    
    // 测试查询一个学生的数据
    const { data, error } = await supabase
      .from('student_abilities_rada')
      .select('数理逻辑与科学基础, 专业核心技术, 人文与社会素养, 工程实践与创新应用, 职业发展与团队协作')
      .limit(1)
      .single();

    if (error) {
      console.error('查询错误:', error);
      return;
    }

    if (data) {
      console.log('查询到的数据:', data);
      console.log('数据字段数量:', Object.keys(data).length);
      
      // 转换为数组格式
      const abilityArray = [
        data.数理逻辑与科学基础 || 50,
        data.专业核心技术 || 70,
        data.人文与社会素养 || 80,
        data.工程实践与创新应用 || 50,
        data.职业发展与团队协作 || 70
      ];
      
      console.log('转换后的数组:', abilityArray);
      console.log('数组长度:', abilityArray.length);
    } else {
      console.log('没有找到数据');
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 运行测试
testAbilityData();
