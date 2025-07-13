"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// 语言类型
export type Language = 'zh' | 'en'

// 语言上下文类型
interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

// 创建上下文
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// 翻译对象 - 目前只包含登录页面
const translations: Record<Language, Record<string, string>> = {
  zh: {
    // 登录页面
    'login.title.line1': 'Build Your Toolbox',
    'login.title.line2': 'BuTP', 
    'login.description': '请选择您的学生账号登录',
    'login.select.label': '选择学生账号',
    'login.select.placeholder': '请选择学生...',
    'login.button.login': '登录BuTP',
    'login.button.loading': '登录中...',
    'login.demo.text': '演示版本 • 仅供学习使用',
    'login.language.switch': 'Change to English',
    'login.alert.select': '请选择一个学生账号',
    
    // 侧边栏
    'sidebar.profile': '我的信息',
    'sidebar.logout': '退出登录',
    'sidebar.rolemodels': 'Role Model',
    'sidebar.charts': '图表测试',
    'sidebar.analysis': '分析模块',
    
    // Profile页面
    'profile.title': '我的信息',
    'profile.description': '管理您的个人信息和设置',
    'profile.awards.title': '获奖记录',
    'profile.awards.description': '您获得的奖项和荣誉',
    'profile.awards.add': '添加获奖',
    'profile.awards.empty': '当前栏暂无信息',
    'profile.awards.form.title': '添加获奖记录',
    'profile.awards.form.edit': '编辑获奖记录',
    'profile.awards.form.name': '奖项名称',
    'profile.awards.form.organization': '颁发单位/学年',
    'profile.awards.form.level': '级别',
    'profile.awards.form.level.placeholder': '请选择级别',
    'profile.awards.form.level.national': '国家级',
    'profile.awards.form.level.provincial': '省级',
    'profile.awards.form.level.municipal': '市级',
    'profile.awards.form.level.school': '校级',
    'profile.awards.form.level.other': '其他',
    'profile.awards.form.date': '获奖日期 (选填)',
    'profile.awards.form.date.placeholder': '例如：2024年6月',
    'profile.work.title': '工作经历',
    'profile.work.description': '您的实习和工作经历',
    'profile.work.add': '添加工作',
    'profile.work.empty': '当前栏暂无信息',
    'profile.work.form.title': '添加工作经历',
    'profile.work.form.edit': '编辑工作经历',
    'profile.work.form.position': '职位名称 *',
    'profile.work.form.position.placeholder': '例如：教学助理实习生',
    'profile.work.form.company': '公司/组织 *',
    'profile.work.form.company.placeholder': '例如：新东方教育科技集团',
    'profile.work.form.period': '工作时间 (选填)',
    'profile.work.form.period.placeholder': '例如：2024年7月 - 2024年8月',
    'profile.work.form.description': '工作描述 *',
    'profile.work.form.description.placeholder': '请简要描述您的工作内容和收获',
    'profile.language.title': '语言成绩',
    'profile.language.description': '托福、雅思、GRE等标准化考试成绩',
    'profile.language.add': '添加成绩',
    'profile.language.empty': '当前栏暂无信息',
    'profile.language.toefl.reading': '阅读',
    'profile.language.toefl.listening': '听力',
    'profile.language.toefl.speaking': '口语',
    'profile.language.toefl.writing': '写作',
    'profile.language.ielts.listening': '听力',
    'profile.language.ielts.reading': '阅读',
    'profile.language.ielts.writing': '写作',
    'profile.language.ielts.speaking': '口语',
    'profile.language.gre.math': '数学',
    'profile.language.gre.verbal': '语文',
    'profile.language.gre.writing': '写作',
    'profile.language.form.title': '添加成绩',
    'profile.language.form.edit': '更新成绩',
    'profile.language.form.type': '考试类型',
    'profile.language.form.type.placeholder': '请选择考试类型',
    'profile.language.form.total': '总分',
    'profile.language.form.toefl.max': '最高30分',
    'profile.language.form.ielts.example': '例如: 7.5',
    'profile.language.form.gre.max': '最高170分',
    'profile.language.form.gre.writing.example': '例如: 4.5',
    'profile.common.cancel': '取消',
    'profile.common.save': '保存',
    'profile.common.delete': '删除',
    'profile.common.confirm.delete': '确认删除',
    'profile.common.confirm.delete.award': '您确定要删除这条获奖记录吗？',
    'profile.common.confirm.delete.work': '您确定要删除这条工作经历吗？',
    'profile.common.confirm.delete.toefl': '您确定要删除托福成绩吗？',
    'profile.common.confirm.delete.ielts': '您确定要删除雅思成绩吗？',
    'profile.common.confirm.delete.gre': '您确定要删除GRE成绩吗？',
    'profile.common.confirm.delete.note': '此操作无法撤销。',
    
    // 侧边栏
    'sidebar.dashboard': '数据总览',
    
    // Dashboard页面
    'dashboard.title': '数据总览',
    'dashboard.description': '查看 {name} 的学习数据和表现统计',
    'dashboard.login.required': '请先登录查看学习数据',
    'dashboard.loading': '正在加载 {name} 的数据...',
    'dashboard.loading.message': '数据加载中...',
    
    // 课程统计卡片
    'dashboard.stats.average': '平均分数',
    'dashboard.stats.average.desc': '个人平均成绩',
    'dashboard.stats.pass.rate': '通过率',
    'dashboard.stats.pass.rate.desc': '课程通过率',
    'dashboard.stats.courses': '已修课程',
    'dashboard.stats.courses.desc': '总课程数量',
    'dashboard.stats.gpa': 'GPA',
    'dashboard.stats.gpa.desc': '学分绩点',
    
    // 各科成绩
    'dashboard.subjects.title': '各科成绩',
    'dashboard.subjects.description': '最近课程成绩分布',
    'dashboard.subjects.view.more': '查看更多',
    'dashboard.subjects.grade.level': '等级',
    'dashboard.subjects.no.data': '暂无成绩数据',
    
    // 课程统计
    'dashboard.course.stats.title': '课程统计',
    'dashboard.course.stats.description': '课程通过情况',
    'dashboard.course.stats.passed': '通过',
    'dashboard.course.stats.failed': '未通过',
    'dashboard.course.stats.pass.rate': '课程通过率',
    'dashboard.course.stats.summary': '已通过 {completed} / 总共 {total} 门课程',
    
    // 学期成绩趋势
    'dashboard.trends.title': '学期成绩趋势',
    'dashboard.trends.description': '各学期平均成绩变化趋势',
    'dashboard.trends.courses.count': '{count} 门课程',
    'dashboard.trends.no.data': '暂无学期数据',
    
    // 课程类型分布
    'dashboard.distribution.title': '课程类型分布',
    'dashboard.distribution.description': '不同类型课程的成绩表现',
    'dashboard.distribution.courses.count': '{count} 门',
    'dashboard.distribution.average': '平均分',
    'dashboard.distribution.no.data': '暂无课程类型数据',
    
    // Grades页面
    'grades.title': '成绩详情',
    'grades.description': '{name} 的所有课程成绩',
    'grades.login.required': '请先登录查看学习数据',
    'grades.loading': '正在加载 {name} 的数据...',
    'grades.loading.message': '数据加载中...',
    'grades.back.to.dashboard': '返回总览',
    'grades.all.courses.title': '所有课程成绩',
    'grades.all.courses.description': '课程成绩详细列表（按学分从高到低排序）',
    'grades.table.course.name': '课程名称',
    'grades.table.credit': '学分',
    'grades.table.score': '分数',
    'grades.no.data': '暂无成绩数据',
    'grades.total.courses': '共 {count} 门课程',
    
    // Role Models页面
    'rolemodels.description': '了解不同去向的典型人才特征，规划自己的职业和学业发展路径',
    'rolemodels.tab.companies': '按就业公司',
    'rolemodels.tab.schools': '按升学学校',
    'rolemodels.tab.internships': '按实习机会',
    'rolemodels.internship.duration': '实习时长',
    'rolemodels.internship.benefits': '实习收获',
    'rolemodels.internship.applications': '申请人数',
    'rolemodels.internship.details': '查看详情',
    'rolemodels.common.details': '查看详情',
    
    // Analysis页面
    'analysis.title': '分析模块',
    'analysis.description': '深入分析您的学习表现，提供个性化改进建议',
    'analysis.efficiency.title': '学习效率',
    'analysis.efficiency.desc': '+5% 比上周',
    'analysis.target.title': '目标达成率',
    'analysis.target.desc': '+3% 比上周',
    'analysis.weak.title': '弱项科目',
    'analysis.weak.desc': '需要重点关注',
    'analysis.ranking.title': '班级排名',
    'analysis.ranking.desc': '上升3名',
    'analysis.subjects.title': '各科目分析',
    'analysis.subjects.description': '当前成绩与目标对比',
    'analysis.subjects.gap': '差距: {gap}分',
    'analysis.subjects.current': '当前: {current}',
    'analysis.subjects.target': '目标: {target}',
    'analysis.ability.title': '能力评估',
    'analysis.ability.description': '各项能力综合评估',
    'analysis.ability.overall': '综合能力评分: {score}',
    'analysis.ability.logical': '逻辑思维',
    'analysis.ability.memory': '记忆能力',
    'analysis.ability.comprehension': '理解能力',
    'analysis.ability.application': '应用能力',
    'analysis.ability.innovation': '创新思维',
    'analysis.ability.expression': '表达能力',
    'analysis.checklist.title': '打卡清单',
    'analysis.checklist.description': '记录并完成您的日常任务',
    'analysis.checklist.add.placeholder': '添加新事项...',
    'analysis.checklist.completion.rate': '完成率: {rate}%',
    'analysis.improvement.title': '改进建议',
    'analysis.improvement.description': '基于数据分析的个性化建议',
    'analysis.improvement.priority.high': '高优先级',
    'analysis.improvement.priority.medium': '中优先级',
    'analysis.improvement.estimated.time': '预计用时: {time}',
    'analysis.improvement.make.plan': '制定计划',
    
    // About页面
    'about.title': '关于BuTP',
    'about.version': '当前版本 {version}'
  },
  en: {
    // 登录页面
    'login.title.line1': 'Build Your Toolbox',
    'login.title.line2': 'BuTP',
    'login.description': 'Please select your student account to login',
    'login.select.label': 'Select Student Account',
    'login.select.placeholder': 'Please select a student...',
    'login.button.login': 'Login System',
    'login.button.loading': 'Logging in...',
    'login.demo.text': 'Demo System • For Learning Purpose Only',
    'login.language.switch': '切换为中文',
    'login.alert.select': 'Please select a student account',
    
    // 侧边栏
    'sidebar.profile': 'My Profile',
    'sidebar.logout': 'Logout',
    'sidebar.rolemodels': 'Role Models',
    'sidebar.charts': 'Charts Test',
    'sidebar.analysis': 'Analysis',
    
    // Profile页面
    'profile.title': 'My Profile',
    'profile.description': 'Manage your personal information and settings',
    'profile.awards.title': 'Awards & Honors',
    'profile.awards.description': 'Your achievements and honors',
    'profile.awards.add': 'Add Award',
    'profile.awards.empty': 'No information available',
    'profile.awards.form.title': 'Add Award',
    'profile.awards.form.edit': 'Edit Award',
    'profile.awards.form.name': 'Award Name',
    'profile.awards.form.organization': 'Organization/Academic Year',
    'profile.awards.form.level': 'Level',
    'profile.awards.form.level.placeholder': 'Please select level',
    'profile.awards.form.level.national': 'National',
    'profile.awards.form.level.provincial': 'Provincial',
    'profile.awards.form.level.municipal': 'Municipal',
    'profile.awards.form.level.school': 'School',
    'profile.awards.form.level.other': 'Other',
    'profile.awards.form.date': 'Award Date (Optional)',
    'profile.awards.form.date.placeholder': 'e.g.: June 2024',
    'profile.work.title': 'Work Experience',
    'profile.work.description': 'Your internship and work experience',
    'profile.work.add': 'Add Work',
    'profile.work.empty': 'No information available',
    'profile.work.form.title': 'Add Work Experience',
    'profile.work.form.edit': 'Edit Work Experience',
    'profile.work.form.position': 'Position *',
    'profile.work.form.position.placeholder': 'e.g.: Teaching Assistant Intern',
    'profile.work.form.company': 'Company/Organization *',
    'profile.work.form.company.placeholder': 'e.g.: New Oriental Education & Technology Group',
    'profile.work.form.period': 'Work Period (Optional)',
    'profile.work.form.period.placeholder': 'e.g.: July 2024 - August 2024',
    'profile.work.form.description': 'Job Description *',
    'profile.work.form.description.placeholder': 'Please briefly describe your work content and achievements',
    'profile.language.title': 'Language Scores',
    'profile.language.description': 'TOEFL, IELTS, GRE and other standardized test scores',
    'profile.language.add': 'Add Score',
    'profile.language.empty': 'No information available',
    'profile.language.toefl.reading': 'Reading',
    'profile.language.toefl.listening': 'Listening',
    'profile.language.toefl.speaking': 'Speaking',
    'profile.language.toefl.writing': 'Writing',
    'profile.language.ielts.listening': 'Listening',
    'profile.language.ielts.reading': 'Reading',
    'profile.language.ielts.writing': 'Writing',
    'profile.language.ielts.speaking': 'Speaking',
    'profile.language.gre.math': 'Math',
    'profile.language.gre.verbal': 'Verbal',
    'profile.language.gre.writing': 'Writing',
    'profile.language.form.title': 'Add Score',
    'profile.language.form.edit': 'Update Score',
    'profile.language.form.type': 'Test Type',
    'profile.language.form.type.placeholder': 'Please select test type',
    'profile.language.form.total': 'Total Score',
    'profile.language.form.toefl.max': 'Max 30 points',
    'profile.language.form.ielts.example': 'e.g.: 7.5',
    'profile.language.form.gre.max': 'Max 170 points',
    'profile.language.form.gre.writing.example': 'e.g.: 4.5',
    'profile.common.cancel': 'Cancel',
    'profile.common.save': 'Save',
    'profile.common.delete': 'Delete',
    'profile.common.confirm.delete': 'Confirm Delete',
    'profile.common.confirm.delete.award': 'Are you sure you want to delete this award record?',
    'profile.common.confirm.delete.work': 'Are you sure you want to delete this work experience?',
    'profile.common.confirm.delete.toefl': 'Are you sure you want to delete the TOEFL score?',
    'profile.common.confirm.delete.ielts': 'Are you sure you want to delete the IELTS score?',
    'profile.common.confirm.delete.gre': 'Are you sure you want to delete the GRE score?',
    'profile.common.confirm.delete.note': 'This action cannot be undone.',
    
    // 侧边栏
    'sidebar.dashboard': 'Dash Board',
    
    // Dashboard页面
    'dashboard.title': 'Dash Board',
    'dashboard.description': 'View {name}\'s learning data and performance statistics',
    'dashboard.login.required': 'Please log in to view learning data',
    'dashboard.loading': 'Loading {name}\'s data...',
    'dashboard.loading.message': 'Loading data...',
    
    // 课程统计卡片
    'dashboard.stats.average': 'Average Score',
    'dashboard.stats.average.desc': 'Personal average grade',
    'dashboard.stats.pass.rate': 'Pass Rate',
    'dashboard.stats.pass.rate.desc': 'Course pass rate',
    'dashboard.stats.courses': 'Courses Taken',
    'dashboard.stats.courses.desc': 'Total number of courses',
    'dashboard.stats.gpa': 'GPA',
    'dashboard.stats.gpa.desc': 'Grade Point Average',
    
    // 各科成绩
    'dashboard.subjects.title': 'Subject Grades',
    'dashboard.subjects.description': 'Recent course grade distribution',
    'dashboard.subjects.view.more': 'View More',
    'dashboard.subjects.grade.level': 'Grade',
    'dashboard.subjects.no.data': 'No grade data available',
    
    // 课程统计
    'dashboard.course.stats.title': 'Course Statistics',
    'dashboard.course.stats.description': 'Course pass status',
    'dashboard.course.stats.passed': 'Passed',
    'dashboard.course.stats.failed': 'Failed',
    'dashboard.course.stats.pass.rate': 'Course Pass Rate',
    'dashboard.course.stats.summary': 'Passed {completed} / Total {total} courses',
    
    // 学期成绩趋势
    'dashboard.trends.title': 'Semester Grade Trends',
    'dashboard.trends.description': 'Average grade changes by semester',
    'dashboard.trends.courses.count': '{count} courses',
    'dashboard.trends.no.data': 'No semester data available',
    
    // 课程类型分布
    'dashboard.distribution.title': 'Course Type Distribution',
    'dashboard.distribution.description': 'Performance by different course types',
    'dashboard.distribution.courses.count': '{count} courses',
    'dashboard.distribution.average': 'Average',
    'dashboard.distribution.no.data': 'No course type data available',
    
    // Grades页面
    'grades.title': 'Grade Details',
    'grades.description': 'All course grades for {name}',
    'grades.login.required': 'Please log in to view learning data',
    'grades.loading': 'Loading {name}\'s data...',
    'grades.loading.message': 'Loading data...',
    'grades.back.to.dashboard': 'Back to Dashboard',
    'grades.all.courses.title': 'All Course Grades',
    'grades.all.courses.description': 'Detailed course grade list (sorted by credit from high to low)',
    'grades.table.course.name': 'Course Name',
    'grades.table.credit': 'Credit',
    'grades.table.score': 'Score',
    'grades.no.data': 'No grade data available',
    'grades.total.courses': 'Total {count} courses',
    
    // Role Models页面
    'rolemodels.description': 'Understand typical talent characteristics for different career paths and plan your professional and academic development',
    'rolemodels.tab.companies': 'By Company',
    'rolemodels.tab.schools': 'By Graduate School',
    'rolemodels.tab.internships': 'By Internship',
    'rolemodels.internship.duration': 'Duration',
    'rolemodels.internship.benefits': 'Benefits',
    'rolemodels.internship.applications': 'applications',
    'rolemodels.internship.details': 'View Details',
    'rolemodels.common.details': 'View Details',
    
    // Analysis页面
    'analysis.title': 'Analysis',
    'analysis.description': 'In-depth analysis of your learning performance with personalized improvement suggestions',
    'analysis.efficiency.title': 'Learning Efficiency',
    'analysis.efficiency.desc': '+5% from last week',
    'analysis.target.title': 'Goal Achievement',
    'analysis.target.desc': '+3% from last week',
    'analysis.weak.title': 'Weak Subjects',
    'analysis.weak.desc': 'Need focused attention',
    'analysis.ranking.title': 'Class Ranking',
    'analysis.ranking.desc': 'Up 3 places',
    'analysis.subjects.title': 'Subject Analysis',
    'analysis.subjects.description': 'Current vs target performance comparison',
    'analysis.subjects.gap': 'Gap: {gap} points',
    'analysis.subjects.current': 'Current: {current}',
    'analysis.subjects.target': 'Target: {target}',
    'analysis.ability.title': 'Ability Assessment',
    'analysis.ability.description': 'Comprehensive ability evaluation',
    'analysis.ability.overall': 'Overall ability score: {score}',
    'analysis.ability.logical': 'Logical Thinking',
    'analysis.ability.memory': 'Memory Ability',
    'analysis.ability.comprehension': 'Comprehension Ability',
    'analysis.ability.application': 'Application Ability',
    'analysis.ability.innovation': 'Innovation Thinking',
    'analysis.ability.expression': 'Expression Ability',
    'analysis.checklist.title': 'Daily Checklist',
    'analysis.checklist.description': 'Track and complete your daily tasks',
    'analysis.checklist.add.placeholder': 'Add new item...',
    'analysis.checklist.completion.rate': 'Completion rate: {rate}%',
    'analysis.improvement.title': 'Improvement Suggestions',
    'analysis.improvement.description': 'Personalized recommendations based on data analysis',
    'analysis.improvement.priority.high': 'High Priority',
    'analysis.improvement.priority.medium': 'Medium Priority',
    'analysis.improvement.estimated.time': 'Estimated time: {time}',
    'analysis.improvement.make.plan': 'Make Plan',
    
    // About页面
    'about.title': 'About BuTP',
    'about.version': 'Version {version}'
  }
}

// 语言提供者组件
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh')

  // 从 localStorage 读取语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && (savedLanguage === 'zh' || savedLanguage === 'en')) {
      setLanguage(savedLanguage)
    }
  }, [])

  // 保存语言设置到 localStorage
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  // 翻译函数
  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[language][key] || key
    
    // 如果有参数，进行替换
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue))
      })
    }
    
    return translation
  }

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: handleSetLanguage, 
      t 
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

// 自定义Hook
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
} 