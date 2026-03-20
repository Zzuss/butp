"use client";

import { useRef, useState, type ChangeEvent } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, CheckCircle, XCircle, Download } from "lucide-react";

type MajorCode = "tewm" | "iot" | "eie" | "ist";

interface ImportResponse {
  success: boolean;
  tableName?: string;
  importedRows?: number;
  message?: string;
  error?: string;
  details?: string[];
}

const MAJOR_OPTIONS: Array<{ value: MajorCode; label: string }> = [
  { value: "tewm", label: "tewm" },
  { value: "iot", label: "iot" },
  { value: "eie", label: "eie" },
  { value: "ist", label: "ist" },
];

export default function DomesticBonusUpdatePage() {
  const [selectedMajor, setSelectedMajor] = useState<MajorCode>("tewm");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
  };

  const onSubmit = async () => {
    if (!selectedFile) {
      // 使用弹窗做强提示，避免用户忽略页面内状态信息
      alert("请先选择文件");
      setResult({
        success: false,
        error: "请先选择要导入的 Excel 文件",
      });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("major", selectedMajor);

      const response = await fetch("/api/admin/domestic-bonus-update/import", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ImportResponse;
      if (!response.ok || !data.success) {
        setResult({
          success: false,
          error: data.error || "导入失败",
          details: data.details,
        });
        return;
      }

      setResult({
        success: true,
        tableName: data.tableName,
        importedRows: data.importedRows,
        message: data.message || "导入成功",
      });

      // 导入成功后清空文件选择，避免误重复提交
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "导入失败",
      });
    } finally {
      setUploading(false);
    }
  };

  const onDownload = async () => {
    setDownloading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/domestic-bonus-update/export?major=${selectedMajor}`, {
        method: "GET",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setResult({
          success: false,
          error: body?.error || "下载失败",
        });
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const matched = disposition.match(/filename="?([^"]+)"?/i);
      const encodedName = matched?.[1] || `${selectedMajor}_domestic_bonus.xlsx`;
      const fileName = decodeURIComponent(encodedName);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setResult({
        success: true,
        message: `下载成功：${fileName}`,
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "下载失败",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">国内加分导入管理</h1>
          <p className="text-muted-foreground mt-2">按专业将国内加分 Excel 覆盖导入到对应数据表。</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>导入配置</CardTitle>
            <CardDescription>
              请先选择专业，再上传 Excel 文件。导入会覆盖该专业对应表中的原有数据。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="major-select">选择专业（与表名前缀一致）</Label>
              <select
                id="major-select"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedMajor}
                onChange={(e) => setSelectedMajor(e.target.value as MajorCode)}
                disabled={uploading}
              >
                {MAJOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonus-file">选择 Excel 文件</Label>
              <Input
                id="bonus-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileChange}
                disabled={uploading}
                className="cursor-pointer hover:bg-muted/50 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 file:transition-colors hover:file:bg-slate-200"
              />
            </div>

            <Button
              variant="outline"
              onClick={onDownload}
              disabled={uploading || downloading}
              className="w-full flex items-center gap-2"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "下载中..." : "下载当前专业数据"}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={uploading || !selectedFile}
              className="w-full flex items-center gap-2 transition-colors hover:bg-black/80"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "导入中..." : "开始覆盖导入"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>格式要求（请严格遵守）</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>1) 首先选择专业。 </p>
            <p>2) 文件必须是单 sheet 的 Excel（.xlsx/.xls）。</p>
            <p>3) 列名必须包含且仅用于导入以下字段：</p>
            <p className="font-medium text-foreground">year, subclass, subclass_number, average_bonus, total_number（获加分的总人数）</p>
            <p>4) 导入策略为覆盖：会先清空目标专业表，再写入新数据。</p>
            <p>5) 目标表名规则：专业代码 + `_domestic_bonus`（如 tewm_domestic_bonus）。</p>
          </CardContent>
        </Card>

        {result && (
          <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {result.success ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            <AlertDescription>
              {result.success ? (
                <div className="text-green-700">
                  <p className="font-medium">{result.message}</p>
                  <p className="text-sm mt-1">
                    目标表：{result.tableName}，导入记录数：{result.importedRows}
                  </p>
                </div>
              ) : (
                <div className="text-red-700">
                  <p className="font-medium">{result.error || "导入失败"}</p>
                  {result.details && result.details.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-sm space-y-1">
                      {result.details.slice(0, 8).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AdminLayout>
  );
}

