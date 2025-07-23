// 调试雷达图问题
// 运行命令: node debug-radar-chart.js

console.log('🔍 调试雷达图问题...\n');

// 模拟雷达图数据
const radarData = {
  subject: "高等数学A(上)",
  A: 80,
  B: 90,
  fullMark: 100
};

console.log('📊 当前雷达图数据结构:');
console.log('radarData:', radarData);

// 模拟当前的数据传递方式
const currentDataFormat = {[radarData.subject]: radarData.A};
console.log('\n🔧 当前传递给 RadarChart 的数据:');
console.log('data:', currentDataFormat);

console.log('\n❌ 问题分析:');
console.log('1. 数据只有一个字段:', Object.keys(currentDataFormat));
console.log('2. 数据值:', Object.values(currentDataFormat));
console.log('3. 只有一个数据点，无法形成多边形');

console.log('\n✅ 解决方案:');
console.log('雷达图需要多个维度的数据才能形成多边形图形');
console.log('建议的数据结构:');

// 建议的多维度数据结构
const suggestedData1 = {
  '当前学生': radarData.A,
  '平均分': 75,
  '最高分': radarData.fullMark,
  '及格线': 60
};

const suggestedData2 = {
  '理解能力': 85,
  '应用能力': 78,
  '计算能力': 92,
  '逻辑思维': 88,
  '解题速度': 75
};

console.log('\n方案1 - 成绩对比维度:');
console.log(suggestedData1);

console.log('\n方案2 - 能力评估维度:');
console.log(suggestedData2);

console.log('\n🔧 修复步骤:');
console.log('1. 修改 getRadarChartData 函数返回多维度数据');
console.log('2. 或者修改 RadarChart 组件处理单一数据点的情况');
console.log('3. 在 grades/page.tsx 中调整数据传递方式');

console.log('\n📈 数学分析:');
console.log('- 单个数据点: 无法形成多边形');
console.log('- 两个数据点: 形成一条直线');
console.log('- 三个及以上数据点: 形成多边形雷达图');

console.log('\n🎯 推荐实现:');
console.log('为每门课程创建多个评估维度，如:');
console.log('- 课堂表现、作业完成度、考试成绩、参与度等');
console.log('- 或与班级平均分、最高分、最低分对比'); 