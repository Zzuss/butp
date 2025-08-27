import json
import traceback
from pathlib import Path
from http.server import BaseHTTPRequestHandler

_MODEL = None
_SCALER = None
_LABEL_ENCODER = None
_FEATURE_COLUMNS = None


def _model_dir() -> Path:
    # 相对函数文件定位到随部署打包的模型目录
    return (Path(__file__).parent / '..' / 'public' / 'algorithms' / 'Task3_XGBoost_Model').resolve()


def _lazy_load():
    global _MODEL, _SCALER, _LABEL_ENCODER, _FEATURE_COLUMNS
    if _MODEL is not None:
        return
    import pickle
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
    import numpy as np

    _lazy_load()
    features = []
    for col in _FEATURE_COLUMNS:
        if col not in feature_values:
            raise ValueError(f'Missing feature: {col}')
        features.append(feature_values[col])

    X = np.array(features).reshape(1, -1)
    X_scaled = _SCALER.transform(X)
    probabilities = _MODEL.predict_proba(X_scaled)[0]
    predicted_class = _MODEL.predict(X_scaled)[0]
    predicted_class_decoded = _LABEL_ENCODER.inverse_transform([predicted_class])[0]
    return {
        'probabilities': [float(x) for x in probabilities.tolist()],
        'predictedClass': int(predicted_class_decoded),
        'featureValues': feature_values,
    }


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._send(200, {'ok': True})

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length) if length > 0 else b'{}'
            data = json.loads(raw.decode('utf-8') or '{}')
            fv = data.get('featureValues')
            if not isinstance(fv, dict):
                self._send(400, {'error': 'featureValues is required'})
                return
            result = _predict(fv)
            self._send(200, result)
        except Exception as e:
            self._send(500, { 'error': str(e), 'trace': traceback.format_exc(limit=3) })


