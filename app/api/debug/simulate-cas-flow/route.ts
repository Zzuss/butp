import { NextRequest, NextResponse } from 'next/server';
import { getHashByStudentNumber, isValidStudentHashInDatabase } from '@/lib/student-data';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    console.log('=== 模拟CAS登录流程 ===');
    
    const { studentNumber = '2023213592' } = await request.json().catch(() => ({}));
    
    console.log('1. 模拟CAS认证成功，获取学号:', studentNumber);
    
    // 2. 获取哈希值（模拟CAS callback中的逻辑）
    console.log('2. 通过映射表获取哈希值...');
    const hashResult = await getHashByStudentNumber(studentNumber);
    console.log('哈希值获取结果:', hashResult);
    
    if (!hashResult.success || !hashResult.hash) {
      console.log('❌ 映射表查找失败');
      return NextResponse.json({
        success: false,
        step: 'mapping',
        error: hashResult.error,
        studentNumber
      });
    }
    
    // 3. 验证哈希值在数据库中是否存在
    console.log('3. 验证哈希值在数据库中是否存在...');
    const validationResult = await isValidStudentHashInDatabase(hashResult.hash);
    console.log('验证结果:', validationResult);
    
    if (!validationResult.isValid) {
      console.log('❌ 哈希值在数据库中不存在');
      return NextResponse.json({
        success: false,
        step: 'validation',
        error: '学号对应的哈希值在数据库中不存在',
        studentNumber,
        hash: hashResult.hash,
        validationDetails: validationResult
      });
    }
    
    // 4. 模拟session设置（和CAS callback一样的逻辑）
    console.log('4. 设置session...');
    
    const response = new NextResponse();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    const now = Date.now();
    session.userId = studentNumber; // 原始学号
    session.userHash = hashResult.hash; // 从映射表获取的哈希值
    session.name = `学生${studentNumber}`; // 模拟CAS返回的姓名
    session.isCasAuthenticated = true;
    session.isLoggedIn = true; // 直接设置为已登录
    session.loginTime = now;
    session.lastActiveTime = now;
    
    console.log('Session数据设置:', {
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isCasAuthenticated: session.isCasAuthenticated,
      isLoggedIn: session.isLoggedIn,
      loginTime: session.loginTime
    });
    
    await session.save();
    console.log('5. Session保存完成');
    
    // 6. 创建成功响应
    const successResponse = NextResponse.json({
      success: true,
      message: '模拟CAS登录流程成功',
      studentNumber,
      hash: hashResult.hash,
      validationResult,
      sessionSet: true
    });
    
    // 7. 复制session cookie
    const cookieHeaders = response.headers.getSetCookie();
    cookieHeaders.forEach(cookie => {
      successResponse.headers.append('set-cookie', cookie);
    });
    
    console.log('✅ 模拟登录流程完成');
    return successResponse;
    
  } catch (error) {
    console.error('模拟CAS流程时发生错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
