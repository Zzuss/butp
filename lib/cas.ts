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