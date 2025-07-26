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
    
  // 回调URL配置 - 始终通过代理服务器回调
  serviceUrl: 'http://10.3.58.3:8080/api/auth/cas/callback',
    
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
      serverUrl: CAS_CONFIG.serverUrl 
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
      timeout: 10000,
      headers: {
        'Accept': 'application/xml',
      },
    });

    console.log('validateCasTicket: received response:', {
      status: response.status,
      data: response.data
    });

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

    // 认证失败
    console.error('validateCasTicket: authentication failed, result:', result);
    return null;

  } catch (error) {
    console.error('Error validating CAS ticket:', error);
    return null;
  }
} 