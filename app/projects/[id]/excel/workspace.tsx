'use client';

import { useMemo, useState } from 'react';

type ImportState = '未上传' | '文件已选择' | '解析中' | '预览完成' | '存在阻断错误' | '解析失败';

type Issue = {
  level: 'error' | 'warning' | 'info';
  code: string;
  sheetName: string;
  rowNumber?: number | null;
  columnName?: string;
  field?: string;
  rawValue?: string;
  reason: string;
  suggestion: string;
};

type SheetResult = {
  name: string;
  expected: boolean;
  status: 'parsed' | 'missing' | 'extra';
  rowCount: number;
  columnCount: number;
  issueCount: number;
};

type PreviewResult = {
  importId: string;
  template: {
    templateCode: string;
    templateVersion: string;
    subjectVersion: string;
    sheetCount: number;
  };
  project: {
    projectId: string;
    versionId: string;
    projectName: string;
    versionName: string;
  };
  summary: {
    totalSheets: number;
    parsedSheets: number;
    skippedSheets: number;
    totalRows: number;
    validRows: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  sheets: SheetResult[];
  issues: Issue[];
  parsedDataPreview: Record<string, string[][]>;
};

type Props = {
  projectId: string;
  versionId: string;
  projectName: string;
  versionName: string;
  versionStatus: string;
};

const tabStyle = (active: boolean) => ({
  minHeight: 38,
  padding: '0 16px',
  borderRadius: 10,
  border: `1px solid ${active ? '#0f4c5c' : 'var(--border)'}`,
  background: active ? '#0f4c5c' : '#fff',
  color: active ? '#fff' : 'var(--text)',
  fontWeight: 800,
  cursor: 'pointer'
});

function fmtBytes(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${size} B`;
}

function levelText(level: Issue['level']) {
  if (level === 'error') return '阻断问题';
  if (level === 'warning') return '警告';
  return '提示';
}

function levelColor(level: Issue['level']) {
  if (level === 'error') return { color: '#c92a2a', bg: '#fff5f5', border: '#ffc9c9' };
  if (level === 'warning') return { color: '#e67700', bg: '#fff9db', border: '#ffe066' };
  return { color: '#0b7285', bg: '#e7f5ff', border: '#a5d8ff' };
}

function statusColor(status: ImportState) {
  if (status === '存在阻断错误' || status === '解析失败') return '#c92a2a';
  if (status === '解析中') return '#0b7285';
  if (status === '预览完成') return '#2b8a3e';
  return '#667085';
}

function sheetStatusText(status: SheetResult['status']) {
  if (status === 'missing') return '缺失';
  if (status === 'extra') return '非标准';
  return '已解析';
}

export function ExcelWorkspace({ projectId, versionId, projectName, versionName, versionStatus }: Props) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [selectedAt, setSelectedAt] = useState('');
  const [state, setState] = useState<ImportState>('未上传');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [message, setMessage] = useState('');

  const templateHref = '/api/excel/template?templateVersion=V60';
  const exportHref = `/api/projects/${projectId}/versions/${versionId}/excel/export?exportType=full&templateVersion=V60`;
  const previewUrl = `/api/projects/${projectId}/versions/${versionId}/excel/import/preview`;
  const previewSheetNames = useMemo(() => Object.keys(preview?.parsedDataPreview || {}).slice(0, 6), [preview]);

  async function runPreview() {
    if (!file) {
      setMessage('请先选择一个 .xlsx 文件。');
      setState('未上传');
      return;
    }

    setState('解析中');
    setMessage('');
    setPreview(null);

    const form = new FormData();
    form.append('file', file);
    form.append('templateVersion', 'V60');

    try {
      const response = await fetch(previewUrl, { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setState('解析失败');
        setMessage(json.error?.message || 'Excel 解析失败。');
        return;
      }
      setPreview(json.data);
      setState(json.data.summary.errorCount > 0 ? '存在阻断错误' : '预览完成');
    } catch (error) {
      setState('解析失败');
      setMessage(error instanceof Error ? error.message : 'Excel 解析失败。');
    }
  }

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setMessage('');
    if (!nextFile) {
      setSelectedAt('');
      setState('未上传');
      return;
    }
    setSelectedAt(new Date().toLocaleString('zh-CN'));
    setState('文件已选择');
  }

  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={tabStyle(activeTab === 'import')} onClick={() => setActiveTab('import')}>Excel 导入</button>
            <button type="button" style={tabStyle(activeTab === 'export')} onClick={() => setActiveTab('export')}>Excel 导出</button>
          </div>
          <div style={{ color: '#667085', fontSize: 13 }}>
            {projectName}｜{versionName}｜{versionStatus}
          </div>
        </div>
      </section>

      {activeTab === 'import' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ marginBottom: 6 }}>导入预览</h2>
                <p className="meta" style={{ marginBottom: 0 }}>本批只做上传解析与预览，不做确认导入落库。</p>
              </div>
              <a className="btn" href={templateHref}>下载标准模板</a>
            </div>

            <div style={{ marginTop: 16, border: '1px dashed #b8c4d4', borderRadius: 12, background: '#f8fafc', padding: 16 }}>
              <input
                type="file"
                accept=".xlsx"
                onChange={(event) => selectFile(event.target.files?.[0] || null)}
                style={{ background: '#fff' }}
              />
              <div className="meta" style={{ marginTop: 8 }}>仅允许 .xlsx 文件，服务端会再次校验文件类型、大小和内容格式。</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 14 }}>
              <div className="stat"><div className="stat-label">导入状态</div><div className="stat-value" style={{ color: statusColor(state) }}>{state}</div></div>
              <div className="stat"><div className="stat-label">文件名</div><div className="stat-value">{file?.name || '-'}</div></div>
              <div className="stat"><div className="stat-label">文件大小</div><div className="stat-value">{file ? fmtBytes(file.size) : '-'}</div></div>
              <div className="stat"><div className="stat-label">上传时间</div><div className="stat-value">{selectedAt || '-'}</div></div>
            </div>

            <div className="actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={runPreview} disabled={!file || state === '解析中'}>
                {state === '解析中' ? '解析中...' : '开始解析预览'}
              </button>
              <button type="button" className="btn" disabled>确认导入暂未开放，本批仅支持预览</button>
            </div>

            {message ? <div style={{ marginTop: 14, border: '1px solid #ffc9c9', background: '#fff5f5', color: '#c92a2a', borderRadius: 10, padding: 12 }}>{message}</div> : null}
          </section>

          {preview ? (
            <>
              <section className="card">
                <h2>导入预览汇总</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
                  {[
                    ['工作表总数', preview.summary.totalSheets],
                    ['已解析 Sheet', preview.summary.parsedSheets],
                    ['跳过 Sheet', preview.summary.skippedSheets],
                    ['总行数', preview.summary.totalRows],
                    ['有效行估算', preview.summary.validRows],
                    ['阻断问题', preview.summary.errorCount],
                    ['警告', preview.summary.warningCount],
                    ['提示', preview.summary.infoCount]
                  ].map(([label, value]) => <div className="stat" key={String(label)}><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>)}
                </div>
              </section>

              <section className="card">
                <h2>Sheet 解析结果</h2>
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
                    <thead><tr>{['Sheet 名称', '标准 Sheet', '状态', '行数', '列数', '问题数'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
                    <tbody>
                      {preview.sheets.map((sheet) => (
                        <tr key={`${sheet.name}-${sheet.status}`}>
                          <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{sheet.name}</td>
                          <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{sheet.expected ? '是' : '否'}</td>
                          <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{sheetStatusText(sheet.status)}</td>
                          <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{sheet.rowCount}</td>
                          <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{sheet.columnCount}</td>
                          <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{sheet.issueCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <h2>问题清单</h2>
                {preview.issues.length ? (
                  <div style={{ overflowX: 'auto', marginTop: 12 }}>
                    <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse' }}>
                      <thead><tr>{['级别', 'Sheet 名称', '行号', '列名', '字段', '原始值', '原因', '建议'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead>
                      <tbody>
                        {preview.issues.map((issue, index) => {
                          const tone = levelColor(issue.level);
                          return (
                            <tr key={`${issue.code}-${issue.sheetName}-${index}`}>
                              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><span style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 999, padding: '3px 8px', fontWeight: 900, whiteSpace: 'nowrap' }}>{levelText(issue.level)}</span></td>
                              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{issue.sheetName || '-'}</td>
                              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{issue.rowNumber || '-'}</td>
                              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{issue.columnName || '-'}</td>
                              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{issue.field || '-'}</td>
                              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{issue.rawValue || '-'}</td>
                              <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{issue.reason}</td>
                              <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{issue.suggestion}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="meta" style={{ marginTop: 10 }}>暂无 error / warning / info 问题。</p>}
              </section>

              <section className="card">
                <h2>预览数据</h2>
                <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                  {previewSheetNames.map((sheetName) => (
                    <div key={sheetName} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '10px 12px', fontWeight: 900 }}>{sheetName}</div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 13 }}>
                          <tbody>
                            {(preview.parsedDataPreview[sheetName] || []).map((row, rowIndex) => (
                              <tr key={`${sheetName}-${rowIndex}`}>
                                {row.map((cell, cellIndex) => <td key={`${sheetName}-${rowIndex}-${cellIndex}`} style={{ padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6' }}>{cell || '-'}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <h2>Excel 导出</h2>
            <p className="meta">本批只支持标准 V60 空白模板下载，以及当前项目版本完整 Excel 导出。老板汇报版、合作方精简版和 PDF 导出暂不开放。</p>
            <div className="actions">
              <a className="btn" href={templateHref}>下载标准空白模板</a>
              <a className="btn btn-primary" href={exportHref}>导出当前项目版本完整 Excel</a>
            </div>
          </section>

          <section className="card">
            <h2>导出说明</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <div><b>文件名：</b><span className="meta">{projectName}_{versionName}_目标成本测算_YYYYMMDD.xlsx</span></div>
              <div><b>模板版本：</b><span className="meta">LQDC_TargetCost_Template_V60.xlsx，包含 13 个标准 Sheet。</span></div>
              <div><b>数据范围：</b><span className="meta">可读取的项目概况、版本、收入、成本、税费和成本词典会写入对应 Sheet；暂无数据的 Sheet 保留标准空结构。</span></div>
              <div><b>当前限制：</b><span className="meta">不做老板汇报版、合作方精简版、PDF 导出，不生成错误清单 Excel。</span></div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
