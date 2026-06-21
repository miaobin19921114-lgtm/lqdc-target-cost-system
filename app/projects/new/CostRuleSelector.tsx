'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseTemplateAllocationRules } from '@/lib/template-allocation-rules';

type CostRule = { id: string; costCode?: string | null; category?: string | null; subjectName: string; measureBasis?: string | null; unit?: string | null; defaultTaxRate: number; allocationMethod?: string | null; remark?: string | null; sortOrder: number };
type Template = { id: string; name: string; costRules: CostRule[] };

const allocationOptions = ['按建筑面积占比', '按可售面积占比', '按销售收入占比', '按受益对象/成本归属组', '直接归属业态', '不参与分摊'];
const selectedIdsOf = (template?: Template) => (template?.costRules || []).map((item) => item.id);
const text = (value?: string | null) => value || '继承模板';

export default function CostRuleSelector({ templates }: { templates: Template[] }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedIdsOf(templates[0]));
  const current = templates.find((item) => item.id === templateId) || templates[0];
  const categories = useMemo(() => Array.from(new Set((current?.costRules || []).map((item) => item.category || '未分类'))), [current]);

  useEffect(() => { setSelectedIds(selectedIdsOf(current)); }, [current?.id]);
  const toggle = (id: string, checked: boolean) => setSelectedIds((prev) => checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id));

  return <div style={{ display: 'grid', gap: 12 }}>
    <input type="hidden" name="costRuleTemplateId" value={current?.id || ''} />
    {selectedIds.map((id) => <input key={id} type="hidden" name="costRuleIds" value={id} />)}
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <div><b>已选系统模板规则：{selectedIds.length} 条</b><p className="meta" style={{ margin: '4px 0 0' }}>引用模板中心的科目、税率和三套分摊规则；项目里只临时调整经营口径。</p></div>
      <div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn" onClick={() => setSelectedIds(selectedIdsOf(current))}>全选</button><button type="button" className="btn" onClick={() => setSelectedIds([])}>清空</button></div>
    </div>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>规则模板<select value={templateId} onChange={(event) => setTemplateId(event.target.value)} style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {categories.map((category) => {
      const rows = (current?.costRules || []).filter((item) => (item.category || '未分类') === category).sort((a, b) => a.sortOrder - b.sortOrder);
      return <div key={category} style={{ border: '1px solid #d9e2ec', borderRadius: 12, overflow: 'hidden' }}><div style={{ background: '#f8fafc', padding: '10px 12px', fontWeight: 900 }}>{category}</div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1260, fontSize: 13 }}><thead><tr>{['启用', '编码', '科目', '测算依据', '单位', '税率', '经营规则', '土增税规则', '所得税规则'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #eef2f6', color: '#667085' }}>{head}</th>)}</tr></thead><tbody>{rows.map((rule) => { const parsed = parseTemplateAllocationRules(rule.allocationMethod, rule.remark); return <tr key={rule.id}><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><input type="checkbox" checked={selectedIds.includes(rule.id)} onChange={(event) => toggle(rule.id, event.target.checked)} /></td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{rule.costCode || '-'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{rule.subjectName}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{rule.measureBasis || '-'}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{rule.unit || '-'}</td><td style={{ padding: 5, borderBottom: '1px solid #eef2f6' }}><input name={`costRuleTaxRate-${rule.id}`} type="number" step="0.0001" defaultValue={Number(rule.defaultTaxRate || 0)} style={{ width: 90, height: 32 }} /></td><td style={{ padding: 5, borderBottom: '1px solid #eef2f6' }}><select name={`costRuleAllocationMethod-${rule.id}`} defaultValue={parsed.operatingAllocationMethod || '按建筑面积占比'} style={{ minWidth: 160, height: 32 }}>{allocationOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{text(parsed.landVatAllocationMethod)}</td><td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{text(parsed.incomeTaxAllocationMethod)}</td></tr>; })}</tbody></table></div></div>;
    })}
  </div>;
}
