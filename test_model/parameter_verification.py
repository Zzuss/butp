import os
import json
import sys
import numpy as np
from pathlib import Path
from datetime import datetime

def log_message(message, level="INFO"):
    """简单的日志输出，兼容Windows"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def verify_model_parameters():
    """验证模型参数是否正确加载"""
    log_message("开始验证模型参数...")
    
    try:
        import joblib
        import xgboost as xgb
        
        model_dir = Path("../public/algorithms")
        
        # 1. 加载最佳参数文件
        log_message("加载最佳参数文件...")
        with open(model_dir / "xgb_best_params.json", 'r', encoding='utf-8') as f:
            best_params = json.load(f)
        log_message(f"最佳参数: {best_params}")
        
        # 2. 加载模型
        log_message("加载模型...")
        model = joblib.load(model_dir / "xgb_model.pkl")
        
        # 3. 获取模型当前参数
        log_message("获取模型当前参数...")
        current_params = model.get_params()
        
        # 4. 对比参数
        log_message("对比参数...")
        verification_results = {}
        
        for param_name, expected_value in best_params.items():
            if param_name in current_params:
                actual_value = current_params[param_name]
                is_match = actual_value == expected_value
                verification_results[param_name] = {
                    "expected": expected_value,
                    "actual": actual_value,
                    "match": is_match
                }
                
                if is_match:
                    log_message(f"[OK] {param_name}: {expected_value}")
                else:
                    log_message(f"[ERROR] {param_name}: 期望={expected_value}, 实际={actual_value}", "ERROR")
            else:
                log_message(f"[ERROR] 参数 {param_name} 不存在于模型中", "ERROR")
                verification_results[param_name] = {
                    "expected": expected_value,
                    "actual": "NOT_FOUND",
                    "match": False
                }
        
        # 5. 检查模型是否被训练过
        log_message("检查模型训练状态...")
        if hasattr(model, 'n_estimators'):
            n_estimators = model.n_estimators
            log_message(f"模型树的数量: {n_estimators}")
            if n_estimators > 0:
                log_message("[OK] 模型已训练")
            else:
                log_message("[ERROR] 模型未训练", "ERROR")
        else:
            log_message("[WARNING] 无法检查模型训练状态", "WARNING")
        
        # 6. 检查模型文件大小（简单验证）
        model_file = model_dir / "xgb_model.pkl"
        file_size = model_file.stat().st_size
        log_message(f"模型文件大小: {file_size} bytes")
        if file_size > 100000:  # 大于100KB
            log_message("[OK] 模型文件大小合理")
        else:
            log_message("[WARNING] 模型文件可能过小", "WARNING")
        
        # 7. 测试预测一致性
        log_message("测试预测一致性...")
        test_features = np.array([85.5, 88.0, 92.3, 87.8, 89.2, 86.7, 90.1, 84.9, 88.5]).reshape(1, -1)
        
        # 加载scaler
        scaler = joblib.load(model_dir / "scaler.pkl")
        scaled_features = scaler.transform(test_features)
        
        # 多次预测，检查结果一致性
        predictions = []
        for i in range(5):
            pred = model.predict_proba(scaled_features)
            predictions.append(pred[0].tolist())
            log_message(f"预测 {i+1}: {pred[0]}")
        
        # 检查预测结果是否一致
        first_pred = predictions[0]
        all_consistent = all(pred == first_pred for pred in predictions)
        if all_consistent:
            log_message("[OK] 预测结果一致")
        else:
            log_message("[ERROR] 预测结果不一致", "ERROR")
        
        # 8. 创建默认模型进行对比
        log_message("创建默认模型进行对比...")
        default_model = xgb.XGBClassifier()
        default_model.fit(scaled_features, [0])  # 简单训练
        
        # 对比默认模型和加载模型的参数
        default_params = default_model.get_params()
        log_message("对比默认模型参数...")
        
        param_comparison = {}
        for param_name in best_params.keys():
            if param_name in default_params:
                default_value = default_params[param_name]
                loaded_value = current_params[param_name]
                is_different = default_value != loaded_value
                
                param_comparison[param_name] = {
                    "default": default_value,
                    "loaded": loaded_value,
                    "is_different": is_different
                }
                
                if is_different:
                    log_message(f"[OK] {param_name}: 默认={default_value}, 加载={loaded_value} (不同)")
                else:
                    log_message(f"[WARNING] {param_name}: 默认={default_value}, 加载={loaded_value} (相同)", "WARNING")
        
        # 保存验证结果
        verification_summary = {
            "timestamp": datetime.now().isoformat(),
            "best_params": best_params,
            "current_params": current_params,
            "parameter_verification": verification_results,
            "model_info": {
                "n_estimators": getattr(model, 'n_estimators', 'UNKNOWN'),
                "file_size": file_size,
                "model_type": str(type(model))
            },
            "prediction_consistency": {
                "consistent": all_consistent,
                "predictions": predictions
            },
            "default_comparison": param_comparison
        }
        
        with open("logs/parameter_verification.json", 'w', encoding='utf-8') as f:
            json.dump(verification_summary, f, indent=2, ensure_ascii=False)
        
        log_message("参数验证结果已保存到 logs/parameter_verification.json")
        
        # 总结
        all_params_match = all(result["match"] for result in verification_results.values())
        if all_params_match:
            log_message("[SUCCESS] 所有参数都匹配最佳参数！")
        else:
            log_message("[ERROR] 部分参数不匹配", "ERROR")
        
        return all_params_match, verification_summary
        
    except Exception as e:
        log_message(f"[ERROR] 参数验证失败: {e}", "ERROR")
        return False, None

def run_parameter_verification():
    """运行参数验证"""
    log_message("=" * 50)
    log_message("开始模型参数验证")
    log_message("=" * 50)
    
    # 创建日志目录
    os.makedirs("logs", exist_ok=True)
    
    success, results = verify_model_parameters()
    
    log_message("=" * 50)
    if success:
        log_message("[SUCCESS] 参数验证通过！使用的是正确的模型参数")
    else:
        log_message("[ERROR] 参数验证失败，可能使用了默认参数", "ERROR")
    log_message("=" * 50)
    
    return success, results

if __name__ == "__main__":
    success, results = run_parameter_verification()
    sys.exit(0 if success else 1) 