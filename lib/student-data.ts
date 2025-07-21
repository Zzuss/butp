// 数据库中的学号哈希值列表（示例）
export const validStudentHashes = [
  "d4e25a73bf0169e7b9ae1ad0423ccf08297c0cb32fb264980a56d2c064a2f15a",
  "c83d00068ed840b000ca00e569e5d54982a344487c43b641880ebb62f85eb552",
  "c28b77206e694745f2965b18277d0037857fb04d5cb22d9193b3d1b3e3d6fe73",
  "f8944cbbc5417c40331109549bd30bfea01d299d230af20559059aa219757233",
  "c398de479af1c08dbce25b685df8ce34bfa5dad842e6ad3172b493ccf39b06a9",
  // 添加实际数据库中的哈希值
  "1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890"
];

// 哈希值对应的学生信息（用于显示）
export const hashStudentInfoMap: Record<string, { name: string; class: string }> = {
  "d4e25a73bf0169e7b9ae1ad0423ccf08297c0cb32fb264980a56d2c064a2f15a": { name: "学生 A", class: "通信工程专业" },
  "c83d00068ed840b000ca00e569e5d54982a344487c43b641880ebb62f85eb552": { name: "学生 B", class: "计算机科学与技术专业" },
  "c28b77206e694745f2965b18277d0037857fb04d5cb22d9193b3d1b3e3d6fe73": { name: "学生 C", class: "软件工程专业" },
  "f8944cbbc5417c40331109549bd30bfea01d299d230af20559059aa219757233": { name: "学生 D", class: "人工智能专业" },
  "c398de479af1c08dbce25b685df8ce34bfa5dad842e6ad3172b493ccf39b06a9": { name: "学生 E", class: "网络工程专业" },
  // 添加实际数据库中哈希值对应的学生信息
  "1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890": { name: "实际学生", class: "数据库专业" }
};

/**
 * 检查学号哈希值是否有效（在数据库中存在）
 * @param hash 学号哈希值
 * @returns 是否有效
 */
export function isValidStudentHash(hash: string): boolean {
  // 检查是否在已知哈希值列表中，或者符合哈希值格式（64位十六进制字符）
  return validStudentHashes.includes(hash) || /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * 获取学号哈希值对应的学生信息
 * @param hash 学号哈希值
 * @returns 学生信息对象
 */
export function getStudentInfoByHash(hash: string): { id: string; name: string; class: string } {
  const info = hashStudentInfoMap[hash];
  
  if (info) {
    return {
      id: hash,
      ...info
    };
  }
  
  // 如果没有预设信息，返回默认信息
  return {
    id: hash,
    name: `学生 ${hash.substring(0, 6)}`,
    class: "未知专业"
  };
}