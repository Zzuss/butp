#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import json
import numpy as np
import joblib
import os

def load_model_and_predict(features):
    """加载模型并进行预测"""
    try:
        # 获取模型文件路径
        model_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(model_dir, '..', 'public', 'algorithms')
        
        # 加载模型文件
        model_file = os.path.join(model_path, 'xgb_model.pkl')
        scaler_file = os.path.join(model_path, 'scaler.pkl')
        encoder_file = os.path.join(model_path, 'label_encoder.pkl')
        
        # 检查文件是否存在
        if not os.path.exists(model_file):
            return {"error": "模型文件不存在"}
        if not os.path.exists(scaler_file):
            return {"error": "标准化文件不存在"}
        if not os.path.exists(encoder_file):
            return {"error": "编码器文件不存在"}
        
        # 加载模型和预处理组件
        model = joblib.load(model_file)
        scaler = joblib.load(scaler_file)
        encoder = joblib.load(encoder_file)
        
        # 准备特征数据
        X = np.array(features).reshape(1, -1)
        
        # 数据预处理
        X_scaled = scaler.transform(X)
        
        # 模型预测
        prediction = model.predict(X_scaled)  # 输出类别标签 (0, 1, 或 2)
        proba = model.predict_proba(X_scaled)  # 输出每个类别的概率
        
        # 转换为百分比
        percentages = proba[0] * 100
        
        # 返回结果
        result = {
            "success": True,
            "prediction": int(prediction[0]),  # 预测的类别
            "probabilities": {
                "domestic": float(percentages[0]),  # 国内读研概率 (去向0)
                "overseas": float(percentages[1]),  # 海外读研概率 (去向1)
                "employment": float(percentages[2])  # 就业概率 (去向2) - 保留但不使用
            }
        }
        
        return result
        
    except Exception as e:
        return {"error": f"预测失败: {str(e)}"}

def main():
    """主函数"""
    try:
        # 检查命令行参数
        if len(sys.argv) != 2:
            print(json.dumps({"error": "需要提供特征数据参数"}))
            sys.exit(1)
        
        # 解析输入的特征数据
        features_json = sys.argv[1]
        features = json.loads(features_json)
        
        # 验证特征数据
        if not isinstance(features, list) or len(features) != 9:
            print(json.dumps({"error": "需要提供9个特征值"}))
            sys.exit(1)
        
        # 进行预测
        result = load_model_and_predict(features)
        
        # 输出结果
        print(json.dumps(result, ensure_ascii=False))
        
    except json.JSONDecodeError:
        print(json.dumps({"error": "特征数据格式错误"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"脚本执行错误: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main() 