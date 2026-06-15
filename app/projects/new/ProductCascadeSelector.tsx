'use client';

import { useMemo, useState } from 'react';

type Product = {
  id: string;
  name: string;
  category: string;
  isSaleable: boolean;
  participateAllocation: boolean;
};

type Template = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  products: Product[];
};

export default function ProductCascadeSelector({ templates }: { templates: Template[] }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const current = templates.find((item) => item.id === templateId) || templates[0];
  const categories = useMemo(() => Array.from(new Set((current?.products || []).map((item) => item.category))), [current]);
  const activeCategory = category || categories[0] || '';
  const rows = (current?.products || []).filter((item) => item.category === activeCategory && item.name.includes(keyword.trim()));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="templateId" value={current?.id || ''} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>模板
          <select value={templateId} onChange={(event) => { setTemplateId(event.target.value); setCategory(''); setKeyword(''); }} style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>
            {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="meta" style={{ paddingTop: 26 }}>{current?.description || '选择模板后，再按分类勾选具体业态。'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>一级分类
          <select value={activeCategory} onChange={(event) => setCategory(event.target.value)} style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>搜索二级业态
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入业态名称筛选" style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }} />
        </label>
      </div>

      <div style={{ border: '1px solid #d9e2ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: '#f0fbfc', padding: '10px 12px', fontWeight: 900, color: '#0f4c5c' }}>{activeCategory || '未选择分类'} <span className="meta">（{rows.length} 个）</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, padding: 12 }}>
          {rows.map((item) => <label key={item.id} style={{ display: 'flex', gap: 8, border: '1px solid #eef2f6', borderRadius: 10, padding: 10, background: '#fff' }}><input name="templateProductIds" type="checkbox" value={item.id} defaultChecked={item.isSaleable || item.participateAllocation} /><span><b>{item.name}</b><div className="meta">{item.isSaleable ? '可售' : '不可售'} · {item.participateAllocation ? '参与分摊' : '不参与分摊'}</div></span></label>)}
          {rows.length === 0 ? <p className="meta">当前分类下没有匹配业态。</p> : null}
        </div>
      </div>

      <div style={{ border: '1px dashed #b6c7d6', borderRadius: 12, padding: 12, background: '#fcfdff' }}>
        <b>当前分类下新增自定义业态</b>
        <p className="meta" style={{ marginTop: 4 }}>模板里没有的业态，可先加入本项目；后续再考虑保存到个人模板。</p>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 130px 130px', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>分类
            <select name="customCategory" defaultValue={activeCategory} style={{ height: 36, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>自定义业态名称<input name="customProductName" placeholder="如：叠墅、商业地下夹层" style={{ height: 36, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="customIsSaleable" type="checkbox" />可售</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}><input name="customParticipateAllocation" type="checkbox" defaultChecked />参与分摊</label>
        </div>
      </div>
    </div>
  );
}
