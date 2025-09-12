"""
更新预测算法脚本
用于修改Optimization_model_func3_1.py，添加课程名称标准化功能
"""

import os
import re
import sys

def update_optimization_model(file_path):
    """
    更新Optimization_model_func3_1.py文件，添加课程名称标准化功能
    
    Args:
        file_path: 算法文件路径
        
    Returns:
        是否成功
    """
    try:
        print(f"正在更新算法文件: {file_path}")
        
        # 检查文件是否存在
        if not os.path.isfile(file_path):
            print(f"文件不存在: {file_path}")
            return False
        
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # 添加导入语句
        import_statement = """
# 导入课程名称标准化工具
import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'utils'))
try:
    from courseNameNormalizer import normalize_course_name, normalize_dataframe_columns
except ImportError:
    # 如果导入失败，提供简单的实现
    def normalize_course_name(name):
        if not isinstance(name, str):
            return name
        return name.strip()
    
    def normalize_dataframe_columns(df):
        return df
"""
        
        # 检查是否已经添加了导入语句
        if "from courseNameNormalizer import" in content:
            print("课程名称标准化工具已导入，无需更新")
        else:
            # 在其他导入语句之后添加
            import_pattern = r"(import.*?\n+)"
            match = re.search(import_pattern, content, re.DOTALL)
            if match:
                last_import = match.group(0)
                last_import_pos = content.rfind(last_import) + len(last_import)
                content = content[:last_import_pos] + import_statement + content[last_import_pos:]
            else:
                # 如果找不到导入语句，添加到文件开头
                content = import_statement + content
        
        # 修改DataFrame保存前的代码，添加列名标准化
        save_patterns = [
            r"(df_pred\.to_excel\(.*?\))",  # Excel保存模式1
            r"(with pd\.ExcelWriter\(.*?\) as writer:[\s\S]*?df_pred\.to_excel\(.*?\))",  # Excel保存模式2
            r"(df_pred\.to_csv\(.*?\))"  # CSV保存模式
        ]
        
        for pattern in save_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                save_code = match.group(1)
                # 在保存前添加标准化代码
                normalized_save_code = f"# 标准化DataFrame列名\ndf_pred = normalize_dataframe_columns(df_pred)\n{save_code}"
                content = content.replace(save_code, normalized_save_code)
        
        # 保存修改后的文件
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)
        
        print(f"文件更新成功: {file_path}")
        return True
    except Exception as e:
        print(f"更新算法文件失败: {str(e)}")
        return False

# 命令行入口
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python update_optimization_model.py <算法文件路径>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    update_optimization_model(file_path)
