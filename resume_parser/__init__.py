"""
简历解析系统

一个基于大语言模型（LLM）的简历解析系统，能够从PDF、Word文档或文本中提取简历信息，
并将其结构化为JSON格式。
"""

from .resume_parser import ResumeParser, parse_resume, parse_resume_text
from .resume_models import Resume, ContactInfo, Education, WorkExperience, Project, Skill, Language, Certificate
from .llm_client import LLMClient
from .file_utils import FileProcessor
from .config import config

__version__ = "1.0.0"
__author__ = "Resume Parser Team"
__all__ = [
    "ResumeParser",
    "parse_resume",
    "parse_resume_text", 
    "Resume",
    "ContactInfo",
    "Education",
    "WorkExperience",
    "Project",
    "Skill",
    "Language",
    "Certificate",
    "LLMClient",
    "FileProcessor",
    "config"
] 