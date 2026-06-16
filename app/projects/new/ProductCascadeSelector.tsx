'use client';

import { useEffect, useMemo, useState } from 'react';

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

function defaultSelectedIds(template?: Template) {
  return (template?.products || [])
    .filter((item) => item.isSaleable || item.participateAllocation)
    .map((item) => item.id);
}

export default function ProductCascadeSelector({ templates }: { templates: Template[] }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const current = templates.find((item) => item.id === templateId) || templates[0];
  const categories = useMemo(() => Array.from(new Set((current?.products || []).map((item) => item.category))), [current]);
  const activeCategory = category || categories[0] || '';
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds(current));

  useEffect(() => {
    setSelectedIds(defaultSelectedIds(current));
    setCategory('');
    setKeyword('');
  }, [current?.id]);

  const rows = (current?.products || []).filter((item) => item.category === activeCategory && item.name.includes(keyword.trim()));
  const selectedProducts = (current?.products || []).filter((item) => selectedIds.includes(item.id));
  const selectedByCategory = categories.map((item) => ({ category: item, count: selectedProducts.filter((product) => product.category === item).length }));

  function toggleProduct(id: string, checked: boolean) {
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id));
  }

  function toggleCategory(categoryName: string, checked: boolean) {
    const ids = (current?.products || []).filter((item) => item.category === categoryName).map((item) => item.id);
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((item) => !ids.includes(item)));
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="templateId" value={current?.id || ''} />
      {selectedIds.map((id) => <input key={id} type="hidden" name="templateProductIds" value={id} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>模板
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>
            {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="meta" style={{ paddingTop: 26 }}>{current?.description || '选择模板后，再按分类勾选具体业态。切换一级分类不会丢失已勾选业态。'}</div>
      </div>

      <div style={{ border: '1px solid #d9e2ec', borderRadius: 12, background: '#fff', padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><b>已选业态：{selectedIds.length} 个</b><p className="meta" style={{ margin: '4px 0 0' }}>可跨多个一级分类选择；创建项目时会一次性带入概况表。</p></div>
          <button type="button" className="btn" onClick={() => setSelectedIds([])}>清空选择</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {selectedByCategory.map((item) => <button key={item.category} type="button" onClick={() => setCategory(item.category)} style={{ border: activeCategory === item.category ? '1px solid #0b7285' : '1px solid #d9e2ec', background: activeCategory === item.category ? '#e9f7f8' : '#fff', borderRadius: 999, padding: '6px 10px', fontWeight: 800, color: '#0f4c5c' }}>{item.category}（{item.count}）</button>)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>当前查看分类
          <select value={activeCategory} onChange={(event) => setCategory(event.target.value)} style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>搜索二级业态
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入业态名称筛选" style={{ height: 38, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }} />
        </label>
      </div>

      <div style={{ border: '1px solid #d9e2ec', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: '#f0fbfc', padding: '10px 12px', fontWeight: 900, color: '#0f4c5c', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><span>{activeCategory || '未选择分类'} <span className="meta">（{rows.length} 个）</span></span><label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input type="checkbox" checked={rows.length > 0 && rows.every((item) => selectedIds.includes(item.id))} onChange={(event) => toggleCategory(activeCategory, event.target.checked)} />全选当前分类</label></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, padding: 12 }}>
          {rows.map((item) => <label key={item.id} style={{ display: 'flex', gap: 8, border: '1px solid #eef2f6', borderRadius: 10, padding: 10, background: selectedIds.includes(item.id) ? '#f0fbfc' : '#fff' }}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => toggleProduct(item.id, event.target.checked)} /><span><b>{item.name}</b><div className="meta">{item.isSaleable ? '可售' : '不可售'} · {item.participateAllocation ? '参与分摊' : '不参与分摊'}</div></span></label>)}
          {rows.length === 0 ? <p className="meta">当前分类下没有匹配业态。</p> : null}
        </div>
      </div>

      <div style={{ border: '1px dashed #b6c7d6', borderRadius: 12, padding: 12, background: '#fcfdff' }}>
        <b>当前分类下新增自定义业态</b>
        <p className="meta" style={{ marginTop: 4 }}>模板里没有的业态，可先加入本项目；后续再考虑保存到个人模板。</p>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 130px 130px', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>分类
            <select name="customCategory" value={activeCategory} onChange={(event) => setCategory(event.target.value)} style={{ height: 36, border: '1px solid #d9e2ec', borderRadius: 8, padding: '0 10px' }}>
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
