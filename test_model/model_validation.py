import os
import json
import logging
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/model_validation.log'),
        logging.StreamHandler()
    ]
)

class ModelValidator:
    def __init__(self, model_dir="../public/algorithms"):
        self.model_dir = Path(model_dir)
        self.logger = logging.getLogger(__name__)
        
    def validate_model_files(self):
        """验证模型文件完整性"""
        self.logger.info("开始验证模型文件...")
        
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
            file_path = self.model_dir / file_name
            if file_path.exists():
                size = file_path.stat().st_size
                file_info[file_name] = {
                    "exists": True,
                    "size": size,
                    "path": str(file_path)
                }
                self.logger.info(f"✓ {file_name} 存在，大小: {size} bytes")
            else:
                missing_files.append(file_name)
                file_info[file_name] = {
                    "exists": False,
                    "size": 0,
                    "path": str(file_path)
                }
                self.logger.error(f"✗ {file_name} 不存在")
        
        if missing_files:
            self.logger.error(f"缺少文件: {missing_files}")
            return False, file_info
        
        self.logger.info("所有模型文件验证通过")
        return True, file_info
    
    def validate_feature_columns(self):
        """验证特征列配置"""
        self.logger.info("开始验证特征列...")
        
        try:
            feature_file = self.model_dir / "feature_columns.json"
            with open(feature_file, 'r', encoding='utf-8') as f:
                feature_columns = json.load(f)
            
            expected_features = [
                "public", "political", "english", "math_science", 
                "basic_subject", "basic_major", "major", "practice", "innovation"
            ]
            
            if feature_columns == expected_features:
                self.logger.info("✓ 特征列匹配正确")
                return True, feature_columns
            else:
                self.logger.error(f"✗ 特征列不匹配")
                self.logger.error(f"期望: {expected_features}")
                self.logger.error(f"实际: {feature_columns}")
                return False, feature_columns
                
        except Exception as e:
            self.logger.error(f"读取特征列文件失败: {e}")
            return False, None
    
    def validate_model_parameters(self):
        """验证模型参数"""
        self.logger.info("开始验证模型参数...")
        
        try:
            params_file = self.model_dir / "xgb_best_params.json"
            with open(params_file, 'r', encoding='utf-8') as f:
                params = json.load(f)
            
            expected_params = {
                "colsample_bytree", "learning_rate", "max_depth",
                "min_child_weight", "n_estimators", "reg_alpha", "reg_lambda", "subsample"
            }
            
            actual_params = set(params.keys())
            
            if actual_params == expected_params:
                self.logger.info("✓ 模型参数验证通过")
                self.logger.info(f"参数: {params}")
                return True, params
            else:
                self.logger.error(f"✗ 模型参数不匹配")
                self.logger.error(f"期望: {expected_params}")
                self.logger.error(f"实际: {actual_params}")
                return False, params
                
        except Exception as e:
            self.logger.error(f"读取模型参数失败: {e}")
            return False, None
    
    def validate_test_data(self, test_data):
        """验证测试数据格式"""
        self.logger.info("开始验证测试数据...")
        
        try:
            expected_features = [
                "public", "political", "english", "math_science", 
                "basic_subject", "basic_major", "major", "practice", "innovation"
            ]
            
            for test_case in test_data["test_cases"]:
                case_features = set(test_case["features"].keys())
                if case_features != set(expected_features):
                    self.logger.error(f"✗ 测试用例 '{test_case['name']}' 特征不匹配")
                    return False
                
                # 验证数值范围
                for feature, value in test_case["features"].items():
                    if not (0 <= value <= 100):
                        self.logger.error(f"✗ 特征 {feature} 值超出范围: {value}")
                        return False
            
            self.logger.info("✓ 测试数据验证通过")
            return True
            
        except Exception as e:
            self.logger.error(f"验证测试数据失败: {e}")
            return False
    
    def run_full_validation(self):
        """运行完整验证"""
        self.logger.info("=" * 50)
        self.logger.info("开始模型完整验证")
        self.logger.info("=" * 50)
        
        # 创建日志目录
        os.makedirs("logs", exist_ok=True)
        
        results = {}
        
        # 1. 验证模型文件
        files_ok, file_info = self.validate_model_files()
        results["files"] = {"status": files_ok, "info": file_info}
        
        # 2. 验证特征列
        features_ok, feature_columns = self.validate_feature_columns()
        results["features"] = {"status": features_ok, "columns": feature_columns}
        
        # 3. 验证模型参数
        params_ok, model_params = self.validate_model_parameters()
        results["parameters"] = {"status": params_ok, "params": model_params}
        
        # 4. 验证测试数据
        test_data_ok = self.validate_test_data(self.load_test_data())
        results["test_data"] = {"status": test_data_ok}
        
        # 总结
        all_passed = all([
            files_ok, features_ok, params_ok, test_data_ok
        ])
        
        self.logger.info("=" * 50)
        if all_passed:
            self.logger.info("✓ 所有验证通过！模型环境准备就绪")
        else:
            self.logger.error("✗ 部分验证失败，请检查上述错误")
        self.logger.info("=" * 50)
        
        return all_passed, results
    
    def load_test_data(self):
        """加载测试数据"""
        try:
            with open("test_data.json", 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"加载测试数据失败: {e}")
            return {"test_cases": []}

if __name__ == "__main__":
    validator = ModelValidator()
    success, results = validator.run_full_validation()
    
    # 保存验证结果
    with open("logs/validation_results.json", 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "success": success,
            "results": results
        }, f, indent=2, ensure_ascii=False) 