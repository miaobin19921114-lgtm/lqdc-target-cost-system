import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const allocationOptions = [
  '',
  '按可售面积占比',
  '按建筑面积占比',
  '按计容面积占比',
  '按销售收入占比',
  '按受益对象/成本归属组',
  '直接归属业态',
  '按地下车位面积/数量',
  '按景观面积',
  '按硬景面积',
  '按软景面积',
  '按周界长度',
  '按出入口数量',
  '按资金占用比例',
  '不参与分摊/单独列示'
];

function fmt(value: unknown) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function percent(value: unknown) {
  return Number(value || 0) * 100;
}

function codeSortKey(code?: string | null) {
  const parts = String(code || '').split(/[.。\-_/]/).filter(Boolean);
  return parts.length ? parts.map((part) => Number(part.replace(/[^0-9]/g, '')) || 9999) : [9999];
}

function compareCode(a?: string | null, b?: string | null) {
  const aa = codeSortKey(a);
  const bb = codeSortKey(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (aa[i] ?? -1) - (bb[i] ?? -1);
    if (diff) return diff;
  }
  return String(a || '').localeCompare(String(b || ''), 'zh-CN', { numeric: true });
}

function codeLevel(code?: string | null) {
  return String(code || '').split(/[.。\-_/]/).filter(Boolean).length || 1;
}

function precisionAdvice(rule: { costCode?: string | null; subjectName: string; category?: string | null }) {
  const text = `${rule.category || ''}${rule.subjectName || ''}`;
  if (String(rule.costCode || '').startsWith('01') || text.includes('土地')) return '土地类：建议四级/末级';
  if (text.includes('地下') || text.includes('车位') || text.includes('人防')) return '地下/车位/人防：建议四级/末级';
  if (text.includes('景观') || text.includes('管网') || text.includes('围墙') || text.includes('出入口')) return '室外配套：建议三级/四级';
  if (text.includes('销售') || text.includes('管理') || text.includes('财务')) return '间接费：二级/三级默认';
  return codeLevel(rule.costCode) >= 3 ? '主要配置层' : '大类默认规则';
}

function StatusMessage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  if (searchParams?.personalTemplate) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>已复制为你的个人模板，后续科目/税率/分摊规则修改只保存到个人模板。</div>;
  if (searchParams?.costRuleSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>科目规则已保存。</div>;
  if (searchParams?.costRuleUpdated) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>模板规则已更新。</div>;
  if (searchParams?.costRuleDeleted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>科目规则已删除。</div>;
  if (searchParams?.taxRuleSaved) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>税率规则已保存。</div>;
  if (searchParams?.taxRuleUpdated) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>税率规则已更新。</div>;
  if (searchParams?.taxRuleDeleted) return <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb' }}>税率规则已删除。</div>;
  return null;
}

export default async function TemplateRulesPage({ params, searchParams }: { params: { id: string }, searchParams?: Record<string, string | undefined> }) {
  const userId = cookies().get('lqdc_session')?.value || '';
  const template = await prisma.template.findFirst({
    where: userId ? { id: params.id, OR: [{ ownerId: userId }, { ownerId: null }] } : { id: params.id, ownerId: null },
    include: { costRules: { orderBy: { sortOrder: 'asc' } }, taxRules: { orderBy: { sortOrder: 'asc' } }, products: true }
  });

  if (!template) return <main className="page">模板不存在或无权限</main>;
  const canEdit = !!userId && template.ownerId === userId;
  const sortedCostRules = [...template.costRules].sort((a, b) => compareCode(a.costCode, b.costCode) || a.sortOrder - b.sortOrder);
  const allocationRuleCount = sortedCostRules.filter((item) => item.allocationMethod).length;

  return <main className="page"><div className="container" style={{ maxWidth: 1500 }}>
    <div className="page-header"><div><p className="eyebrow">导入与配置 / 模板中心</p><h1 className="title">系统模板规则：{template.name}</h1><p className="subtitle">这里维护系统/个人模板的标准规则。项目只引用这些规则，具体结果分别在目标成本、土增税、所得税和业态利润页面体现。</p></div><div className="actions" style={{ marginTop: 0 }}><Link href="/templates" className="btn">模板中心</Link><Link href="/projects/new" className="btn btn-primary">用模板新建项目</Link></div></div>
    <StatusMessage searchParams={searchParams} />
    {!canEdit ? <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}><b>系统模板只读</b><p className="meta" style={{ margin: '6px 0' }}>系统默认模板只能查看。需要修改分摊规则、科目规则或税费参数时，先复制为个人模板。</p>{userId ? <form action="/api/templates/products" method="post"><input type="hidden" name="action" value="copy" /><input type="hidden" name="templateId" value={template.id} /><button className="btn btn-primary">复制为我的模板后编辑</button></form> : null}</section> : null}
    <div className="summary-strip" style={{ marginBottom: 14 }}><div className="stat"><div className="stat-label">业态模板</div><div className="stat-value">{template.products.length}</div></div><div className="stat"><div className="stat-label">成本科目规则</div><div className="stat-value">{sortedCostRules.length}</div></div><div className="stat"><div className="stat-label">已配置分摊规则</div><div className="stat-value">{allocationRuleCount}</div></div><div className="stat"><div className="stat-label">税费参数</div><div className="stat-value">{template.taxRules.length}</div></div></div>

    <section className="card" style={{ marginBottom: 16, borderColor: '#c5eef3', background: '#f8fbff' }}><h2>分摊规则模板</h2><p className="meta">规则精度按地产习惯处理：一级汇总、二级默认、三级为主，土地/地下室/车位/人防/景观/管网/围墙出入口等关键科目做到四级或末级。项目特殊情况以后只做项目覆盖，不改系统模板。</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['编码', '科目', '精度建议', '测算依据', '单位', '默认税率%', '默认分摊规则', '操作'].map((head) => <th key={head} style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{sortedCostRules.map((rule) => <tr key={`allocation-${rule.id}`}><td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{rule.costCode || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{rule.subjectName}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{precisionAdvice(rule)}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.measureBasis || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.unit || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{fmt(percent(rule.defaultTaxRate))}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)', minWidth: 190 }}>{canEdit ? <form id={`alloc-${rule.id}`} action="/api/templates/cost-rules" method="post"><input type="hidden" name="action" value="update" /><input type="hidden" name="ruleId" value={rule.id} /><input type="hidden" name="costCode" value={rule.costCode || ''} /><input type="hidden" name="category" value={rule.category || ''} /><input type="hidden" name="subjectName" value={rule.subjectName} /><input type="hidden" name="sourceTable" value={rule.sourceTable || ''} /><input type="hidden" name="measureBasis" value={rule.measureBasis || ''} /><input type="hidden" name="unit" value={rule.unit || ''} /><input type="hidden" name="defaultTaxRate" value={String(Number(rule.defaultTaxRate || 0.09))} /><input type="hidden" name="sortOrder" value={String(rule.sortOrder)} /><input type="hidden" name="remark" value={rule.remark || ''} /><select name="allocationMethod" defaultValue={rule.allocationMethod || ''} style={{ width: '100%', height: 30 }}>{allocationOptions.map((option) => <option key={option || 'inherit'} value={option}>{option || '继承上级/系统默认'}</option>)}</select></form> : (rule.allocationMethod || '继承上级/系统默认')}</td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}>{canEdit ? <button form={`alloc-${rule.id}`} className="btn" style={{ padding: '5px 8px' }}>保存</button> : '只读'}</td></tr>)}</tbody></table></div></section>

    <section className="card" style={{ marginBottom: 16 }}><h2>成本科目规则</h2><p className="meta">维护科目编码、测算依据、单位、默认税率和通用分摊方式。后续新建项目会复制你的个人模板规则。</p>{canEdit ? <form action="/api/templates/cost-rules" method="post" style={{ display: 'grid', gridTemplateColumns: '110px 120px 1fr 180px 1fr 90px 100px 180px 80px', gap: 8, alignItems: 'end', marginBottom: 12 }}><input type="hidden" name="action" value="create" /><input type="hidden" name="templateId" value={template.id} /><label>编码<input name="costCode" style={{ width: '100%', height: 34 }} /></label><label>分类<input name="category" style={{ width: '100%', height: 34 }} /></label><label>科目名称<input name="subjectName" required style={{ width: '100%', height: 34 }} /></label><label>来源表<input name="sourceTable" style={{ width: '100%', height: 34 }} /></label><label>测算依据<input name="measureBasis" style={{ width: '100%', height: 34 }} /></label><label>单位<input name="unit" style={{ width: '100%', height: 34 }} /></label><label>税率<input name="defaultTaxRate" defaultValue="9%" style={{ width: '100%', height: 34 }} /></label><label>分摊方式<input name="allocationMethod" style={{ width: '100%', height: 34 }} /></label><button className="btn btn-primary">新增</button></form> : null}<div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 1380, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['编码', '分类', '科目名称', '来源表', '测算依据', '单位', '税率%', '分摊方式', '排序', '操作'].map((head) => <th key={head} style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{sortedCostRules.map((rule) => canEdit ? <tr key={rule.id}><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="costCode" defaultValue={rule.costCode || ''} style={{ width: 95, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="category" defaultValue={rule.category || ''} style={{ width: 105, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="subjectName" defaultValue={rule.subjectName} style={{ width: '100%', height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="sourceTable" defaultValue={rule.sourceTable || ''} style={{ width: 170, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="measureBasis" defaultValue={rule.measureBasis || ''} style={{ width: '100%', height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="unit" defaultValue={rule.unit || ''} style={{ width: 70, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="defaultTaxRate" defaultValue={fmt(percent(rule.defaultTaxRate))} style={{ width: 80, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="allocationMethod" defaultValue={rule.allocationMethod || ''} style={{ width: 160, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`cr-${rule.id}`} name="sortOrder" type="number" defaultValue={rule.sortOrder} style={{ width: 70, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><form id={`cr-${rule.id}`} action="/api/templates/cost-rules" method="post"><input type="hidden" name="action" value="update" /><input type="hidden" name="ruleId" value={rule.id} /><button className="btn" style={{ padding: '5px 8px' }}>保存</button><button className="btn" name="action" value="delete" style={{ padding: '5px 8px', color: '#c92a2a', marginLeft: 6 }}>删除</button></form></td></tr> : <tr key={rule.id}><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.costCode || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.category || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{rule.subjectName}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.sourceTable || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.measureBasis || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.unit || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{fmt(percent(rule.defaultTaxRate))}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.allocationMethod || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.sortOrder}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>只读</td></tr>)}</tbody></table></div></section>

    <section className="card"><h2>税率规则</h2><p className="meta">维护增值税、附加税、所得税等默认税率。系统模板只读，个人模板可编辑。</p>{canEdit ? <form action="/api/templates/tax-rules" method="post" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 180px 90px 1fr 80px', gap: 8, alignItems: 'end', marginBottom: 12 }}><input type="hidden" name="action" value="create" /><input type="hidden" name="templateId" value={template.id} /><label>税率名称<input name="name" required style={{ width: '100%', height: 34 }} /></label><label>税率<input name="rate" defaultValue="9%" style={{ width: '100%', height: 34 }} /></label><label>适用范围<input name="scope" style={{ width: '100%', height: 34 }} /></label><label>排序<input name="sortOrder" type="number" defaultValue="0" style={{ width: '100%', height: 34 }} /></label><label>备注<input name="remark" style={{ width: '100%', height: 34 }} /></label><button className="btn btn-primary">新增</button></form> : null}<div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{['税率名称', '税率%', '适用范围', '排序', '备注', '操作'].map((head) => <th key={head} style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{template.taxRules.map((rule) => canEdit ? <tr key={rule.id}><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`tr-${rule.id}`} name="name" defaultValue={rule.name} style={{ width: '100%', height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`tr-${rule.id}`} name="rate" defaultValue={fmt(percent(rule.rate))} style={{ width: 90, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`tr-${rule.id}`} name="scope" defaultValue={rule.scope || ''} style={{ width: 170, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`tr-${rule.id}`} name="sortOrder" type="number" defaultValue={rule.sortOrder} style={{ width: 70, height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><input form={`tr-${rule.id}`} name="remark" defaultValue={rule.remark || ''} style={{ width: '100%', height: 30 }} /></td><td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}><form id={`tr-${rule.id}`} action="/api/templates/tax-rules" method="post"><input type="hidden" name="action" value="update" /><input type="hidden" name="ruleId" value={rule.id} /><button className="btn" style={{ padding: '5px 8px' }}>保存</button><button className="btn" name="action" value="delete" style={{ padding: '5px 8px', color: '#c92a2a', marginLeft: 6 }}>删除</button></form></td></tr> : <tr key={rule.id}><td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{rule.name}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{fmt(percent(rule.rate))}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.scope || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.sortOrder}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{rule.remark || '-'}</td><td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>只读</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
