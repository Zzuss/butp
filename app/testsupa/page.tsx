"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"

// 硬编码 Supabase 配置（参考 butp/lib/supabase.ts 第4、5行）
const SUPABASE_URL = "http://39.96.196.67:8000"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYxMDYyNDAwLCJleHAiOjE5MTg4Mjg4MDB9.FZnKH6Hf88vK-jh3gqpEjs2ULYHD8jVntoJ1Rw8J3H8"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

type RowData = Record<string, unknown>

export default function TestSupaPage() {
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // 轮询间隔（毫秒）
  const POLL_INTERVAL = 5000

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 通过 RPC header 禁用缓存
      const noCacheHeaders = new Headers({
        "cache-control": "no-cache, no-store, must-revalidate",
        pragma: "no-cache",
        expires: "0",
      })

      const { data, error } = await supabase
        .from("Cohort2024_Predictions_iot")
        .select("*")
        .limit(50)
        .abortSignal(new AbortController().signal)

      if (error) throw error
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message || "获取数据失败")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 首次加载
    fetchData()
    // 定时轮询
    const timer = setInterval(fetchData, POLL_INTERVAL)
    // 避免路由缓存（对 Next.js App Router 的客户端渲染场景通常已足够）
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        // 尝试清理页面相关缓存（忽略失败）
        // @ts-ignore
        caches?.keys?.().then((keys: string[]) => {
          keys.forEach((k) => {
            // @ts-ignore
            caches.delete(k)
          })
        })
      } catch {}
    }
    return () => clearInterval(timer)
  }, [])

  const headers = useMemo(() => {
    if (!rows || rows.length === 0) return [] as string[]
    const first = rows[0]
    return Object.keys(first).slice(0, 10)
  }, [rows])

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>/testsupa 数据预览</h1>
      <div style={{ marginBottom: 8, color: "#555" }}>
        显示表 `Cohort2024_Predictions_iot` 的前10列、前50行（每{POLL_INTERVAL / 1000}s自动刷新）
      </div>

      {loading && (
        <div style={{ margin: "8px 0" }}>加载中...</div>
      )}
      {error && (
        <div style={{ margin: "8px 0", color: "#c00" }}>错误：{error}</div>
      )}

      <div style={{ overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#f9fafb",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {headers.map((h) => (
                  <td
                    key={h}
                    style={{
                      padding: "8px 10px",
                      borderBottom: "1px solid #f1f5f9",
                      maxWidth: 280,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
                      fontSize: 13,
                    }}
                    title={String(row[h] ?? "")}
                  >
                    {String(row[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={headers.length || 1} style={{ padding: 12, color: "#666" }}>
                  无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


