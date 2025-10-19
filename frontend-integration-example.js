// Next.js 前端集成示例
// 替换原来的本地预测函数调用

// API配置
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_PREDICTION_API_URL || 'https://your-aliyun-server.com',
  apiKey: process.env.NEXT_PUBLIC_API_KEY || '', // 如果需要认证
  timeout: 300000, // 5分钟超时
};

// API错误处理类
class PredictionAPIError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'PredictionAPIError';
    this.code = code;
    this.details = details;
  }
}

// API客户端类
class PredictionAPIClient {
  constructor(config = API_CONFIG) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
  }

  // 创建请求头
  getHeaders(includeAuth = false) {
    const headers = {
      'Accept': 'application/json',
    };
    
    if (includeAuth && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      method: 'GET',
      headers: this.getHeaders(options.auth !== false),
      signal: AbortSignal.timeout(this.timeout),
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new PredictionAPIError(
          errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData?.code || `HTTP_${response.status}`,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new PredictionAPIError('请求超时，预测可能需要较长时间', 'TIMEOUT');
      }
      
      if (error instanceof PredictionAPIError) {
        throw error;
      }

      throw new PredictionAPIError(
        `网络错误: ${error.message}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  // 健康检查
  async healthCheck() {
    return await this.request('/health', { auth: false });
  }

  // 获取支持的专业列表
  async getSupportedMajors() {
    const response = await this.request('/api/majors', { auth: false });
    return response.data;
  }

  // 单专业预测
  async predictStudents(scoresFile, major, config = {}) {
    const formData = new FormData();
    formData.append('scores_file', scoresFile);
    formData.append('major', major);
    
    if (Object.keys(config).length > 0) {
      formData.append('config', JSON.stringify(config));
    }

    return await this.request('/api/predict', {
      method: 'POST',
      body: formData,
      headers: this.getHeaders(true), // 不包含Content-Type，让浏览器自动设置
    });
  }

  // 批量预测
  async batchPredict(scoresFile, majors = [], config = {}) {
    const formData = new FormData();
    formData.append('scores_file', scoresFile);
    formData.append('majors', JSON.stringify(majors));
    
    if (Object.keys(config).length > 0) {
      formData.append('config', JSON.stringify(config));
    }

    return await this.request('/api/predict/batch', {
      method: 'POST',
      body: formData,
      headers: this.getHeaders(true),
    });
  }
}

// 创建全局API客户端实例
const predictionAPI = new PredictionAPIClient();

// React Hook 示例
import { useState, useCallback } from 'react';

export const usePredictionAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 健康检查
  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await predictionAPI.healthCheck();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取支持的专业
  const getSupportedMajors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await predictionAPI.getSupportedMajors();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 预测学生
  const predictStudents = useCallback(async (scoresFile, major, config = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // 文件类型验证
      if (!scoresFile || !scoresFile.name.match(/\.(xlsx|xls)$/i)) {
        throw new Error('请上传有效的Excel文件(.xlsx或.xls格式)');
      }

      // 文件大小验证 (50MB)
      if (scoresFile.size > 50 * 1024 * 1024) {
        throw new Error('文件大小不能超过50MB');
      }

      const result = await predictionAPI.predictStudents(scoresFile, major, config);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 批量预测
  const batchPredict = useCallback(async (scoresFile, majors = [], config = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!scoresFile || !scoresFile.name.match(/\.(xlsx|xls)$/i)) {
        throw new Error('请上传有效的Excel文件(.xlsx或.xls格式)');
      }

      if (scoresFile.size > 50 * 1024 * 1024) {
        throw new Error('文件大小不能超过50MB');
      }

      const result = await predictionAPI.batchPredict(scoresFile, majors, config);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    checkHealth,
    getSupportedMajors,
    predictStudents,
    batchPredict,
  };
};

// React 组件使用示例
export const PredictionComponent = () => {
  const { 
    loading, 
    error, 
    getSupportedMajors, 
    predictStudents 
  } = usePredictionAPI();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMajor, setSelectedMajor] = useState('');
  const [supportedMajors, setSupportedMajors] = useState([]);
  const [predictionResult, setPredictionResult] = useState(null);

  // 获取支持的专业列表
  useEffect(() => {
    const loadMajors = async () => {
      try {
        const majors = await getSupportedMajors();
        setSupportedMajors(majors.majors || []);
      } catch (error) {
        console.error('获取专业列表失败:', error);
      }
    };
    loadMajors();
  }, [getSupportedMajors]);

  // 处理文件上传
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 处理预测提交
  const handlePredict = async () => {
    if (!selectedFile || !selectedMajor) {
      alert('请选择文件和专业');
      return;
    }

    try {
      const result = await predictStudents(selectedFile, selectedMajor, {
        min_grade: 60,
        max_grade: 90,
        with_uniform_inverse: 1
      });
      
      setPredictionResult(result.data);
      
      // 可选：下载结果文件
      if (result.data.results) {
        console.log('预测完成，结果:', result.data.results);
      }
    } catch (error) {
      console.error('预测失败:', error);
      alert(`预测失败: ${error.message}`);
    }
  };

  return (
    <div className="prediction-component">
      <h2>学生去向预测</h2>
      
      {error && (
        <div className="error-message">
          错误: {error.message}
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="file-input">选择成绩文件 (Excel格式):</label>
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="major-select">选择专业:</label>
        <select
          id="major-select"
          value={selectedMajor}
          onChange={(e) => setSelectedMajor(e.target.value)}
          disabled={loading}
        >
          <option value="">请选择专业</option>
          {supportedMajors.map((major) => (
            <option key={major} value={major}>
              {major}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handlePredict}
        disabled={loading || !selectedFile || !selectedMajor}
        className="predict-button"
      >
        {loading ? '预测中...' : '开始预测'}
      </button>

      {predictionResult && (
        <div className="prediction-result">
          <h3>预测结果</h3>
          <div className="result-summary">
            <p>处理任务ID: {predictionResult.task_id}</p>
            <p>专业: {predictionResult.major}</p>
            <p>统计信息:</p>
            <ul>
              <li>学生总数: {predictionResult.statistics?.total_students || 'N/A'}</li>
              <li>可达成保研(60分): {predictionResult.statistics?.grad_school_achievable_60 || 'N/A'}</li>
              <li>可达成出国(60分): {predictionResult.statistics?.abroad_achievable_60 || 'N/A'}</li>
            </ul>
          </div>
          
          {/* 结果表格展示 */}
          {predictionResult.results?.Predictions && (
            <div className="prediction-table">
              <h4>预测详情</h4>
              {/* 这里可以添加表格组件来展示详细结果 */}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 环境变量配置示例 (.env.local)
/*
NEXT_PUBLIC_PREDICTION_API_URL=https://your-aliyun-server.com
NEXT_PUBLIC_API_KEY=your-api-key-if-needed
*/

// TypeScript 类型定义示例
/*
interface PredictionConfig {
  min_grade?: number;
  max_grade?: number;
  with_uniform_inverse?: number;
}

interface PredictionResult {
  success: boolean;
  data: {
    task_id: string;
    major: string;
    results: Record<string, any[]>;
    statistics: {
      total_students: number;
      grad_school_achievable_60: number;
      abroad_achievable_60: number;
    };
    timestamp: string;
  };
}

interface PredictionAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
}
*/

export { predictionAPI, PredictionAPIClient, PredictionAPIError };
