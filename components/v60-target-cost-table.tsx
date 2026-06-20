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

function single(amount: number, area: number) {
  return area ? amount / area : 0;
}

function levelStyle(level: number, amount: number) {
  if (level === 1) return { background: '#e9f7f8', fontWeight: 900 };
  if (level === 2) return { background: '#f8fafc', fontWeight: 800 };
  if (level === 3) return { background: '#fcfdff', fontWeight: 700 };
  return { background: amount > 0 ? '#f8fff9' : '#fff' };
}

function amountCells(amount: AmountValue, keyPrefix: string, cellStyle: any, area?: { buildingArea?: number; saleableArea?: number }, fallbackBuildingArea = 0, fallbackSaleableArea = 0) {
  const buildingArea = area?.buildingArea || fallbackBuildingArea;
  const saleableArea = area?.saleableArea || fallbackSaleableArea;
  return [
    <td key={`${keyPrefix}-excl`} style={{ ...cellStyle, textAlign: 'right' }}>{fmt(amount.excl)}</td>,
    <td key={`${keyPrefix}-incl`} style={{ ...cellStyle, textAlign: 'right', fontWeight: 800 }}>{fmt(amount.incl)}</td>,
    <td key={`${keyPrefix}-tax`} style={{ ...cellStyle, textAlign: 'right' }}>{fmt(amount.tax)}</td>,
    <td key={`${keyPrefix}-building`} style={{ ...cellStyle, textAlign: 'right' }}>{fmt(single(amount.incl, buildingArea))}</td>,
    <td key={`${keyPrefix}-saleable`} style={{ ...cellStyle, textAlign: 'right' }}>{fmt(single(amount.incl, saleableArea))}</td>
  ];
}

export function V60TargetCostTable({ rows, products, buildingArea, saleableArea }: { rows: DisplayRow[]; products: ProductColumn[]; buildingArea: number; saleableArea: number }) {
  const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const parentIds = useMemo(() => rows.filter((row) => !row.isLeaf).map((row) => row.id), [rows]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(parentIds));

  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  function collapseAll() {
    setExpanded(new Set(rows.filter((row) => row.level === 1).map((row) => row.id)));
  }

  function onlyTopLevel() {
    setExpanded(new Set());
  }

  const visibleRows = rows.filter(isVisible);
  const productAreaMap = new Map(products.map((item) => [item.name, item]));
  const productNames = products.map((item) => item.name);

  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <b>目标成本测算表｜V60横向分业态大表</b>
          <div className="meta">左侧固定：级次、编码、科目、测算依据、单位、税率、说明；右侧：目标成本汇总 + 各业态汇总 + 各业态五列。</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={expandAll}>展开全部</button>
          <button type="button" className="btn" onClick={collapseAll}>折叠到一级</button>
          <button type="button" className="btn" onClick={onlyTopLevel}>只看一级</button>
        </div>
      </div>
      <div style={{ overflow: 'auto', maxHeight: '74vh' }}>
        <table style={{ width: '100%', minWidth: Math.max(1720, 980 + (productNames.length + 1) * 520), borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#dff3f6' }}>
              <th colSpan={7} style={{ ...cell, position: 'sticky', left: 0, zIndex: 6, background: '#dff3f6', textAlign: 'center', fontWeight: 900 }}>科目区</th>
              <th colSpan={5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>目标成本汇总</th>
              {productNames.length ? <th colSpan={productNames.length * 5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>各业态汇总 / 分业态汇总</th> : null}
              <th style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>来源</th>
            </tr>
            <tr style={{ background: '#eef7f9' }}>
              <th colSpan={7} style={{ ...cell, position: 'sticky', left: 0, zIndex: 5, background: '#eef7f9', textAlign: 'center' }}>级次 / 编码 / 科目 / 测算依据</th>
              <th colSpan={5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>全项目合计</th>
              {productNames.map((name) => <th key={name} colSpan={5} style={{ ...cell, textAlign: 'center', fontWeight: 900 }}>{name}</th>)}
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
              {['不含税', '含税', '税额', '建面单方', '可售单方'].map((head) => <th key={`all-${head}`} style={{ ...cell, textAlign: 'right', minWidth: 96 }}>{head}</th>)}
              {productNames.flatMap((name) => ['不含税', '含税', '税额', '建面单方', '可售单方'].map((head) => <th key={`${name}-${head}`} style={{ ...cell, textAlign: 'right', minWidth: 96 }}>{head}</th>))}
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
                {amountCells(item.amount, `${item.id}-all`, cell, undefined, buildingArea, saleableArea)}
                {productNames.flatMap((name) => amountCells(item.amount.byProduct[name] || { excl: 0, incl: 0, tax: 0 }, `${item.id}-${name}`, cell, productAreaMap.get(name), buildingArea, saleableArea))}
                <td style={{ ...cell }}>{item.sourceTable}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
