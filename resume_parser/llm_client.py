import json
import requests
from typing import Dict, Any, Optional
from openai import OpenAI
import logging
from .config import config
from .resume_models import Resume

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMClient:
    """LLM客户端，支持多种API"""
    
    def __init__(self, provider: str = None):
        self.provider = provider or config.DEFAULT_LLM_PROVIDER
        self.client = None
        self._setup_client()
    
    def _setup_client(self):
        """设置API客户端"""
        if self.provider == "openai":
            self.client = OpenAI(
                api_key=config.OPENAI_API_KEY,
                base_url=config.OPENAI_BASE_URL
            )
        elif self.provider == "deepseek":
            self.client = OpenAI(
                api_key=config.DEEPSEEK_API_KEY,
                base_url=config.DEEPSEEK_BASE_URL
            )
        else:
            raise ValueError(f"不支持的LLM提供商: {self.provider}")
    
    def _get_model_name(self) -> str:
        """获取模型名称"""
        if self.provider == "openai":
            return config.OPENAI_MODEL
        elif self.provider == "deepseek":
            return config.DEEPSEEK_MODEL
        else:
            raise ValueError(f"不支持的LLM提供商: {self.provider}")
    
    def _create_prompt(self, resume_text: str) -> str:
        """创建提示词"""
        prompt = f"""
你是一个专业的简历解析助手。请仔细分析以下简历内容，并将其转换为结构化的JSON格式。

请严格按照以下JSON结构输出，确保所有字段都包含在内：

{{
  "contact_info": {{
    "name": "姓名",
    "phone": "电话号码",
    "email": "邮箱地址",
    "address": "地址",
    "linkedin": "LinkedIn链接",
    "github": "GitHub链接",
    "website": "个人网站"
  }},
  "summary": "个人简介",
  "education": [
    {{
      "institution": "学校名称",
      "degree": "学位",
      "major": "专业",
      "start_date": "开始时间",
      "end_date": "结束时间",
      "gpa": "GPA",
      "achievements": ["成就和奖项"]
    }}
  ],
  "work_experience": [
    {{
      "company": "公司名称",
      "position": "职位",
      "start_date": "开始时间",
      "end_date": "结束时间",
      "location": "工作地点",
      "responsibilities": ["工作职责"],
      "achievements": ["工作成就"]
    }}
  ],
  "projects": [
    {{
      "name": "项目名称",
      "description": "项目描述",
      "start_date": "开始时间",
      "end_date": "结束时间",
      "technologies": ["使用的技术"],
      "url": "项目链接",
      "achievements": ["项目成果"]
    }}
  ],
  "skills": [
    {{
      "category": "技能类别",
      "items": ["技能项目"],
      "proficiency": "熟练程度"
    }}
  ],
  "languages": [
    {{
      "language": "语言",
      "proficiency": "熟练程度"
    }}
  ],
  "certificates": [
    {{
      "name": "证书名称",
      "issuer": "颁发机构",
      "date": "获得日期",
      "expiry_date": "过期日期",
      "url": "证书链接"
    }}
  ],
  "awards": ["奖项"],
  "volunteer_experience": ["志愿服务经历"],
  "publications": ["出版物"],
  "references": ["推荐人"]
}}

注意事项：
1. 请仔细阅读简历内容，准确提取信息
2. 如果某些字段在简历中没有提及，请使用null或空数组
3. 日期格式请尽量标准化（如：2023-01-01）
4. 请确保输出的是有效的JSON格式
5. 只返回JSON，不要包含任何其他文本

简历内容：
{resume_text}
"""
        return prompt
    
    def parse_resume(self, resume_text: str) -> Optional[Resume]:
        """解析简历文本，返回结构化数据"""
        try:
            prompt = self._create_prompt(resume_text)
            
            response = self.client.chat.completions.create(
                model=self._get_model_name(),
                messages=[
                    {"role": "system", "content": "你是一个专业的简历解析助手，专门将简历内容转换为结构化JSON格式。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=config.MAX_TOKENS,
                temperature=config.TEMPERATURE
            )
            
            # 提取响应内容
            content = response.choices[0].message.content
            logger.info(f"LLM响应: {content[:200]}...")
            
            # 尝试解析JSON
            try:
                # 清理响应内容，去除可能的markdown格式
                content = content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                # 解析JSON
                parsed_data = json.loads(content)
                
                # 验证和创建Resume对象
                resume = Resume(**parsed_data)
                logger.info("简历解析成功")
                return resume
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON解析错误: {str(e)}")
                logger.error(f"响应内容: {content}")
                return None
            except Exception as e:
                logger.error(f"Resume对象创建错误: {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"LLM调用错误: {str(e)}")
            return None
    
    def get_provider_info(self) -> Dict[str, Any]:
        """获取当前提供商信息"""
        return {
            "provider": self.provider,
            "model": self._get_model_name(),
            "max_tokens": config.MAX_TOKENS,
            "temperature": config.TEMPERATURE
        } 