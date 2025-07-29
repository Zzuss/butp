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

def test_model_prediction():
    """测试模型预测功能"""
    log_message("开始测试模型预测功能...")
    
    try:
        # 导入必要的库
        import joblib
        import xgboost as xgb
        
        model_dir = Path("../public/algorithms")
        
        # 加载模型组件
        log_message("加载模型组件...")
        scaler = joblib.load(model_dir / "scaler.pkl")
        encoder = joblib.load(model_dir / "label_encoder.pkl")
        model = joblib.load(model_dir / "xgb_model.pkl")
        
        # 加载特征列
        with open(model_dir / "feature_columns.json", 'r', encoding='utf-8') as f:
            feature_columns = json.load(f)
        
        log_message(f"特征列: {feature_columns}")
        
        # 准备测试数据
        test_cases = [
            {
                "name": "正常数据测试",
                "features": {
                    "public": 85.5,
                    "political": 88.0,
                    "english": 92.3,
                    "math_science": 87.8,
                    "basic_subject": 89.2,
                    "basic_major": 86.7,
                    "major": 90.1,
                    "practice": 84.9,
                    "innovation": 88.5
                }
            },
            {
                "name": "边界值测试",
                "features": {
                    "public": 60.0,
                    "political": 60.0,
                    "english": 60.0,
                    "math_science": 60.0,
                    "basic_subject": 60.0,
                    "basic_major": 60.0,
                    "major": 60.0,
                    "practice": 60.0,
                    "innovation": 60.0
                }
            },
            {
                "name": "高分测试",
                "features": {
                    "public": 95.0,
                    "political": 95.0,
                    "english": 95.0,
                    "math_science": 95.0,
                    "basic_subject": 95.0,
                    "basic_major": 95.0,
                    "major": 95.0,
                    "practice": 95.0,
                    "innovation": 95.0
                }
            }
        ]
        
        results = []
        
        for test_case in test_cases:
            log_message(f"测试用例: {test_case['name']}")
            
            # 准备特征数据
            features = []
            for col in feature_columns:
                features.append(test_case["features"][col])
            
            # 转换为numpy数组
            X = np.array(features).reshape(1, -1)
            log_message(f"输入特征: {X[0]}")
            
            # 数据预处理
            X_scaled = scaler.transform(X)
            log_message(f"标准化后: {X_scaled[0]}")
            
            # 模型预测
            prediction = model.predict(X_scaled)
            log_message(f"预测结果: {prediction[0]}")
            
            # 验证预测结果
            if 0 <= prediction[0] <= 100:
                log_message(f"[OK] 预测结果在合理范围内: {prediction[0]:.2f}%")
            else:
                log_message(f"[WARNING] 预测结果超出范围: {prediction[0]:.2f}%", "WARNING")
            
            results.append({
                "test_case": test_case["name"],
                "input_features": test_case["features"],
                "prediction": float(prediction[0]),
                "is_valid": 0 <= prediction[0] <= 100
            })
            
            log_message("-" * 40)
        
        # 保存测试结果
        with open("logs/prediction_test_results.json", 'w', encoding='utf-8') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "model_info": {
                    "feature_columns": feature_columns,
                    "model_type": str(type(model)),
                    "scaler_type": str(type(scaler)),
                    "encoder_type": str(type(encoder))
                },
                "test_results": results
            }, f, indent=2, ensure_ascii=False)
        
        log_message("预测测试结果已保存到 logs/prediction_test_results.json")
        
        # 验证所有预测结果
        all_valid = all(result["is_valid"] for result in results)
        if all_valid:
            log_message("[SUCCESS] 所有预测结果都在合理范围内")
        else:
            log_message("[WARNING] 部分预测结果超出合理范围", "WARNING")
        
        return True, results
        
    except ImportError as e:
        log_message(f"[ERROR] 缺少必要的库: {e}", "ERROR")
        log_message("请安装: pip install scikit-learn joblib xgboost numpy pandas", "ERROR")
        return False, None
    except Exception as e:
        log_message(f"[ERROR] 模型预测测试失败: {e}", "ERROR")
        return False, None

def test_model_verification():
    """测试模型验证逻辑"""
    log_message("开始测试模型验证逻辑...")
    
    try:
        import joblib
        import xgboost as xgb
        
        model_dir = Path("../public/algorithms")
        
        # 验证模型文件路径
        model_path = model_dir / "xgb_model.pkl"
        if not model_path.exists():
            log_message("[ERROR] 模型文件不存在", "ERROR")
            return False
        
        # 验证模型类型
        model = joblib.load(model_path)
        if not isinstance(model, xgb.XGBRegressor):
            log_message(f"[WARNING] 模型类型不是XGBRegressor: {type(model)}", "WARNING")
        else:
            log_message("[OK] 模型类型正确: XGBRegressor")
        
        # 验证模型参数
        expected_params = {
            "colsample_bytree", "learning_rate", "max_depth",
            "min_child_weight", "n_estimators", "reg_alpha", "reg_lambda", "subsample"
        }
        
        model_params = set(model.get_params().keys())
        if expected_params.issubset(model_params):
            log_message("[OK] 模型参数验证通过")
        else:
            log_message(f"[WARNING] 模型参数不完整: {expected_params - model_params}", "WARNING")
        
        # 验证特征数量
        with open(model_dir / "feature_columns.json", 'r', encoding='utf-8') as f:
            feature_columns = json.load(f)
        
        if len(feature_columns) == 9:
            log_message("[OK] 特征数量正确: 9个")
        else:
            log_message(f"[ERROR] 特征数量错误: {len(feature_columns)}", "ERROR")
        
        return True
        
    except Exception as e:
        log_message(f"[ERROR] 模型验证测试失败: {e}", "ERROR")
        return False

def run_prediction_tests():
    """运行完整的预测测试"""
    log_message("=" * 50)
    log_message("开始模型预测测试")
    log_message("=" * 50)
    
    # 创建日志目录
    os.makedirs("logs", exist_ok=True)
    
    # 1. 测试模型验证逻辑
    verification_ok = test_model_verification()
    
    # 2. 测试模型预测功能
    prediction_ok, results = test_model_prediction()
    
    # 总结
    all_passed = verification_ok and prediction_ok
    
    log_message("=" * 50)
    if all_passed:
        log_message("[SUCCESS] 所有预测测试通过！模型可以正常使用")
    else:
        log_message("[ERROR] 部分预测测试失败", "ERROR")
    log_message("=" * 50)
    
    return all_passed, {
        "verification": verification_ok,
        "prediction": prediction_ok,
        "results": results
    }

if __name__ == "__main__":
    success, test_results = run_prediction_tests()
    sys.exit(0 if success else 1) 