import axios from 'axios';
import * as xml2js from 'xml2js';

// 检测环境和认证模式
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// 在开发环境中，默认使用Mock CAS，除非明确指定使用真实CAS
const useMockCAS = isDevelopment && process.env.CAS_MODE !== 'real';
const useRealCAS = isProduction || process.env.CAS_MODE === 'real';

// CAS配置
export const CAS_CONFIG = {
  // 生产环境始终使用真实CAS服务器
  serverUrl: 'https://auth.bupt.edu.cn/authserver',
    
  // 回调URL配置 - 根据环境使用不同的回调地址
  serviceUrl: isProduction 
    ? 'http://10.3.58.3:8080/api/auth/cas/callback'  // 生产环境通过代理服务器回调
    : 'http://localhost:3000/api/auth/cas/callback',  // 开发环境直接回调
    
  // 网站URL - 生产环境使用 butp.tech
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://butp.tech',
  
  // 代理服务器URL
  proxyUrl: 'http://10.3.58.3:8080', // 根据部署脚本配置
  
  // 环境标识
  isDevelopment,
  isProduction,
  useMockCAS,
  useRealCAS,
};

// 构建CAS登录URL
export function buildCasLoginUrl(): string {
  const params = new URLSearchParams({
    service: CAS_CONFIG.serviceUrl,
  });
  
  return `${CAS_CONFIG.serverUrl}/login?${params.toString()}`;
}

// 构建CAS登出URL
export function buildCasLogoutUrl(): string {
  const params = new URLSearchParams({
    service: CAS_CONFIG.siteUrl,
  });
  
  return `${CAS_CONFIG.serverUrl}/logout?${params.toString()}`;
}

// CAS用户信息接口
export interface CasUser {
  userId: string;  // 学号
  name: string;    // 姓名
}

// CAS session检查结果接口
export interface CasSessionStatus {
  isValid: boolean;
  user?: CasUser;
  error?: string;
}

// 检查CAS session是否仍然有效
export async function checkCasSessionStatus(): Promise<CasSessionStatus> {
  try {
    // 在生产环境中，通过尝试访问一个需要CAS认证的服务来检查session状态
    if (CAS_CONFIG.useRealCAS) {
      // 方法1: 尝试获取一个新的service ticket
      // 如果CAS session有效，这个请求会成功并返回ticket
      // 如果CAS session无效，会重定向到登录页面
      const serviceUrl = encodeURIComponent(CAS_CONFIG.serviceUrl);
      const checkUrl = `${CAS_CONFIG.serverUrl}/login?service=${serviceUrl}`;
      
      const response = await axios.get(checkUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'BUTP-CAS-Client/1.0',
        },
        maxRedirects: 0, // 不跟随重定向
        validateStatus: function (status) {
          return status < 500; // 接受所有小于500的状态码
        }
      });

      console.log('CAS session check response:', {
        status: response.status,
        url: response.config?.url,
        redirected: !!response.request?.responseURL
      });

      // 如果返回302重定向，检查重定向的目标
      if (response.status === 302) {
        const location = response.headers['location'] || '';
        console.log('CAS redirect location:', location);
        
        // 如果重定向到登录页面，说明session已过期
        if (location.includes('/login') || location.includes('authserver')) {
          return { 
            isValid: false, 
            error: 'CAS session expired - redirected to login page' 
          };
        }
        
        // 如果重定向回我们的服务，说明session有效
        if (location.includes(CAS_CONFIG.serviceUrl)) {
          return { isValid: true };
        }
      }

      // 如果返回200，检查响应内容
      if (response.status === 200) {
        const responseText = response.data;
        
        // 如果响应包含登录表单，说明需要重新登录
        if (typeof responseText === 'string' && 
            (responseText.includes('login-form') || 
             responseText.includes('username') || 
             responseText.includes('password') ||
             responseText.includes('登录'))) {
          return { 
            isValid: false, 
            error: 'CAS session expired - login form detected' 
          };
        }
        
        // 否则认为session有效
        return { isValid: true };
      }

      // 其他状态码，为安全起见认为无效
      return { 
        isValid: false, 
        error: `Unexpected CAS response status: ${response.status}` 
      };
    } else {
      // 开发环境或Mock模式，假设session始终有效
      return { isValid: true };
    }
  } catch (error) {
    console.error('checkCasSessionStatus: error checking CAS session:', error);
    
    if (axios.isAxiosError(error)) {
      // 如果是302重定向错误，说明需要重新登录
      if (error.response?.status === 302) {
        const location = error.response.headers['location'] || '';
        console.log('CAS redirect on error:', location);
        
        if (location.includes('/login') || location.includes('authserver')) {
          return { 
            isValid: false, 
            error: 'CAS session expired - redirected to login on error' 
          };
        }
      }
      
      // 网络错误或超时，可能是临时问题，不强制登出
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        console.log('CAS check network error, assuming session valid for now');
        return { isValid: true }; // 网络问题时不强制登出
      }
    }
    
    // 其他错误情况，为了安全起见认为session无效
    return { 
      isValid: false, 
      error: `CAS session check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// 验证CAS ticket
export async function validateCasTicket(ticket: string, username?: string | null): Promise<CasUser | null> {
  try {
    console.log('validateCasTicket: starting validation', { 
      ticket, 
      username, 
      useMockCAS: CAS_CONFIG.useMockCAS,
      serverUrl: CAS_CONFIG.serverUrl,
      serviceUrl: CAS_CONFIG.serviceUrl,
      environment: process.env.NODE_ENV
    });
    
    const validateUrl = `${CAS_CONFIG.serverUrl}/serviceValidate`;
    const params = new URLSearchParams({
      service: CAS_CONFIG.serviceUrl,
      ticket: ticket,
    });

    // Mock模式下，传递username参数给Mock服务
    if (CAS_CONFIG.useMockCAS && username) {
      params.set('username', username);
    }

    const finalUrl = `${validateUrl}?${params.toString()}`;
    console.log('validateCasTicket: requesting URL:', finalUrl);

    const response = await axios.get(finalUrl, {
      timeout: 15000, // 增加超时时间到15秒
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'BUTP-CAS-Client/1.0',
      },
      // 添加更详细的错误处理
      validateStatus: function (status) {
        return status < 500; // 接受所有小于500的状态码
      }
    });

    console.log('validateCasTicket: received response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });

    // 检查HTTP状态码
    if (response.status !== 200) {
      console.error('validateCasTicket: HTTP error:', response.status, response.statusText);
      return null;
    }

    // 解析XML响应
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    
    console.log('validateCasTicket: parsed XML result:', JSON.stringify(result, null, 2));

    // 检查认证是否成功
    if (result['cas:serviceResponse'] && result['cas:serviceResponse']['cas:authenticationSuccess']) {
      const authSuccess = result['cas:serviceResponse']['cas:authenticationSuccess'];
      const user = authSuccess['cas:user'];
      const attributes = authSuccess['cas:attributes'];

      const casUser = {
        userId: user || attributes?.userId || attributes?.username || attributes?.['cas:userId'] || attributes?.['cas:username'] || '',
        name: attributes?.['cas:name'] || attributes?.['cas:displayName'] || attributes?.['cas:cn'] || attributes?.name || attributes?.displayName || attributes?.cn || '',
      };
      
      console.log('validateCasTicket: authentication success, returning user:', casUser);
      return casUser;
    }

    // 检查认证失败信息
    if (result['cas:serviceResponse'] && result['cas:serviceResponse']['cas:authenticationFailure']) {
      const failure = result['cas:serviceResponse']['cas:authenticationFailure'];
      const failureCode = failure['$'] ? failure['$']['code'] : 'unknown';
      const failureMessage = failure['_'] || failure || 'Unknown failure';
      
      console.error('validateCasTicket: CAS authentication failure:', {
        code: failureCode,
        message: failureMessage,
        rawFailure: failure
      });
      
      return null;
    }

    // 认证失败 - 未知格式
    console.error('validateCasTicket: unexpected response format:', result);
    return null;

  } catch (error: any) {
    console.error('Error validating CAS ticket:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      ticket: ticket,
      serviceUrl: CAS_CONFIG.serviceUrl
    });
    
    // 如果是网络错误，提供更详细的信息
    if (error?.code === 'ECONNREFUSED') {
      console.error('validateCasTicket: Connection refused - CAS server may be unreachable');
    } else if (error?.code === 'ETIMEDOUT') {
      console.error('validateCasTicket: Request timeout - CAS server response too slow');
    }
    
    return null;
  }
} 