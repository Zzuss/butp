"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  GraduationCap, 
  Briefcase, 
  MapPin, 
  Star, 
  Building, 
  School, 
  Award, 
  BookOpen, 
  Layers, 
  Globe, 
  ArrowLeft, 
  Users, 
  Calendar, 
  Target, 
  CheckCircle,
  DollarSign,
  Lightbulb,
  TrendingUp
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { Suspense } from "react"

// Badge组件
function Badge({ children, variant = "secondary" }: { children: React.ReactNode, variant?: "secondary" | "outline" }) {
  const baseClass = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  const variantClass = variant === "outline" 
    ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
  
  return (
    <div className={`${baseClass} ${variantClass}`}>
      {children}
    </div>
  )
}

// 按岗位分组的丰富数据结构（与主页面保持一致）
const positionModels = {
  "大模型工程师": [
    {
      id: 1,
      name: "大模型工程师画像(研究型)",
      position: "大模型工程师",
      location: "北京/深圳/杭州/上海",
      companies: ["腾讯", "字节跳动", "阿里巴巴", "百度", "华为", "商汤科技", "旷视科技"],
      academics: {
        gpa: "3.8+/4.0",
        courses: ["深度学习", "自然语言处理", "分布式系统", "机器学习", "神经网络", "数据挖掘"]
      },
      competitions: ["ACM程序设计大赛", "互联网+创新创业大赛", "AI算法竞赛", "KAGGLE竞赛"],
      internships: ["大厂AI实验室实习", "算法团队实习", "研究院实习"],
      englishScores: {
        toefl: "105+",
        ielts: "7.0+"
      },
      skills: ["大模型训练", "分布式计算", "算法优化", "PyTorch/TensorFlow", "CUDA编程", "模型部署"],
      tags: ["大模型", "人工智能", "深度学习", "NLP"],
      description: "研究型大模型工程师专注于前沿算法研究，需具备扎实的深度学习理论基础，熟悉大规模分布式训练，有顶级竞赛和实习经验。",
      rating: 4.9,
      consultations: 120,
      salary: {
        entry: "35-50万",
        senior: "60-100万",
        expert: "100-200万+"
      },
      projects: [
        "参与大模型的训练和优化",
        "负责模型推理服务的性能优化",
        "开发多模态大模型应用",
        "构建模型评估和监控系统"
      ],
      careerPath: [
        "初级大模型工程师 (1-2年经验)",
        "高级大模型工程师 (3-5年经验)",
        "资深大模型专家 (5-8年经验)",
        "首席科学家/技术总监 (8+年经验)"
      ],
      interviewPoints: [
        "深度学习理论基础（Transformer架构、注意力机制）",
        "大规模模型训练经验（分布式训练、模型并行）",
        "编程能力（Python、PyTorch/TensorFlow）",
        "系统设计能力（高并发推理服务设计）",
        "项目经验分享（具体的模型优化案例）"
      ],
      learningResources: [
        "《Attention Is All You Need》论文精读",
        "Transformers官方文档和源码",
        "DeepSpeed分布式训练框架",
        "MLOps实践：模型部署与监控",
        "最新的大模型论文跟踪"
      ]
    },
    {
      id: 11,
      name: "大模型工程师画像(应用型)",
      position: "大模型工程师",
      location: "北京/深圳/杭州/上海",
      companies: ["字节跳动", "百度", "小米", "京东", "美团", "网易", "快手"],
      academics: {
        gpa: "3.7+/4.0",
        courses: ["深度学习", "软件工程", "系统设计", "机器学习", "数据库", "云计算"]
      },
      competitions: ["AI应用竞赛", "黑客马拉松", "创新创业大赛"],
      internships: ["大模型产品实习", "AI应用开发实习", "算法工程实习"],
      englishScores: {
        toefl: "100+",
        ielts: "6.5+"
      },
      skills: ["模型微调", "API开发", "系统集成", "性能优化", "云平台部署", "产品化"],
      tags: ["大模型", "应用开发", "产品化", "系统集成"],
      description: "应用型大模型工程师专注于大模型的产品化和工程实现，需要较强的系统开发能力和产品思维。",
      rating: 4.7,
      consultations: 95,
      salary: {
        entry: "30-45万",
        senior: "50-80万",
        expert: "80-150万+"
      },
      projects: [
        "大模型API服务开发",
        "模型在业务场景的落地应用",
        "构建模型服务监控体系",
        "优化模型推理性能"
      ],
      careerPath: [
        "初级应用工程师 (1-2年经验)",
        "高级应用工程师 (3-5年经验)",
        "技术架构师 (5-8年经验)",
        "技术总监 (8+年经验)"
      ],
      interviewPoints: [
        "大模型应用开发经验",
        "系统架构设计能力",
        "云平台和容器化技术",
        "API设计和性能优化",
        "产品思维和业务理解"
      ],
      learningResources: [
        "大模型服务化最佳实践",
        "Kubernetes和Docker",
        "云原生架构设计",
        "API网关和负载均衡",
        "性能监控和调优"
      ]
    }
  ],
  "算法": {
    "腾讯": [
      {
        id: 2,
        name: "腾讯算法工程师画像",
        position: "算法工程师",
        location: "深圳/北京",
        academics: {
          gpa: "3.8+/4.0",
          courses: ["机器学习", "数据挖掘", "算法设计"]
        },
        competitions: ["ACM程序设计大赛"],
        internships: ["腾讯算法实习"],
        englishScores: {
          toefl: "105+",
          ielts: "7.0+"
        },
        skills: ["算法设计", "数据分析", "Python/Java"],
        tags: ["算法", "数据挖掘"],
        description: "腾讯算法工程师需有扎实的算法理论基础，参与过算法竞赛，具备数据分析能力。",
        rating: 4.8,
        consultations: 100,
        salary: {
          entry: "25-40万",
          senior: "45-80万",
          expert: "80-150万+"
        },
        projects: [
          "微信推荐算法优化",
          "腾讯视频内容推荐系统",
          "广告投放算法研发",
          "用户画像构建与分析"
        ],
        careerPath: [
          "算法工程师 (1-3年经验)",
          "高级算法工程师 (3-6年经验)",
          "算法专家/技术主管 (6-10年经验)",
          "算法总监/首席科学家 (10+年经验)"
        ],
        interviewPoints: [
          "机器学习基础理论和算法",
          "数据结构与算法设计",
          "项目经验和算法优化案例",
          "编程实现能力 (Python/Java/C++)",
          "业务理解和问题分析能力"
        ],
        learningResources: [
          "《机器学习》周志华著",
          "《统计学习方法》李航著",
          "Kaggle竞赛实践",
          "LeetCode算法题库",
          "顶会论文阅读 (ICML, NeurIPS, KDD)"
        ]
      }
    ],
    "阿里巴巴": [
      {
        id: 3,
        name: "阿里巴巴算法工程师画像",
        position: "算法工程师",
        location: "杭州/北京",
        academics: {
          gpa: "3.8+/4.0",
          courses: ["机器学习", "数据挖掘", "大数据处理", "算法设计"]
        },
        competitions: ["天池大数据竞赛", "阿里云创新大赛"],
        internships: ["阿里巴巴算法实习", "数据分析相关实习"],
        englishScores: {
          toefl: "105+",
          ielts: "7.0+"
        },
        skills: ["机器学习", "数据挖掘", "Python/Java"],
        tags: ["算法", "大数据", "机器学习"],
        description: "阿里算法工程师需有扎实的算法理论基础，参与过天池等数据竞赛，具备大数据处理能力。",
        rating: 4.9,
        consultations: 110,
        salary: {
          entry: "30-45万",
          senior: "50-85万",
          expert: "90-160万+"
        },
        projects: [
          "淘宝个性化推荐算法",
          "支付宝风控算法系统",
          "阿里云机器学习平台",
          "电商搜索排序算法"
        ],
        careerPath: [
          "算法工程师 (1-3年经验)",
          "高级算法工程师 (3-5年经验)", 
          "算法专家/技术专家 (5-8年经验)",
          "算法总监/资深专家 (8+年经验)"
        ],
        interviewPoints: [
          "机器学习理论和实践经验",
          "大数据处理和分析能力",
          "电商/金融场景算法应用",
          "编程和系统设计能力",
          "业务理解和产品思维"
        ],
        learningResources: [
          "阿里技术博客和论文",
          "天池竞赛平台实践",
          "《推荐系统实践》项亮著",
          "分布式系统设计原理",
          "电商业务知识学习"
        ]
      }
    ],
    "字节跳动": [
      {
        id: 4,
        name: "字节跳动算法工程师画像",
        position: "算法工程师",
        location: "北京/上海",
        academics: {
          gpa: "3.9+/4.0",
          courses: ["人工智能", "计算机视觉", "推荐系统"]
        },
        competitions: ["全国大学生数学建模竞赛", "字节跳动青训营"],
        internships: ["字节跳动算法实习", "人工智能研究实验室实习"],
        englishScores: {
          toefl: "110+",
          ielts: "7.5+"
        },
        skills: ["深度学习", "推荐系统", "Python/C++"],
        tags: ["人工智能", "算法", "推荐系统"],
        description: "字节算法工程师需有人工智能算法项目经验，熟悉推荐系统，参与过青训营等活动。",
        rating: 4.9,
        consultations: 90,
        salary: {
          entry: "30-50万",
          senior: "55-90万",
          expert: "100-180万+"
        },
        projects: [
          "抖音推荐算法优化",
          "今日头条内容分发系统",
          "TikTok全球推荐引擎",
          "视频理解和生成算法"
        ],
        careerPath: [
          "算法工程师 (1-3年经验)",
          "高级算法工程师 (3-6年经验)",
          "算法架构师/专家 (6-10年经验)",
          "算法总监/首席科学家 (10+年经验)"
        ],
        interviewPoints: [
          "推荐系统和深度学习算法",
          "大规模数据处理和模型训练",
          "AB测试和效果评估",
          "系统设计和工程实现",
          "产品理解和用户增长"
        ],
        learningResources: [
          "字节跳动技术博客",
          "推荐系统前沿论文",
          "《深度学习推荐系统》王喆著",
          "Apache Spark大数据处理",
          "移动互联网产品分析"
        ]
      }
    ]
  },
  "前端": {
    "腾讯": [
      {
        id: 5,
        name: "腾讯前端开发画像",
        position: "前端开发工程师",
        location: "深圳/北京",
        academics: {
          gpa: "3.6+/4.0",
          courses: ["Web开发", "数据结构", "计算机网络"]
        },
        competitions: ["腾讯前端大赛"],
        internships: ["腾讯前端实习"],
        englishScores: {
          toefl: "95+",
          ielts: "6.0+"
        },
        skills: ["React/Vue", "前端工程化", "性能优化"],
        tags: ["前端", "网页开发", "工程化"],
        description: "腾讯前端开发需熟悉主流前端框架，有大型项目开发经验。",
        rating: 4.7,
        consultations: 85,
        salary: {
          entry: "20-35万",
          senior: "40-65万",
          expert: "70-120万+"
        },
        projects: [
          "QQ/微信Web版前端架构",
          "腾讯会议前端开发",
          "企业微信管理后台",
          "腾讯云控制台前端"
        ],
        careerPath: [
          "前端开发工程师 (1-3年经验)",
          "高级前端工程师 (3-5年经验)",
          "前端架构师/专家 (5-8年经验)",
          "前端技术总监 (8+年经验)"
        ],
        interviewPoints: [
          "JavaScript基础和ES6+特性",
          "React/Vue框架原理和实践",
          "前端工程化和构建工具",
          "性能优化和用户体验",
          "项目架构和团队协作"
        ],
        learningResources: [
          "《JavaScript高级程序设计》",
          "React官方文档和源码分析",
          "Webpack/Vite构建工具",
          "前端性能优化最佳实践",
          "设计系统和组件库开发"
        ]
      }
    ]
  }
}

// 按专业分组的丰富数据结构
const majorModels = {
  "计算机科学与技术": [
      {
        id: 101,
        name: "计算机科学与技术研究生画像(算法方向)",
        graduateMajor: "计算机科学与技术",
        location: "北京/上海/深圳/杭州",
        schools: ["清华大学", "北京大学", "中科院计算所", "上海交通大学", "浙江大学", "华中科技大学", "北京航空航天大学", "哈尔滨工业大学"],
        academics: {
          gpa: "3.85+/4.0",
          courses: ["数据结构", "操作系统", "人工智能", "算法设计", "分布式系统", "机器学习"]
        },
        competitions: ["ACM程序设计大赛", "全国大学生数学竞赛", "CCF编程竞赛", "ICPC竞赛"],
        research: ["发表高水平论文", "参与国家级科研项目", "开源项目贡献"],
        englishScores: {
          toefl: "112+",
          ielts: "7.5+",
          gre: "328+"
        },
        skills: ["算法设计", "编程实现", "科研能力", "团队协作", "数学建模"],
        tags: ["计算机", "算法", "科研", "人工智能"],
        description: "计算机算法方向研究生需有扎实的算法和编程基础，积极参与竞赛和科研，具备较强的创新能力和数学功底。",
        rating: 4.9,
        consultations: 150,
        tuitionFee: "8000-12000元/年",
        scholarshipRate: "85%",
        projects: [
          "参与国家自然科学基金项目",
          "发表CCF-A类会议/期刊论文",
          "开发开源项目并获得关注",
          "参与导师的产学研合作项目"
        ],
        careerPath: [
          "硕士研究生 (2-3年)",
          "科技公司算法/开发岗位",
          "或继续攻读博士学位",
          "成为技术专家或研究学者"
        ],
        applicationPoints: [
          "本科成绩优异（GPA 3.8+）",
          "有扎实的编程和算法基础",
          "参与过竞赛或科研项目",
          "英语水平达标（六级500+）",
          "面试表现突出（技术+综合素质）"
        ],
        prepTips: [
          "提前了解目标导师的研究方向",
          "准备算法和编程技能",
          "阅读相关领域的经典论文",
          "准备研究计划和个人陈述",
          "练习英语听说读写能力"
        ]
      },
      {
        id: 102,
        name: "计算机科学与技术研究生画像(系统方向)",
        graduateMajor: "计算机科学与技术",
        location: "北京/上海/深圳",
        schools: ["北京大学", "清华大学", "上海交通大学", "复旦大学", "南京大学", "中山大学", "西安交通大学"],
        academics: {
          gpa: "3.8+/4.0",
          courses: ["数据结构", "操作系统", "计算机网络", "分布式系统", "数据库系统", "编译原理"]
        },
        competitions: ["ACM程序设计大赛", "全国大学生软件设计大赛", "蓝桥杯程序设计大赛"],
        research: ["参与高水平科研项目", "系统架构设计", "性能优化研究"],
        englishScores: {
          toefl: "110+",
          ielts: "7.0+",
          gre: "325+"
        },
        skills: ["系统设计", "编程实现", "性能调优", "架构设计", "团队协作"],
        tags: ["计算机", "系统", "架构", "后端"],
        description: "计算机系统方向研究生专注于系统架构、性能优化和分布式系统设计，需要扎实的系统编程基础。",
        rating: 4.8,
        consultations: 120,
        tuitionFee: "8000-12000元/年",
        scholarshipRate: "80%",
        projects: [
          "参与国家重点研发计划",
          "在顶级会议发表学术论文",
          "参与开源社区贡献",
          "与企业合作技术攻关"
        ],
        careerPath: [
          "硕士研究生 (2-3年)",
          "互联网大厂技术岗位",
          "或攻读博士继续深造",
          "成为技术领域专家"
        ],
        applicationPoints: [
          "本科院校和成绩优秀",
          "有强的数学和编程基础",
          "参与过重要竞赛或项目",
          "英语能力突出",
          "综合素质全面发展"
        ],
        prepTips: [
          "深入学习计算机基础课程",
          "参与ACM、算法竞赛训练",
          "了解前沿技术发展趋势",
          "提升英语学术写作能力",
          "培养独立思考和创新能力"
        ]
      }
    ]
}

// 按类别分组的丰富数据结构
const categoryModels = {
  "技术类": {
    "腾讯": [
      {
        id: 201,
        name: "腾讯技术实习生画像",
        position: "技术实习生",
        duration: "3-6个月",
        location: "深圳/北京",
        academics: {
          gpa: "3.5+/4.0",
          courses: ["数据结构", "算法设计", "操作系统"]
        },
        skills: ["编程基础", "学习能力", "沟通能力"],
        requirements: ["计算机相关专业", "扎实的编程基础", "良好的团队合作精神"],
        benefits: ["导师指导", "实际项目经验", "转正机会"],
        tags: ["技术", "实习", "导师制"],
        description: "腾讯技术实习生将参与真实项目开发，接受资深工程师指导，获得宝贵的实践经验。",
        rating: 4.8,
        applications: 1200,
        monthlyPay: "4000-8000元/月",
        workTime: "周一至周五，弹性工作制",
        projects: [
          "参与微信/QQ功能开发",
          "协助后端服务优化",
          "参与移动端应用开发",
          "学习大规模系统架构"
        ],
        mentorship: [
          "一对一技术导师指导",
          "定期技术分享和培训",
          "代码review和技术讨论",
          "职业发展规划建议"
        ],
        applicationTips: [
          "突出编程项目和Github代码",
          "展示算法和数据结构基础",
          "准备技术面试常见题目",
          "了解腾讯的技术栈和业务",
          "表达学习意愿和团队精神"
        ],
        skillsToLearn: [
          "深入学习主流编程语言",
          "掌握常用开发框架",
          "了解数据库和缓存技术",
          "学习系统设计基础知识",
          "提升问题分析和解决能力"
        ]
      }
    ]
  }
}

// 接口定义
interface CompanyModel {
  id: number
  name: string
  position: string
  location: string
  academics: {
    gpa: string
    courses: string[]
  }
  competitions: string[]
  internships: string[]
  englishScores: {
    toefl: string
    ielts: string
  }
  skills: string[]
  tags: string[]
  description: string
  rating: number
  consultations: number
  salary?: {
    entry: string
    senior: string
    expert: string
  }
  projects?: string[]
  careerPath?: string[]
  interviewPoints?: string[]
  learningResources?: string[]
}

interface SchoolModel {
  id: number
  name: string
  graduateMajor: string
  location: string
  academics: {
    gpa: string
    courses: string[]
  }
  competitions: string[]
  research: string[]
  englishScores: {
    toefl: string
    ielts: string
    gre: string
    sat?: string
  }
  skills: string[]
  tags: string[]
  description: string
  rating: number
  consultations: number
  tuitionFee?: string
  scholarshipRate?: string
  projects?: string[]
  careerPath?: string[]
  applicationPoints?: string[]
  prepTips?: string[]
}

interface InternshipModel {
  id: number
  name: string
  position: string
  duration: string
  location: string
  academics: {
    gpa: string
    courses: string[]
  }
  skills: string[]
  requirements: string[]
  benefits: string[]
  tags: string[]
  description: string
  rating: number
  applications: number
  monthlyPay?: string
  workTime?: string
  projects?: string[]
  mentorship?: string[]
  applicationTips?: string[]
  skillsToLearn?: string[]
}

// 查找数据的辅助函数
function findPositionModel(position: string, company: string, id: number): CompanyModel | null {
  const positionData = positionModels[position as keyof typeof positionModels] as CompanyModel[] | undefined
  if (!positionData) return null
  
  return positionData.find((model: CompanyModel) => model.id === id) || null
}

function findMajorModel(major: string, school: string, id: number): SchoolModel | null {
  const majorData = majorModels[major as keyof typeof majorModels] as SchoolModel[] | undefined
  if (!majorData) return null
  
  return majorData.find((model: SchoolModel) => model.id === id) || null
}

function findCategoryModel(category: string, company: string, id: number): InternshipModel | null {
  // 使用主页面的实习模型数据结构
  const internshipModels = {
    "技术实习": [
      {
        id: 1,
        name: "技术实习生画像(后端开发)",
        position: "技术实习生",
        duration: "3-6个月",
        location: "北京/深圳/杭州/上海",
        companies: ["腾讯", "阿里巴巴", "字节跳动", "百度", "美团", "京东", "网易", "华为", "小米", "滴滴"],
        academics: {
          gpa: "3.5+/4.0",
          courses: ["数据结构", "算法设计", "操作系统", "计算机网络", "数据库"]
        },
        skills: ["编程基础", "算法能力", "系统设计", "团队协作", "学习能力"],
        requirements: ["计算机相关专业", "扎实的编程基础", "良好的团队合作精神", "有项目经验优先"],
        benefits: ["导师指导", "实际项目经验", "转正机会", "技术成长"],
        tags: ["技术", "后端", "实习", "导师制"],
        description: "后端技术实习生将参与服务端开发，学习大规模分布式系统架构，接受资深工程师指导，获得宝贵的工程实践经验。",
        rating: 4.8,
        applications: 1200,
        monthlyPay: "4000-8000元/月",
        workTime: "周一至周五，弹性工作制",
        projects: [
          "参与后端服务开发",
          "学习微服务架构",
          "参与系统性能优化",
          "接触大规模分布式系统"
        ],
        mentorship: [
          "一对一技术导师指导",
          "定期技术分享和培训",
          "代码Review和技术讨论",
          "职业发展规划建议"
        ],
        applicationTips: [
          "掌握至少一门编程语言",
          "有完整的项目经验",
          "了解基础的数据结构和算法",
          "展示学习能力和技术热情"
        ],
        skillsToLearn: [
          "深入学习后端开发框架",
          "理解分布式系统原理",
          "掌握数据库设计和优化",
          "学习云计算和容器技术"
        ]
      }
    ],
    "产品实习": [
      {
        id: 2,
        name: "产品实习生画像(C端产品)",
        position: "产品实习生",
        duration: "3-6个月",
        location: "北京/深圳/杭州/上海",
        companies: ["腾讯", "字节跳动", "阿里巴巴", "百度", "小红书", "快手", "哔哩哔哩", "网易", "知乎", "豆瓣"],
        academics: {
          gpa: "3.4+/4.0",
          courses: ["市场营销", "用户体验", "数据分析", "心理学", "商业模式"]
        },
        skills: ["需求分析", "用户研究", "产品设计", "数据分析", "沟通协调"],
        requirements: ["对互联网产品感兴趣", "良好的沟通能力", "数据敏感度", "用户思维"],
        benefits: ["产品经验", "用户调研", "行业认知", "商业思维"],
        tags: ["产品", "C端", "用户体验", "实习"],
        description: "C端产品实习生将参与消费者产品设计和用户研究，学习互联网产品的完整开发流程，培养产品感和商业思维。",
        rating: 4.7,
        applications: 800,
        monthlyPay: "3500-7000元/月",
        workTime: "周一至周五，标准工作制",
        projects: [
          "参与产品需求分析",
          "协助用户调研和数据分析",
          "参与产品功能设计",
          "学习产品运营策略"
        ],
        mentorship: [
          "产品经理一对一指导",
          "参与产品评审会议",
          "用户研究方法培训",
          "商业思维培养"
        ],
        applicationTips: [
          "展示对产品的理解和思考",
          "有用户研究或数据分析经验",
          "良好的逻辑思维和表达能力",
          "对行业趋势有敏锐感知"
        ],
        skillsToLearn: [
          "产品设计和原型工具",
          "数据分析和用户研究方法",
          "商业模式和市场分析",
          "跨部门沟通协调能力"
        ]
      }
    ]
  }
  
  const categoryData = internshipModels[category as keyof typeof internshipModels] as InternshipModel[] | undefined
  if (!categoryData) return null
  
  return categoryData.find((model: InternshipModel) => model.id === id) || null
}

// 公司详情内容组件
function CompanyDetailContent({ model }: { model: CompanyModel }) {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t('rolemodels.detail.basic.info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('rolemodels.detail.location')}</span>
              <span>{model.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{t('rolemodels.detail.rating')}</span>
              <span>{model.rating}/5.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('rolemodels.detail.consultations')}</span>
              <span>{model.consultations}{t('rolemodels.detail.consultations.times')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              学术要求
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">GPA要求：</span>
              <span className="ml-2">{model.academics.gpa}</span>
            </div>
            <div>
              <span className="font-medium">核心课程：</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {model.academics.courses.map((course, index) => (
                  <Badge key={index} variant="secondary">{course}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 薪资信息 */}
      {model.salary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('rolemodels.detail.salary.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-800">{t('rolemodels.detail.salary.entry')}</div>
                <div className="text-2xl font-bold text-green-600">{model.salary.entry}</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-800">{t('rolemodels.detail.salary.senior')}</div>
                <div className="text-2xl font-bold text-blue-600">{model.salary.senior}</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="font-medium text-purple-800">{t('rolemodels.detail.salary.expert')}</div>
                <div className="text-2xl font-bold text-purple-600">{model.salary.expert}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 能力技能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            能力技能
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {model.skills.map((skill, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{skill}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 项目经验 */}
      {model.projects && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              {t('rolemodels.detail.projects.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {model.projects.map((project, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{project}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 职业发展路径 */}
      {model.careerPath && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              职业发展路径
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {model.careerPath.map((path, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span>{path}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 面试要点 */}
      {model.interviewPoints && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('rolemodels.detail.interview.points.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {model.interviewPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-2 p-3 border-l-4 border-orange-400 bg-orange-50 rounded-r-lg">
                  <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                    !
                  </div>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 学习资源 */}
      {model.learningResources && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('rolemodels.detail.learning.resources.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {model.learningResources.map((resource, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span>{resource}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 竞赛经历 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            竞赛经历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {model.competitions.map((competition, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <Award className="h-4 w-4 text-yellow-600" />
                <span>{competition}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 实习经历 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            实习经历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {model.internships.map((internship, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <Building className="h-4 w-4 text-green-600" />
                <span>{internship}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 英语成绩 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            英语成绩要求
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium">TOEFL</div>
              <div className="text-2xl font-bold text-green-600">{model.englishScores.toefl}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium">IELTS</div>
              <div className="text-2xl font-bold text-blue-600">{model.englishScores.ielts}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细描述 */}
      <Card>
        <CardHeader>
          <CardTitle>详细描述</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 leading-relaxed">{model.description}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// 学校详情内容组件
function SchoolDetailContent({ model }: { model: SchoolModel }) {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      {/* 基本信息和费用 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              {t('rolemodels.detail.basic.info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('rolemodels.detail.major')}</span>
              <span>{model.graduateMajor}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('rolemodels.detail.location.school')}</span>
              <span>{model.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{t('rolemodels.detail.rating')}</span>
              <span>{model.rating}/5.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('rolemodels.detail.consultations')}</span>
              <span>{model.consultations}{t('rolemodels.detail.consultations.times')}</span>
            </div>
          </CardContent>
        </Card>

        {model.tuitionFee && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('rolemodels.detail.fees.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t('rolemodels.detail.tuition')}</span>
                <span className="text-lg font-bold text-green-600">{model.tuitionFee}</span>
              </div>
              {model.scholarshipRate && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('rolemodels.detail.scholarship')}</span>
                  <span className="text-lg font-bold text-blue-600">{model.scholarshipRate}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 剩余内容与CompanyDetailContent类似，但去掉薪资相关内容 */}
      {/* 这里省略其他重复的卡片组件... */}
    </div>
  )
}

// 实习详情内容组件
function InternshipDetailContent({ model }: { model: InternshipModel }) {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      {/* 基本信息和待遇 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t('rolemodels.detail.basic.info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('rolemodels.detail.position')}</span>
              <span>{model.position}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('rolemodels.detail.duration')}</span>
              <span>{model.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('rolemodels.detail.location')}</span>
              <span>{model.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{t('rolemodels.detail.rating')}</span>
              <span>{model.rating}/5.0</span>
            </div>
          </CardContent>
        </Card>

        {model.monthlyPay && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('rolemodels.detail.internship.benefits.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t('rolemodels.detail.monthly.pay')}</span>
                <span className="text-lg font-bold text-green-600">{model.monthlyPay}</span>
              </div>
              {model.workTime && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('rolemodels.detail.work.time')}</span>
                  <span>{model.workTime}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 剩余内容... */}
    </div>
  )
}

// 详情页面主组件
function DetailPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()
  
  const type = searchParams.get('type') || 'company'
  const position = searchParams.get('position') || ''
  const company = searchParams.get('company') || ''
  const major = searchParams.get('major') || ''
  const school = searchParams.get('school') || ''
  const category = searchParams.get('category') || ''
  const id = parseInt(searchParams.get('id') || '0')
  
  let model: CompanyModel | SchoolModel | InternshipModel | null = null
  let title = ''
  
  if (type === 'company') {
    model = findPositionModel(decodeURIComponent(position), decodeURIComponent(company), id)
    title = model?.name || '岗位详情'
  } else if (type === 'school') {
    model = findMajorModel(decodeURIComponent(major), decodeURIComponent(school), id)
    title = model?.name || '专业详情'
  } else if (type === 'internship') {
    model = findCategoryModel(decodeURIComponent(category), decodeURIComponent(company), id)
    title = model?.name || '实习详情'
  }
  
  if (!model) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('rolemodels.detail.notfound')}</h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('rolemodels.detail.back')}
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('rolemodels.detail.back.rolemodels')}
        </Button>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">
          {type === 'company' && t('rolemodels.detail.company.subtitle')}
          {type === 'school' && t('rolemodels.detail.school.subtitle')}
          {type === 'internship' && t('rolemodels.detail.internship.subtitle')}
        </p>
      </div>
      
      {/* 详情内容 */}
      {type === 'company' && (
        <CompanyDetailContent model={model as CompanyModel} />
      )}
      {type === 'school' && (
        <SchoolDetailContent model={model as SchoolModel} />
      )}
      {type === 'internship' && (
        <InternshipDetailContent model={model as InternshipModel} />
      )}
    </div>
  )
}

// 主页面组件
export default function DetailPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>加载中...</p>
        </div>
      </div>
    }>
      <DetailPageContent />
    </Suspense>
  )
}