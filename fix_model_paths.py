#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复阿里云服务器上的模型文件路径问题
"""

import os
import shutil

def fix_model_paths():
    """修复模型文件路径"""
    print("=== 修复模型文件路径 ===")
    
    base_dir = "/opt/prediction-service/function"
    model_params_dir = os.path.join(base_dir, "Model_Params")
    catboost_model_dir = os.path.join(model_params_dir, "Task3_CatBoost_Model")
    
    print(f"基础目录: {base_dir}")
    print(f"模型参数目录: {model_params_dir}")
    print(f"CatBoost模型目录: {catboost_model_dir}")
    
    # 检查目录是否存在
    if not os.path.exists(model_params_dir):
        print(f"❌ Model_Params目录不存在: {model_params_dir}")
        return False
    
    if not os.path.exists(catboost_model_dir):
        print(f"❌ CatBoost模型目录不存在: {catboost_model_dir}")
        return False
    
    # 需要的模型文件
    required_files = [
        "feature_columns.json",
        "catboost_model.cbm",
        "scaler.pkl"
    ]
    
    # 检查并复制模型文件到基础目录
    for file_name in required_files:
        source_file = os.path.join(catboost_model_dir, file_name)
        target_file = os.path.join(base_dir, file_name)
        
        if os.path.exists(source_file):
            try:
                shutil.copy2(source_file, target_file)
                print(f"✅ 复制 {file_name} 到基础目录")
            except Exception as e:
                print(f"❌ 复制 {file_name} 失败: {e}")
                return False
        else:
            print(f"❌ 源文件不存在: {source_file}")
            return False
    
    print("✅ 模型文件路径修复完成")
    return True

def verify_model_files():
    """验证模型文件"""
    print("\n=== 验证模型文件 ===")
    
    base_dir = "/opt/prediction-service/function"
    required_files = [
        "feature_columns.json",
        "catboost_model.cbm", 
        "scaler.pkl"
    ]
    
    all_exist = True
    for file_name in required_files:
        file_path = os.path.join(base_dir, file_name)
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            print(f"✅ {file_name}: 存在 ({size} bytes)")
        else:
            print(f"❌ {file_name}: 不存在")
            all_exist = False
    
    return all_exist

def main():
    print("=== 阿里云模型文件路径修复 ===")
    
    # 切换到正确目录
    os.chdir("/opt/prediction-service/function")
    
    # 修复路径
    if fix_model_paths():
        # 验证文件
        if verify_model_files():
            print("\n🎉 模型文件修复成功！")
            print("现在可以重新测试算法了")
        else:
            print("\n❌ 模型文件验证失败")
    else:
        print("\n❌ 模型文件修复失败")
        print("请检查Model_Params目录是否完整上传")

if __name__ == "__main__":
    main()
