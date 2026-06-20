'use client';

import { useMemo, useState } from 'react';

type ProductColumn = {
  name: string;
  buildingArea: number;
  saleableArea: number;
};

type AmountValue = {
  excl: number;
  incl: number;
  tax: number;
};

type Amount = AmountValue & {
  byProduct: Record<string, AmountValue>;
};

type DisplayRow = {
  id: string;
  parentId: string | null;
  level: number;
  code: string;
  name: string;
  measureBasis: string;
  unit: string;
  taxRate: string;
  remark: string;
  sourceTable: string;
  isLeaf: boolean;
  amount: Amount;
};

const amountHeads = ['不含税(万元)', '含税(万元)', '税额(万元)', '建面单方(元/㎡)', '可售单方(元/㎡)'];
const cell = { padding: 8, borderBottom: '1px solid #eef2f6', borderRight: '1px solid #eef2f6', whiteSpace: 'nowrap' as const };
const stickyLevel = { ...cell, position: 'sticky' as const, left: 0, zIndex: 4, background: '#fff', minWidth: 56, textAlign: 'center' as const };
const stickyCode = { ...cell, position: 'sticky' as const, left: 56, zIndex: 4, background: '#fff', minWidth: 112, fontWeight: 800, color: '#0f4c5c' };
const stickySubject = { ...cell, position: 'sticky' as const, left: 168, zIndex: 4, background: '#fff', minWidth: 300, fontWeight: 800 };

function num(value: unknown) {
  return Number(value || 0);
}

function fmt(value: unknown) {
  return num(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function single(amountWan: number, area: number) {
  return area ? (amountWan * 10000) / area : 0;
}

function levelStyle(level: number, amount: number) {
  if (level === 1) return { background: '#e9f7f8', fontWeight: 900 };
  if (level === 2) return { background: '#f8fafc', fontWeight: 800 };
  if (level === 3) return { background: '#fcfdff', fontWeight: 700 };
  return { background: amount > 0 ? '#f8fff9' : '#fff' };
}

function amountCells(amount: AmountValue, keyPrefix: string, cellStyle: any, area?: { buildingArea?: number; saleableArea?: number }, fallbackBuildingArea = 0, fallbackSaleableArea = 0, labelPrefix = '') {
  const buildingArea = area?.buildingArea || fallbackBuildingArea;
  const saleableArea = area?.saleableArea || fallbackSaleableArea;
  return [
    <td key={`${keyPrefix}-excl`} style={{ ...cellStyle, textAlign: 'right' }} title={`${labelPrefix}不含税(万元)`}>{fmt(amount.excl)}</td>,
    <td key={`${keyPrefix}-incl`} style={{ ...cellStyle, textAlign: 'right', fontWeight: 800 }} title={`${labelPrefix}含税(万元)`}>{fmt(amount.incl)}</td>,
    <td key={`${keyPrefix}-tax`} style={{ ...cellStyle, textAlign: 'right' }} title={`${labelPrefix}税额(万元)`}>{fmt(amount.tax)}</td>,
    <td key={`${keyPrefix}-building`} style={{ ...cellStyle, textAlign: 'right' }} title={`${labelPrefix}建面单方(元/㎡)`}>{fmt(single(amount.incl, buildingArea))}</td>,
    <td key={`${keyPrefix}-saleable`} style={{ ...cellStyle, textAlign: 'right' }} title={`${labelPrefix}可售单方(元/㎡)`}>{fmt(single(amount.incl, saleableArea))}</td>
  ];
}

function collapsedAmountCell(amount: AmountValue, keyPrefix: string, cellStyle: any, label: string) {
  return <td key={`${keyPrefix}-collapsed`} style={{ ...cellStyle, textAlign: 'right', minWidth: 118, fontWeight: 900 }} title={`${label}｜含税合计(万元)`}>{fmt(amount.incl)}</td>;
}

export function V60TargetCostTable({ rows, products, buildingArea, saleableArea }: { rows: DisplayRow[]; products: ProductColumn[]; buildingArea: number; saleableArea: number }) {
  const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const parentRows = useMemo(() => rows.filter((row) => !row.isLeaf), [rows]);
  const parentIds = useMemo(() => parentRows.map((row) => row.id), [parentRows]);
  const levelOneIds = useMemo(() => rows.filter((row) => row.level === 1).map((row) => row.id), [rows]);
  const levelTwoIds = useMemo(() => rows.filter((row) => row.level === 2).map((row) => row.id), [rows]);
  const levelThreeIds = useMemo(() => rows.filter((row) => row.level === 3).map((row) => row.id), [rows]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(parentIds));
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProduct(name: string) {
    setCollapsedProducts((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function isVisible(row: DisplayRow) {
    let parentId = row.parentId;
    while (parentId) {
      if (!expanded.has(parentId)) return false;
      parentId = rowById.get(parentId)?.parentId || null;
    }
    return true;
  }

  function expandAll() {
    setExpanded(new Set(parentIds));
  }

  function showLevelOne() {
    setExpanded(new Set());
  }

  function showLevelTwo() {
    setExpanded(new Set(levelOneIds));
  }

  function showLevelThree() {
    setExpanded(new Set([...levelOneIds, ...levelTwoIds]));
  }

  function showLeaf() {
    setExpanded(new Set([...levelOneIds, ...levelTwoIds, ...levelThreeIds]));
  }

  function collapseAllProducts() {
    setCollapsedProducts(new Set(products.map((item) => item.name)));
  }

  function expandAllProducts() {
    setCollapsedProducts(new Set());
  }

  const visibleRows = rows.filter(isVisible);
  const productAreaMap = new Map(products.map((item) => [item.name, item]));
  const productNames = products.map((item) => item.name);
  const productColumnCount = productNames.reduce((sum, name) => sum + (collapsedProducts.has(name) ? 1 : 5), 0);

  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <b>目标成本测算表｜V60横向分业态大表</b>
          <div className="meta">金额单位：万元；单价单位：元/单位；单方单位：元/㎡。折叠到一级/二级/三级时，下级全部收起。</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={showLevelOne}>折叠到一级</button>
          <button type="button" className="btn" onClick={showLevelTwo}>折叠到二级</button>
          <button type="button" className="btn" onClick={showLevelThree}>折叠到三级</button>
          <button type="button" className="btn" onClick={showLeaf}>展开到末级</button>
          <button type="button" className="btn" onClick={expandAll}>展开全部</button>
          <button type="button" className="btn" onClick={collapseAllProducts}>折叠业态列</button>
          <button type="button" className="btn" onClick={expandAllProducts}>展开业态列</button>
        </div>
      </div>
      <div style={{ overflow: 'auto', maxHeight: '74vh' }}>
        <table style={{ width: '100%', minWidth: Math.max(1720, 980 + 520 + productColumnCount * 110), borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#dff3f6' }}>
              <th colSpan={7} style={{ ...cell, position: 'sticky', left: 0, zIndex: 6, background: '#dff3f6', textAlign: 'center', fontWeight: 900 }}>科目区</th>
              <th colSpan={5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>目标成本汇总（万元）</th>
              {productNames.length ? <th colSpan={productColumnCount} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>各业态汇总 / 分业态汇总（万元、元/㎡）</th> : null}
              <th style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>来源</th>
            </tr>
            <tr style={{ background: '#eef7f9' }}>
              <th colSpan={7} style={{ ...cell, position: 'sticky', left: 0, zIndex: 5, background: '#eef7f9', textAlign: 'center' }}>级次 / 编码 / 科目 / 测算依据</th>
              <th colSpan={5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>全项目合计</th>
              {productNames.map((name) => {
                const collapsed = collapsedProducts.has(name);
                return <th key={name} colSpan={collapsed ? 1 : 5} style={{ ...cell, textAlign: 'center', fontWeight: 900, background: collapsed ? '#fff9db' : '#eef7f9' }}>
                  <button type="button" onClick={() => toggleProduct(name)} style={{ border: '1px solid #d9e2ec', borderRadius: 6, background: '#fff', cursor: 'pointer', marginRight: 6 }}>{collapsed ? '▸' : '▾'}</button>
                  {name}
                </th>;
              })}
              <th style={{ ...cell, textAlign: 'center' }}>明细表</th>
            </tr>
            <tr style={{ background: '#fff' }}>
              <th style={stickyLevel}>级次</th>
              <th style={stickyCode}>编码</th>
              <th style={stickySubject}>目标成本科目</th>
              <th style={{ ...cell, textAlign: 'left', minWidth: 220 }}>测算依据</th>
              <th style={{ ...cell, textAlign: 'left', minWidth: 70 }}>单位</th>
              <th style={{ ...cell, textAlign: 'left', minWidth: 70 }}>税率</th>
              <th style={{ ...cell, textAlign: 'left', minWidth: 260 }}>说明/计算口径</th>
              {amountHeads.map((head) => <th key={`all-${head}`} style={{ ...cell, textAlign: 'right', minWidth: 110 }}>全项目｜{head}</th>)}
              {productNames.flatMap((name) => {
                if (collapsedProducts.has(name)) return [<th key={`${name}-collapsed`} style={{ ...cell, textAlign: 'right', minWidth: 118, background: '#fff9db' }}>{name}｜含税(万元)</th>];
                return amountHeads.map((head) => <th key={`${name}-${head}`} style={{ ...cell, textAlign: 'right', minWidth: 128 }}>{name}｜{head}</th>);
              })}
              <th style={{ ...cell, textAlign: 'left', minWidth: 110 }}>来源</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((item) => {
              const style = levelStyle(item.level, item.amount.incl);
              const canToggle = !item.isLeaf;
              const isOpen = expanded.has(item.id);
              return <tr key={item.id} style={style}>
                <td style={{ ...stickyLevel, ...style }}>{item.level}</td>
                <td style={{ ...stickyCode, ...style }}>{item.code}</td>
                <td style={{ ...stickySubject, ...style, paddingLeft: 8 + (item.level - 1) * 18 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {canToggle ? <button type="button" onClick={() => toggle(item.id)} aria-label={isOpen ? '折叠' : '展开'} style={{ width: 22, height: 22, border: '1px solid #d9e2ec', borderRadius: 6, background: '#fff', cursor: 'pointer', lineHeight: '18px' }}>{isOpen ? '▾' : '▸'}</button> : <span style={{ width: 22, display: 'inline-block' }} />}
                    <span>{item.name}</span>
                  </span>
                </td>
                <td style={{ ...cell, whiteSpace: 'normal' }}>{item.measureBasis || (item.isLeaf ? '-' : '自动汇总')}</td>
                <td style={{ ...cell }}>{item.unit}</td>
                <td style={{ ...cell }}>{item.taxRate}</td>
                <td style={{ ...cell, whiteSpace: 'normal', color: '#667085' }}>{item.remark || (item.isLeaf ? '-' : '汇总下级末级科目，不重复计入')}</td>
                {amountCells(item.amount, `${item.id}-all`, cell, undefined, buildingArea, saleableArea, '全项目｜')}
                {productNames.flatMap((name) => {
                  const amount = item.amount.byProduct[name] || { excl: 0, incl: 0, tax: 0 };
                  if (collapsedProducts.has(name)) return [collapsedAmountCell(amount, `${item.id}-${name}`, cell, name)];
                  return amountCells(amount, `${item.id}-${name}`, cell, productAreaMap.get(name), buildingArea, saleableArea, `${name}｜`);
                })}
                <td style={{ ...cell }}>{item.sourceTable}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
