import os
import json
import sys
from pathlib import Path
from datetime import datetime

def log_message(message, level="INFO"):
    """简单的日志输出，兼容Windows"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def validate_model_files(model_dir="../public/algorithms"):
    """验证模型文件完整性"""
    log_message("开始验证模型文件...")
    
    required_files = [
        "xgb_model.json",
        "xgb_model.pkl", 
        "feature_columns.json",
        "label_encoder.pkl",
        "scaler.pkl",
        "xgb_best_params.json"
    ]
    
    missing_files = []
    file_info = {}
    
    for file_name in required_files:
        file_path = Path(model_dir) / file_name
        if file_path.exists():
            size = file_path.stat().st_size
            file_info[file_name] = {
                "exists": True,
                "size": size,
                "path": str(file_path)
            }
            log_message(f"[OK] {file_name} 存在，大小: {size} bytes")
        else:
            missing_files.append(file_name)
            file_info[file_name] = {
                "exists": False,
                "size": 0,
                "path": str(file_path)
            }
            log_message(f"[ERROR] {file_name} 不存在", "ERROR")
    
    if missing_files:
        log_message(f"缺少文件: {missing_files}", "ERROR")
        return False, file_info
    
    log_message("所有模型文件验证通过")
    return True, file_info

def validate_feature_columns(model_dir="../public/algorithms"):
    """验证特征列配置"""
    log_message("开始验证特征列...")
    
    try:
        feature_file = Path(model_dir) / "feature_columns.json"
        with open(feature_file, 'r', encoding='utf-8') as f:
            feature_columns = json.load(f)
        
        expected_features = [
            "public", "political", "english", "math_science", 
            "basic_subject", "basic_major", "major", "practice", "innovation"
        ]
        
        if feature_columns == expected_features:
            log_message("[OK] 特征列匹配正确")
            return True, feature_columns
        else:
            log_message("[ERROR] 特征列不匹配", "ERROR")
            log_message(f"期望: {expected_features}", "ERROR")
            log_message(f"实际: {feature_columns}", "ERROR")
            return False, feature_columns
            
    except Exception as e:
        log_message(f"读取特征列文件失败: {e}", "ERROR")
        return False, None

def validate_model_parameters(model_dir="../public/algorithms"):
    """验证模型参数"""
    log_message("开始验证模型参数...")
    
    try:
        params_file = Path(model_dir) / "xgb_best_params.json"
        with open(params_file, 'r', encoding='utf-8') as f:
            params = json.load(f)
        
        expected_params = {
            "colsample_bytree", "learning_rate", "max_depth",
            "min_child_weight", "n_estimators", "reg_alpha", "reg_lambda", "subsample"
        }
        
        actual_params = set(params.keys())
        
        if actual_params == expected_params:
            log_message("[OK] 模型参数验证通过")
            log_message(f"参数: {params}")
            return True, params
        else:
            log_message("[ERROR] 模型参数不匹配", "ERROR")
            log_message(f"期望: {expected_params}", "ERROR")
            log_message(f"实际: {actual_params}", "ERROR")
            return False, params
            
    except Exception as e:
        log_message(f"读取模型参数失败: {e}", "ERROR")
        return False, None

def validate_test_data():
    """验证测试数据格式"""
    log_message("开始验证测试数据...")
    
    try:
        with open("test_data.json", 'r', encoding='utf-8') as f:
            test_data = json.load(f)
        
        expected_features = [
            "public", "political", "english", "math_science", 
            "basic_subject", "basic_major", "major", "practice", "innovation"
        ]
        
        for test_case in test_data["test_cases"]:
            case_features = set(test_case["features"].keys())
            if case_features != set(expected_features):
                log_message(f"[ERROR] 测试用例 '{test_case['name']}' 特征不匹配", "ERROR")
                return False
            
            # 验证数值范围
            for feature, value in test_case["features"].items():
                if not (0 <= value <= 100):
                    log_message(f"[ERROR] 特征 {feature} 值超出范围: {value}", "ERROR")
                    return False
        
        log_message("[OK] 测试数据验证通过")
        return True
        
    except Exception as e:
        log_message(f"验证测试数据失败: {e}", "ERROR")
        return False

def test_model_loading():
    """测试模型加载功能"""
    log_message("开始测试模型加载...")
    
    try:
        # 尝试导入必要的库
        import pickle
        import joblib
        
        model_dir = Path("../public/algorithms")
        
        # 测试加载scaler
        scaler_path = model_dir / "scaler.pkl"
        if scaler_path.exists():
            scaler = joblib.load(scaler_path)
            log_message("[OK] Scaler加载成功")
        else:
            log_message("[ERROR] Scaler文件不存在", "ERROR")
            return False
        
        # 测试加载label_encoder
        encoder_path = model_dir / "label_encoder.pkl"
        if encoder_path.exists():
            encoder = joblib.load(encoder_path)
            log_message("[OK] Label Encoder加载成功")
        else:
            log_message("[ERROR] Label Encoder文件不存在", "ERROR")
            return False
        
        # 测试加载XGBoost模型
        model_path = model_dir / "xgb_model.pkl"
        if model_path.exists():
            model = joblib.load(model_path)
            log_message("[OK] XGBoost模型加载成功")
        else:
            log_message("[ERROR] XGBoost模型文件不存在", "ERROR")
            return False
        
        log_message("[OK] 所有模型组件加载成功")
        return True
        
    except ImportError as e:
        log_message(f"[ERROR] 缺少必要的库: {e}", "ERROR")
        log_message("请安装: pip install scikit-learn joblib xgboost", "ERROR")
        return False
    except Exception as e:
        log_message(f"[ERROR] 模型加载失败: {e}", "ERROR")
        return False

def run_full_validation():
    """运行完整验证"""
    log_message("=" * 50)
    log_message("开始模型完整验证")
    log_message("=" * 50)
    
    # 创建日志目录
    os.makedirs("logs", exist_ok=True)
    
    results = {}
    
    # 1. 验证模型文件
    files_ok, file_info = validate_model_files()
    results["files"] = {"status": files_ok, "info": file_info}
    
    # 2. 验证特征列
    features_ok, feature_columns = validate_feature_columns()
    results["features"] = {"status": features_ok, "columns": feature_columns}
    
    # 3. 验证模型参数
    params_ok, model_params = validate_model_parameters()
    results["parameters"] = {"status": params_ok, "params": model_params}
    
    # 4. 验证测试数据
    test_data_ok = validate_test_data()
    results["test_data"] = {"status": test_data_ok}
    
    # 5. 测试模型加载
    model_loading_ok = test_model_loading()
    results["model_loading"] = {"status": model_loading_ok}
    
    # 总结
    all_passed = all([
        files_ok, features_ok, params_ok, test_data_ok, model_loading_ok
    ])
    
    log_message("=" * 50)
    if all_passed:
        log_message("[SUCCESS] 所有验证通过！模型环境准备就绪")
    else:
        log_message("[ERROR] 部分验证失败，请检查上述错误", "ERROR")
    log_message("=" * 50)
    
    # 保存验证结果
    try:
        with open("logs/validation_results.json", 'w', encoding='utf-8') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "success": all_passed,
                "results": results
            }, f, indent=2, ensure_ascii=False)
        log_message("验证结果已保存到 logs/validation_results.json")
    except Exception as e:
        log_message(f"保存验证结果失败: {e}", "ERROR")
    
    return all_passed, results

if __name__ == "__main__":
    success, results = run_full_validation()
    sys.exit(0 if success else 1) 