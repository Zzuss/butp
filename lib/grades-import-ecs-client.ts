export interface GradeImportFile {
  id: string
  name: string
  originalName?: string
  size: number
  uploadTime: string
  isDuplicate?: boolean
}

export interface GradeImportTaskFile {
  id: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  recordsCount: number
  importedCount: number
  errorMessage?: string
  processedAt?: string
}

export interface GradeImportTask {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalFiles: number
  processedFiles: number
  totalRecords: number
  importedRecords: number
  progress: number
  errorMessage?: string
  createdAt: string
  completedAt?: string
  files: GradeImportTaskFile[]
}

interface AccessToken {
  token: string
  expiresAt: number
}

const API_BASE = (process.env.NEXT_PUBLIC_GRADE_IMPORT_URL || 'https://import.butp.tech').replace(/\/$/, '')

let cachedToken: AccessToken | null = null

export async function getGradeImportToken(forceRefresh = false) {
  const now = Math.floor(Date.now() / 1000)
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now + 30) {
    return cachedToken.token
  }

  const response = await fetch('/api/admin/grades-import/token', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store'
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.token) {
    throw new Error(data.error || '无法获取导入授权')
  }

  cachedToken = data as AccessToken
  return cachedToken.token
}

async function authorizedFetch(path: string, init: RequestInit = {}) {
  let token = await getGradeImportToken()
  let response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  if (response.status === 401) {
    token = await getGradeImportToken(true)
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    })
  }

  return response
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || data.message || `请求失败 (${response.status})`)
  }
  return data as T
}

export async function listGradeImportFiles() {
  const response = await authorizedFetch('/api/uploads')
  const data = await parseResponse<{ files: GradeImportFile[] }>(response)
  return data.files || []
}

export async function deleteGradeImportFile(fileId: string) {
  const response = await authorizedFetch(`/api/uploads/${encodeURIComponent(fileId)}`, {
    method: 'DELETE'
  })
  await parseResponse(response)
}

export async function uploadGradeImportFile(file: File, onProgress?: (percent: number) => void) {
  const token = await getGradeImportToken()
  const formData = new FormData()
  formData.append('file', file)

  return new Promise<GradeImportFile>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${API_BASE}/api/uploads`)
    request.setRequestHeader('Authorization', `Bearer ${token}`)
    request.timeout = 10 * 60 * 1000

    request.upload.onprogress = event => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100))
      }
    }

    request.onerror = () => reject(new Error('无法连接成绩导入服务器'))
    request.ontimeout = () => reject(new Error('文件上传超时'))
    request.onload = () => {
      let data: { file?: GradeImportFile; error?: string } = {}
      try {
        data = JSON.parse(request.responseText || '{}')
      } catch {
        reject(new Error(`上传服务返回了无效响应 (${request.status})`))
        return
      }

      if (request.status < 200 || request.status >= 300 || !data.file) {
        reject(new Error(data.error || `上传失败 (${request.status})`))
        return
      }
      resolve(data.file)
    }

    request.send(formData)
  })
}

export async function startGradeImport(fileIds: string[]) {
  const response = await authorizedFetch('/api/imports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileIds })
  })
  return parseResponse<{ taskId: string; status: string }>(response)
}

export async function getGradeImportTask(taskId: string) {
  const response = await authorizedFetch(`/api/imports/${encodeURIComponent(taskId)}`)
  const data = await parseResponse<{ task: GradeImportTask }>(response)
  return data.task
}

export async function createGradeImportEventSource(taskId: string, forceRefresh = false) {
  const token = await getGradeImportToken(forceRefresh)
  return new EventSource(
    `${API_BASE}/api/imports/${encodeURIComponent(taskId)}/events?token=${encodeURIComponent(token)}`
  )
}
