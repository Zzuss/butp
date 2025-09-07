"""
预测输出标准化工具
用于在生成预测文件时标准化课程名称
"""

import os
import sys
import pandas as pd
from courseNameNormalizer import normalize_dataframe_columns

def normalize_prediction_file(input_file, output_file=None):
    """
    标准化预测输出文件的列名
    
    Args:
        input_file: 输入文件路径
        output_file: 输出文件路径，如果为None则覆盖输入文件
        
    Returns:
        是否成功
    """
    try:
        print(f"正在标准化预测文件: {input_file}")
        
        # 确定输出文件路径
        output_path = output_file if output_file else input_file
        
        # 检查文件扩展名
        _, ext = os.path.splitext(input_file)
        
        # 读取文件
        if ext.lower() == '.csv':
            df = pd.read_csv(input_file)
        else:  # 默认为Excel
            df = pd.read_excel(input_file)
        
        # 标准化列名
        df = normalize_dataframe_columns(df)
        
        # 保存结果
        if ext.lower() == '.csv':
            df.to_csv(output_path, index=False)
        else:  # 默认为Excel
            df.to_excel(output_path, index=False, engine='openpyxl')
        
        print(f"文件标准化完成: {output_path}")
        return True
    except Exception as e:
        print(f"标准化预测文件失败: {str(e)}")
        return False

def normalize_all_prediction_files(directory):
    """
    标准化目录中所有预测输出文件的列名
    
    Args:
        directory: 目录路径
        
    Returns:
        成功标准化的文件数量
    """
    try:
        print(f"正在处理目录: {directory}")
        
        # 检查目录是否存在
        if not os.path.isdir(directory):
            print(f"目录不存在: {directory}")
            return 0
        
        # 获取所有Excel和CSV文件
        files = []
        for file in os.listdir(directory):
            if file.endswith('.xlsx') or file.endswith('.xls') or file.endswith('.csv'):
                if 'Predictions' in file or 'Probability' in file:
                    files.append(os.path.join(directory, file))
        
        # 标准化每个文件
        success_count = 0
        for file in files:
            if normalize_prediction_file(file):
                success_count += 1
        
        print(f"成功标准化 {success_count}/{len(files)} 个文件")
        return success_count
    except Exception as e:
        print(f"处理目录失败: {str(e)}")
        return 0

# 命令行入口
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python normalize_prediction_output.py <文件路径或目录路径>")
        sys.exit(1)
    
    path = sys.argv[1]
    
    if os.path.isdir(path):
        normalize_all_prediction_files(path)
    elif os.path.isfile(path):
        normalize_prediction_file(path)
    else:
        print(f"路径不存在: {path}")
        sys.exit(1)
