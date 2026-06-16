'use client';

import { useEffect, useMemo, useState } from 'react';

type CostRule = {
  id: string;
  costCode?: string | null;
  category?: string | null;
  subjectName: string;
  sourceTable?: string | null;
  measureBasis?: string | null;
  unit?: string | null;
  defaultTaxRate: number;
  allocationMethod?: string | null;
  sortOrder: number;
};

type Template = {
  id: string;
  name: string;
  costRules: CostRule[];
};

const allocationOptions = ['建筑面积分摊', '可售面积分摊', '直接归属', '不分摊', '按受益对象分摊'];

function defaultSelectedIds(template?: Template) {
  return (template?.costRules || []).map((item) => item.id);
}

export default function CostRuleSelector({ templates }: { templates: Template[] }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds(templates[0]));
  const current = templates.find((item) => item.id === templateId) || templates[0];
  const categories = useMemo(() => Array.from(new Set((current?.costRules || []).map((item) => item.category || '未分类'))), [current]);

  useEffect(() => {
    setSelectedIds(defaultSelectedIds(current));
  }, [current?.id]);

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id));
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? defaultSelectedIds(current) : []);
  }

  return <div style={{ display: 'grid', gap: 12 }}>
    <input type="hidden" name="costRuleTemplateId" value={current?.id || ''} />
    {selectedIds.map((id) => <input key={id} type="hidden" name="costRuleIds" value={id} />)}
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <div><b>已选科目规则：{selectedIds.length} 条</b><p className="meta" style={{ margin: '4px 0 0' }}>可勾选启用科目，并在创建项目前编辑默认税率和分摊方式。</p></div>
      <div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn" onClick={() => toggleAll(true)}>全选</button><button type="button" className="btn" onClick={() => toggleAll(false)}>清空</button></div>
    </div>

    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>科目规则模板
      <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>
        {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>

    {categories.map((category) => {
      const rows = (current?.costRules || []).filter((item) => (item.category || '未分类') === category).sort((a, b) => a.sortOrder - b.sortOrder);
      return <div key={category} style={{ border: '1px solid #d9e2ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', padding: '10px 12px', fontWeight: 900 }}>{category}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980, fontSize: 13 }}>
            <thead><tr>{['启用', '编码', '科目', '来源表', '测算依据', '单位', '税率', '分摊方式'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #eef2f6', color: '#667085' }}>{head}</th>)}</tr></thead>
            <tbody>{rows.map((rule) => <tr key={rule.id}>
              <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}><input type="checkbox" checked={selectedIds.includes(rule.id)} onChange={(event) => toggle(rule.id, event.target.checked)} /></td>
              <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{rule.costCode || '-'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #eef2f6', fontWeight: 800 }}>{rule.subjectName}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{rule.sourceTable || '-'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{rule.measureBasis || '-'}</td>
              <td style={{ padding: 9, borderBottom: '1px solid #eef2f6' }}>{rule.unit || '-'}</td>
              <td style={{ padding: 5, borderBottom: '1px solid #eef2f6' }}><input name={`costRuleTaxRate-${rule.id}`} type="number" step="0.0001" defaultValue={Number(rule.defaultTaxRate || 0)} style={{ width: 90, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '3px 6px' }} /></td>
              <td style={{ padding: 5, borderBottom: '1px solid #eef2f6' }}><select name={`costRuleAllocationMethod-${rule.id}`} defaultValue={rule.allocationMethod || '建筑面积分摊'} style={{ minWidth: 150, height: 32, border: '1px solid #d9e2ec', borderRadius: 6, padding: '3px 6px' }}>{allocationOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>;
    })}
  </div>;
}
