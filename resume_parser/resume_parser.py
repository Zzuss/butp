import os
import json
import logging
from typing import Optional, Dict, Any
from .file_utils import FileProcessor
from .llm_client import LLMClient
from .resume_models import Resume

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResumeParser:
    """简历解析器主类"""
    
    def __init__(self, llm_provider: str = None):
        """
        初始化简历解析器
        
        Args:
            llm_provider: LLM提供商 ('openai', 'deepseek')
        """
        self.file_processor = FileProcessor()
        self.llm_client = LLMClient(provider=llm_provider)
        
    def parse_resume_from_file(self, file_path: str) -> Optional[Resume]:
        """
        从文件解析简历
        
        Args:
            file_path: 简历文件路径
            
        Returns:
            Resume对象或None
        """
        logger.info(f"开始解析简历文件: {file_path}")
        
        # 验证文件
        if not self.file_processor.validate_file(file_path):
            logger.error(f"文件验证失败: {file_path}")
            return None
        
        # 提取文本
        resume_text = self.file_processor.extract_text_from_file(file_path)
        if not resume_text:
            logger.error(f"无法提取文本: {file_path}")
            return None
        
        logger.info(f"成功提取文本，长度: {len(resume_text)} 字符")
        
        # 使用LLM解析
        resume = self.llm_client.parse_resume(resume_text)
        if resume:
            logger.info("简历解析成功")
        else:
            logger.error("简历解析失败")
            
        return resume
    
    def parse_resume_from_text(self, resume_text: str) -> Optional[Resume]:
        """
        从文本解析简历
        
        Args:
            resume_text: 简历文本内容
            
        Returns:
            Resume对象或None
        """
        logger.info("开始解析简历文本")
        
        if not resume_text.strip():
            logger.error("输入文本为空")
            return None
        
        # 使用LLM解析
        resume = self.llm_client.parse_resume(resume_text)
        if resume:
            logger.info("简历解析成功")
        else:
            logger.error("简历解析失败")
            
        return resume
    
    def save_resume_to_json(self, resume: Resume, output_path: str) -> bool:
        """
        保存简历到JSON文件
        
        Args:
            resume: Resume对象
            output_path: 输出文件路径
            
        Returns:
            是否成功
        """
        try:
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # 保存JSON
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(resume.to_json())
            
            logger.info(f"简历已保存到: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"保存失败: {str(e)}")
            return False
    
    def parse_and_save(self, file_path: str, output_path: str = None) -> Optional[Resume]:
        """
        解析简历并保存到JSON文件
        
        Args:
            file_path: 输入文件路径
            output_path: 输出文件路径（可选）
            
        Returns:
            Resume对象或None
        """
        # 解析简历
        resume = self.parse_resume_from_file(file_path)
        if not resume:
            return None
        
        # 生成输出路径
        if not output_path:
            base_name = os.path.splitext(os.path.basename(file_path))[0]
            output_path = f"{base_name}_parsed.json"
        
        # 保存结果
        if self.save_resume_to_json(resume, output_path):
            logger.info(f"完整流程执行成功，结果保存在: {output_path}")
        
        return resume
    
    def get_supported_formats(self) -> list:
        """获取支持的文件格式"""
        return ['.pdf', '.docx', '.doc', '.txt']
    
    def get_llm_info(self) -> Dict[str, Any]:
        """获取LLM信息"""
        return self.llm_client.get_provider_info()

# 便捷函数
def parse_resume(file_path: str, llm_provider: str = None, output_path: str = None) -> Optional[Resume]:
    """
    便捷函数：解析简历文件
    
    Args:
        file_path: 简历文件路径
        llm_provider: LLM提供商 ('openai', 'deepseek')
        output_path: 输出文件路径（可选）
        
    Returns:
        Resume对象或None
    """
    parser = ResumeParser(llm_provider=llm_provider)
    return parser.parse_and_save(file_path, output_path)

def parse_resume_text(resume_text: str, llm_provider: str = None) -> Optional[Resume]:
    """
    便捷函数：解析简历文本
    
    Args:
        resume_text: 简历文本内容
        llm_provider: LLM提供商 ('openai', 'deepseek')
        
    Returns:
        Resume对象或None
    """
    parser = ResumeParser(llm_provider=llm_provider)
    return parser.parse_resume_from_text(resume_text) 