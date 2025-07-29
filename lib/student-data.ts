/**
 * 动态验证学号哈希值（从数据库中查询）
 * @param hash 学号哈希值
 * @returns 是否有效
 */
export async function isValidStudentHash(hash: string): Promise<boolean> {
  try {
    const response = await fetch('/api/verify-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentHash: hash })
    });

    return response.ok;
  } catch (error) {
    console.error('Error verifying student hash:', error);
    return false;
  }
}

/**
 * 动态获取学号哈希值对应的学生信息
 * @param hash 学号哈希值
 * @returns 学生信息对象
 */
export async function getStudentInfoByHash(hash: string): Promise<{ id: string; name: string; class: string }> {
  try {
    const response = await fetch('/api/verify-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentHash: hash })
    });
  
    if (response.ok) {
      const data = await response.json();
      return data.studentInfo;
    } else {
      throw new Error('Failed to get student info');
    }
  } catch (error) {
    console.error('Error getting student info:', error);
    // 返回默认信息
  return {
    id: hash,
    name: `学生 ${hash.substring(0, 6)}`,
    class: "未知专业"
  };
  }
}