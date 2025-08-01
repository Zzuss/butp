#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path

def load_model():
    """加载XGBoost模型和相关文件"""
    # 获取模型文件路径
    model_dir = Path(__file__).parent.parent / 'public' / 'algorithms' / 'Task3_XGBoost_Model'
    
    # 加载模型文件
    model_path = model_dir / 'xgb_model.pkl'
    scaler_path = model_dir / 'scaler.pkl'
    label_encoder_path = model_dir / 'label_encoder.pkl'
    feature_columns_path = model_dir / 'feature_columns.json'
    
    try:
        # 加载模型
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        # 加载标准化器
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        
        # 加载标签编码器
        with open(label_encoder_path, 'rb') as f:
            label_encoder = pickle.load(f)
        
        # 加载特征列名
        with open(feature_columns_path, 'r', encoding='utf-8') as f:
            feature_columns = json.load(f)
        
        return model, scaler, label_encoder, feature_columns
        
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        sys.exit(1)

def predict(feature_values):
    """使用XGBoost模型进行预测"""
    try:
        # 加载模型
        model, scaler, label_encoder, feature_columns = load_model()
        
        # 准备特征数据
        features = []
        for col in feature_columns:
            features.append(feature_values[col])
        
        # 转换为numpy数组
        X = np.array(features).reshape(1, -1)
        
        # 标准化特征
        X_scaled = scaler.transform(X)
        
        # 进行预测
        probabilities = model.predict_proba(X_scaled)[0]
        predicted_class = model.predict(X_scaled)[0]
        
        # 解码预测的类别
        predicted_class_decoded = label_encoder.inverse_transform([predicted_class])[0]
        
        # 返回结果
        result = {
            'probabilities': probabilities.tolist(),  # 3个百分比
            'predictedClass': int(predicted_class_decoded),  # 最高概率的类别 (0, 1, 或 2)
            'featureValues': feature_values
        }
        
        return result
        
    except Exception as e:
        print(f"Error during prediction: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    """主函数"""
    if len(sys.argv) != 2:
        print("Usage: python predict.py <input_data_path>", file=sys.stderr)
        sys.exit(1)
    
    input_data_path = sys.argv[1]
    
    try:
        # 读取输入数据
        with open(input_data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        feature_values = data['featureValues']
        
        # 进行预测
        result = predict(feature_values)
        
        # 输出结果（JSON格式）
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 