import os
import json
import sys
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

def log_message(message, level="INFO"):
    """简单的日志输出，兼容Windows"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def analyze_model_output():
    """深度分析模型输出格式"""
    log_message("开始深度分析模型输出格式...")
    
    try:
        import joblib
        import xgboost as xgb
        
        model_dir = Path("../public/algorithms")
        
        # 加载模型组件
        log_message("加载模型组件...")
        scaler = joblib.load(model_dir / "scaler.pkl")
        encoder = joblib.load(model_dir / "label_encoder.pkl")
        model = joblib.load(model_dir / "xgb_model.pkl")
        
        # 分析模型类型和属性
        log_message(f"模型类型: {type(model)}")
        log_message(f"模型类名: {model.__class__.__name__}")
        
        # 检查模型是否有predict_proba方法
        if hasattr(model, 'predict_proba'):
            log_message("[OK] 模型支持概率预测 (predict_proba)")
        else:
            log_message("[WARNING] 模型不支持概率预测")
        
        # 检查模型是否有predict方法
        if hasattr(model, 'predict'):
            log_message("[OK] 模型支持类别预测 (predict)")
        else:
            log_message("[WARNING] 模型不支持类别预测")
        
        # 检查label_encoder
        log_message(f"Label Encoder类型: {type(encoder)}")
        if hasattr(encoder, 'classes_'):
            log_message(f"编码器类别: {encoder.classes_}")
            log_message(f"类别数量: {len(encoder.classes_)}")
        else:
            log_message("[WARNING] 编码器没有classes_属性")
        
        # 准备测试数据
        test_features = np.array([85.5, 88.0, 92.3, 87.8, 89.2, 86.7, 90.1, 84.9, 88.5]).reshape(1, -1)
        
        # 数据预处理
        test_scaled = scaler.transform(test_features)
        log_message(f"标准化后的特征: {test_scaled[0]}")
        
        # 测试不同的预测方法
        results = {}
        
        # 1. 测试predict方法
        try:
            prediction = model.predict(test_scaled)
            results['predict'] = prediction.tolist()
            log_message(f"predict输出: {prediction}")
            log_message(f"predict输出类型: {type(prediction)}")
            log_message(f"predict输出形状: {prediction.shape}")
        except Exception as e:
            log_message(f"predict方法失败: {e}", "ERROR")
        
        # 2. 测试predict_proba方法
        try:
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(test_scaled)
                results['predict_proba'] = proba.tolist()
                log_message(f"predict_proba输出: {proba}")
                log_message(f"predict_proba输出类型: {type(proba)}")
                log_message(f"predict_proba输出形状: {proba.shape}")
                
                # 分析概率分布
                for i, prob in enumerate(proba[0]):
                    log_message(f"类别 {i} 的概率: {prob:.4f}")
                
                # 计算百分比
                percentages = proba[0] * 100
                log_message(f"转换为百分比: {percentages}")
                results['percentages'] = percentages.tolist()
            else:
                log_message("模型不支持predict_proba方法")
        except Exception as e:
            log_message(f"predict_proba方法失败: {e}", "ERROR")
        
        # 3. 测试多个不同的输入
        log_message("测试多个不同的输入...")
        test_cases = [
            {"name": "高分", "features": [95, 95, 95, 95, 95, 95, 95, 95, 95]},
            {"name": "中等", "features": [75, 75, 75, 75, 75, 75, 75, 75, 75]},
            {"name": "低分", "features": [60, 60, 60, 60, 60, 60, 60, 60, 60]}
        ]
        
        multiple_results = []
        for test_case in test_cases:
            features = np.array(test_case["features"]).reshape(1, -1)
            scaled = scaler.transform(features)
            
            case_result = {"name": test_case["name"], "input": test_case["features"]}
            
            # predict
            pred = model.predict(scaled)
            case_result["predict"] = pred.tolist()
            
            # predict_proba
            if hasattr(model, 'predict_proba'):
                prob = model.predict_proba(scaled)
                case_result["predict_proba"] = prob.tolist()
                case_result["percentages"] = (prob[0] * 100).tolist()
            
            multiple_results.append(case_result)
            log_message(f"{test_case['name']}: predict={pred}, proba={prob[0] if hasattr(model, 'predict_proba') else 'N/A'}")
        
        results['multiple_tests'] = multiple_results
        
        # 保存详细结果
        with open("logs/deep_analysis_results.json", 'w', encoding='utf-8') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "model_info": {
                    "model_type": str(type(model)),
                    "model_class": model.__class__.__name__,
                    "has_predict_proba": hasattr(model, 'predict_proba'),
                    "has_predict": hasattr(model, 'predict'),
                    "encoder_classes": encoder.classes_.tolist() if hasattr(encoder, 'classes_') else None
                },
                "analysis_results": results
            }, f, indent=2, ensure_ascii=False)
        
        log_message("深度分析结果已保存到 logs/deep_analysis_results.json")
        
        return True, results
        
    except Exception as e:
        log_message(f"[ERROR] 深度分析失败: {e}", "ERROR")
        return False, None

def run_deep_analysis():
    """运行深度分析"""
    log_message("=" * 50)
    log_message("开始模型输出格式深度分析")
    log_message("=" * 50)
    
    # 创建日志目录
    os.makedirs("logs", exist_ok=True)
    
    success, results = analyze_model_output()
    
    log_message("=" * 50)
    if success:
        log_message("[SUCCESS] 深度分析完成！")
    else:
        log_message("[ERROR] 深度分析失败", "ERROR")
    log_message("=" * 50)
    
    return success, results

if __name__ == "__main__":
    success, results = run_deep_analysis()
    sys.exit(0 if success else 1) 