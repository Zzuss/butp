#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
XGBoost 推理脚本（Task3）
- 从 butp/public/algorithms/Task3_XGBoost_Model 加载模型与预处理器
- 从 stdin 读取 JSON：{"featureValues": {<name>: <number>, ...}}
- 按 feature_columns.json 的顺序取值与标准化
- 输出 JSON：{"probabilities": [p0, p1, p2], "classes": [..]}

说明：
- 概率为 0-1 小数，和为 1；前端再转百分比与格式化
"""

import sys
import json
import pickle
from pathlib import Path
import numpy as np

_MODEL = None
_SCALER = None
_LABEL_ENCODER = None
_FEATURE_COLUMNS = None


def _model_dir() -> Path:
    return (Path(__file__).parent.parent / 'public' / 'algorithms' / 'Task3_XGBoost_Model').resolve()


def _lazy_load():
    global _MODEL, _SCALER, _LABEL_ENCODER, _FEATURE_COLUMNS
    if _MODEL is not None:
        return
    md = _model_dir()
    with open(md / 'xgb_model.pkl', 'rb') as f:
        _MODEL = pickle.load(f)
    with open(md / 'scaler.pkl', 'rb') as f:
        _SCALER = pickle.load(f)
    with open(md / 'label_encoder.pkl', 'rb') as f:
        _LABEL_ENCODER = pickle.load(f)
    with open(md / 'feature_columns.json', 'r', encoding='utf-8') as f:
        _FEATURE_COLUMNS = json.load(f)


def _predict(feature_values: dict) -> dict:
    _lazy_load()

    # 按列顺序取值并校验为数字
    features = []
    for col in _FEATURE_COLUMNS:
        if col not in feature_values:
            raise ValueError(f'Missing feature: {col}')
        value = feature_values[col]
        if not isinstance(value, (int, float)):
            raise ValueError(f'Invalid feature type for {col}, expected number')
        features.append(float(value))

    X = np.array(features, dtype=float).reshape(1, -1)
    X_scaled = _SCALER.transform(X)

    probabilities = _MODEL.predict_proba(X_scaled)[0]
    classes = getattr(_LABEL_ENCODER, 'classes_', [0, 1, 2])

    return {
        'probabilities': [float(p) for p in probabilities.tolist()],
        'classes': [int(c) for c in list(classes)],
    }


def main():
    try:
        raw = sys.stdin.read() or '{}'
        data = json.loads(raw)
        fv = data.get('featureValues')
        if not isinstance(fv, dict):
            print(json.dumps({'error': 'featureValues is required as object'}), end='')
            return

        result = _predict(fv)
        print(json.dumps(result, ensure_ascii=False), end='')
    except Exception as e:
        print(json.dumps({'error': str(e)}), end='')


if __name__ == '__main__':
    main()


