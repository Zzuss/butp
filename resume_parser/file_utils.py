import os
import PyPDF2
import docx
from typing import Optional
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FileProcessor:
    """文件处理器，支持多种格式的简历文件"""
    
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """从PDF文件中提取文本"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
                return text.strip()
        except Exception as e:
            logger.error(f"PDF提取错误: {str(e)}")
            return ""
    
    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        """从Word文档中提取文本"""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Word文档提取错误: {str(e)}")
            return ""
    
    @staticmethod
    def extract_text_from_txt(file_path: str) -> str:
        """从文本文件中提取文本"""
        try:
            encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as file:
                        return file.read().strip()
                except UnicodeDecodeError:
                    continue
            
            # 如果所有编码都失败，使用errors='ignore'
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                return file.read().strip()
        except Exception as e:
            logger.error(f"文本文件提取错误: {str(e)}")
            return ""
    
    @staticmethod
    def extract_text_from_file(file_path: str) -> Optional[str]:
        """根据文件扩展名自动选择提取方法"""
        if not os.path.exists(file_path):
            logger.error(f"文件不存在: {file_path}")
            return None
        
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension == '.pdf':
            return FileProcessor.extract_text_from_pdf(file_path)
        elif file_extension in ['.docx', '.doc']:
            if file_extension == '.doc':
                logger.warning("不完全支持.doc格式，建议转换为.docx")
            return FileProcessor.extract_text_from_docx(file_path)
        elif file_extension == '.txt':
            return FileProcessor.extract_text_from_txt(file_path)
        else:
            logger.error(f"不支持的文件格式: {file_extension}")
            return None
    
    @staticmethod
    def validate_file(file_path: str) -> bool:
        """验证文件是否存在且格式支持"""
        if not os.path.exists(file_path):
            return False
        
        file_extension = os.path.splitext(file_path)[1].lower()
        supported_formats = ['.pdf', '.docx', '.doc', '.txt']
        
        return file_extension in supported_formats 