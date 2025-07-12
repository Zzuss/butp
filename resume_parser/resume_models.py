from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ContactInfo(BaseModel):
    """联系信息"""
    name: str = Field(description="姓名")
    phone: Optional[str] = Field(None, description="电话号码")
    email: Optional[str] = Field(None, description="邮箱地址")
    address: Optional[str] = Field(None, description="地址")
    linkedin: Optional[str] = Field(None, description="LinkedIn链接")
    github: Optional[str] = Field(None, description="GitHub链接")
    website: Optional[str] = Field(None, description="个人网站")

class Education(BaseModel):
    """教育经历"""
    institution: str = Field(description="学校名称")
    degree: Optional[str] = Field(None, description="学位")
    major: Optional[str] = Field(None, description="专业")
    start_date: Optional[str] = Field(None, description="开始时间")
    end_date: Optional[str] = Field(None, description="结束时间")
    gpa: Optional[str] = Field(None, description="GPA")
    achievements: Optional[List[str]] = Field(None, description="成就和奖项")

class WorkExperience(BaseModel):
    """工作经历"""
    company: str = Field(description="公司名称")
    position: str = Field(description="职位")
    start_date: Optional[str] = Field(None, description="开始时间")
    end_date: Optional[str] = Field(None, description="结束时间")
    location: Optional[str] = Field(None, description="工作地点")
    responsibilities: Optional[List[str]] = Field(None, description="工作职责")
    achievements: Optional[List[str]] = Field(None, description="工作成就")

class Project(BaseModel):
    """项目经历"""
    name: str = Field(description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    start_date: Optional[str] = Field(None, description="开始时间")
    end_date: Optional[str] = Field(None, description="结束时间")
    technologies: Optional[List[str]] = Field(None, description="使用的技术")
    url: Optional[str] = Field(None, description="项目链接")
    achievements: Optional[List[str]] = Field(None, description="项目成果")

class Skill(BaseModel):
    """技能"""
    category: str = Field(description="技能类别")
    items: List[str] = Field(description="技能项目")
    proficiency: Optional[str] = Field(None, description="熟练程度")

class Language(BaseModel):
    """语言能力"""
    language: str = Field(description="语言")
    proficiency: Optional[str] = Field(None, description="熟练程度")

class Certificate(BaseModel):
    """证书"""
    name: str = Field(description="证书名称")
    issuer: Optional[str] = Field(None, description="颁发机构")
    date: Optional[str] = Field(None, description="获得日期")
    expiry_date: Optional[str] = Field(None, description="过期日期")
    url: Optional[str] = Field(None, description="证书链接")

class Resume(BaseModel):
    """完整简历数据模型"""
    contact_info: ContactInfo = Field(description="联系信息")
    summary: Optional[str] = Field(None, description="个人简介")
    education: List[Education] = Field(default=[], description="教育经历")
    work_experience: List[WorkExperience] = Field(default=[], description="工作经历")
    projects: List[Project] = Field(default=[], description="项目经历")
    skills: List[Skill] = Field(default=[], description="技能")
    languages: List[Language] = Field(default=[], description="语言能力")
    certificates: List[Certificate] = Field(default=[], description="证书")
    awards: Optional[List[str]] = Field(None, description="奖项")
    volunteer_experience: Optional[List[str]] = Field(None, description="志愿服务经历")
    publications: Optional[List[str]] = Field(None, description="出版物")
    references: Optional[List[str]] = Field(None, description="推荐人")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return self.model_dump()
    
    def to_json(self) -> str:
        """转换为JSON字符串"""
        return self.model_dump_json(indent=2, ensure_ascii=False) 