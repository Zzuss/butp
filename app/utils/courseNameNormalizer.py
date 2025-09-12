"""
课程名称标准化工具
用于在Python算法中标准化课程名称，确保生成的预测文件中课程名称格式一致
"""

import re
import pandas as pd


def normalize_course_name(course_name):
    """
    标准化课程名称
    处理常见的差异，如括号格式、多余空格、重复括号等
    
    Args:
        course_name: 原始课程名称
        
    Returns:
        标准化后的课程名称
    """
    if not course_name or not isinstance(course_name, str):
        return course_name
    
    normalized = course_name
    
    # 1. 修复重复的括号 - 如 "课程（实践环节））" -> "课程（实践环节）"
    normalized = fix_repeated_brackets(normalized)
    
    # 2. 统一括号格式 - 将英文括号替换为中文括号，保持一致性
    normalized = standardize_brackets(normalized)
    
    # 3. 移除括号内多余的空格 - 如 "课程（ 实践环节 ）" -> "课程（实践环节）"
    normalized = remove_excess_spaces_in_brackets(normalized)
    
    # 4. 移除首尾空格
    normalized = normalized.strip()
    
    # 5. 处理连续多个空格为单个空格
    normalized = re.sub(r'\s+', ' ', normalized)
    
    return normalized


def fix_repeated_brackets(text):
    """
    修复重复的括号
    
    Args:
        text: 输入文本
        
    Returns:
        修复后的文本
    """
    if not isinstance(text, str):
        return text
    
    # 修复重复的右括号 - 如 "课程（实践环节））" -> "课程（实践环节）"
    result = text
    while '））' in result:
        result = result.replace('））', '）')
    while '))' in result:
        result = result.replace('))', ')')
    
    # 修复重复的左括号 - 如 "课程（（实践环节）" -> "课程（实践环节）"
    while '（（' in result:
        result = result.replace('（（', '（')
    while '((' in result:
        result = result.replace('((', '(')
    
    return result


def standardize_brackets(text):
    """
    统一括号格式
    
    Args:
        text: 输入文本
        
    Returns:
        标准化括号后的文本
    """
    if not isinstance(text, str):
        return text
    
    # 将英文括号替换为中文括号
    return text.replace('(', '（').replace(')', '）')


def remove_excess_spaces_in_brackets(text):
    """
    移除括号内多余的空格
    
    Args:
        text: 输入文本
        
    Returns:
        处理后的文本
    """
    if not isinstance(text, str):
        return text
    
    # 匹配中文括号内的内容
    chinese_bracket_pattern = r'（([^（）]*)）'
    
    # 处理中文括号
    def replace_chinese_brackets(match):
        content = match.group(1).strip()
        content = re.sub(r'\s+', ' ', content)
        return f'（{content}）'
    
    result = re.sub(chinese_bracket_pattern, replace_chinese_brackets, text)
    
    # 匹配英文括号内的内容
    english_bracket_pattern = r'\(([^()]*)\)'
    
    # 处理英文括号
    def replace_english_brackets(match):
        content = match.group(1).strip()
        content = re.sub(r'\s+', ' ', content)
        return f'({content})'
    
    result = re.sub(english_bracket_pattern, replace_english_brackets, result)
    
    return result


def normalize_dataframe_columns(df):
    """
    标准化DataFrame的列名
    
    Args:
        df: 输入的DataFrame
        
    Returns:
        列名标准化后的DataFrame
    """
    if not isinstance(df, pd.DataFrame):
        return df
    
    # 创建列名映射
    column_mapping = {col: normalize_course_name(col) for col in df.columns}
    
    # 重命名列
    return df.rename(columns=column_mapping)


def normalize_excel_headers(input_file, output_file=None):
    """
    标准化Excel文件的表头
    
    Args:
        input_file: 输入Excel文件路径
        output_file: 输出Excel文件路径，如果为None则覆盖输入文件
        
    Returns:
        是否成功
    """
    try:
        # 读取Excel文件
        df = pd.read_excel(input_file)
        
        # 标准化列名
        df = normalize_dataframe_columns(df)
        
        # 保存结果
        output_path = output_file if output_file else input_file
        df.to_excel(output_path, index=False)
        
        return True
    except Exception as e:
        print(f"标准化Excel表头失败: {str(e)}")
        return False


# 用于测试
if __name__ == "__main__":
    # 测试课程名称标准化
    test_names = [
        "毛泽东思想和中国特色社会主义理论体系概论（实践环节））",
        "Design & Build实训(智能)",
        "程序设计基础 ",
        "毛泽东思想和中国特色社会主义理论体系概论（ 实践环节 ）",
        "3D图形程序设计*"
    ]
    
    for name in test_names:
        normalized = normalize_course_name(name)
        print(f"原始: '{name}'")
        print(f"标准化: '{normalized}'")
        print()
