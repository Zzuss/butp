# 数据库表结构设计

## 1. 智育总表 (academic_scores)

```sql
-- 智育总表：存储学生的智育成绩信息
CREATE TABLE academic_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bupt_student_id TEXT NOT NULL UNIQUE, -- 学号
    full_name TEXT NOT NULL, -- 姓名
    school TEXT, -- 上课院系
    campus TEXT, -- 学生校区
    programme TEXT, -- 专业名称
    class TEXT, -- 班级名称
    degree_category TEXT, -- 培养层次
    total_diet INTEGER DEFAULT 0, -- 所修总门数
    total_credits DECIMAL(5,2) DEFAULT 0, -- 所修总学分
    taken_credits DECIMAL(5,2) DEFAULT 0, -- 未得学分
    weighted_average DECIMAL(5,2) DEFAULT 0, -- 加权均分
    gpa DECIMAL(4,2) DEFAULT 0, -- 平均学分绩点
    programme_rank INTEGER, -- 专业排名
    programme_total INTEGER, -- 专业排名总人数
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_academic_scores_student_id ON academic_scores(bupt_student_id);
CREATE INDEX idx_academic_scores_programme ON academic_scores(programme);
CREATE INDEX idx_academic_scores_class ON academic_scores(class);
```

## 2. 综测排名表 (comprehensive_ranking)

```sql
-- 综测排名表：存储学生的综合测评排名信息
CREATE TABLE comprehensive_ranking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bupt_student_id TEXT NOT NULL UNIQUE, -- 学号
    full_name TEXT NOT NULL, -- 姓名
    programme TEXT, -- 专业名称
    class TEXT, -- 班级名称
    academic_weighted_average DECIMAL(5,2) DEFAULT 0, -- 专业成绩加权均分
    programme_rank INTEGER, -- 专业成绩排名
    programme_total INTEGER, -- 专业排名总人数
    practice_extra_points DECIMAL(5,2) DEFAULT 0, -- 实践活动加分（德育总分）
    academic_practice_total DECIMAL(5,2) DEFAULT 0, -- 专业综合成绩（智育+德育）
    overall_rank INTEGER, -- 专业综合排名
    overall_rank_percentage DECIMAL(5,2), -- 专业综合排名百分比
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_comprehensive_ranking_student_id ON comprehensive_ranking(bupt_student_id);
CREATE INDEX idx_comprehensive_ranking_programme ON comprehensive_ranking(programme);
CREATE INDEX idx_comprehensive_ranking_class ON comprehensive_ranking(class);
CREATE INDEX idx_comprehensive_ranking_overall_rank ON comprehensive_ranking(overall_rank);
```

## 3. 表关系说明

- `academic_scores` 表存储智育成绩数据（用户导入）
- `comprehensive_evaluation_scores` 表存储德育加分数据（系统生成）
- `comprehensive_ranking` 表存储最终综测排名（系统计算生成）

## 4. 数据流程

1. 用户导入智育成绩 → `academic_scores` 表
2. 系统生成德育总表 → `comprehensive_evaluation_scores` 表
3. 系统合并智育+德育 → `comprehensive_ranking` 表
