import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProductScopeSelect } from '@/components/product-scope-select';
import { prisma } from '@/lib/prisma';
import { activeVersionOrder, activeVersionWhere } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

const yesNo = [['true', '是'], ['false', '否']] as const;
const fitoutStandards = [['标准', '标准'], ['中档', '中档'], ['高档', '高档'], ['豪华', '豪华']] as const;
const fieldStyle = { height: 36, border: '1px solid #d9e2ec', borderRadius: 8, padding: '4px 9px', background: '#fff' };

function valueOf(project: any, name: string) {
  const value = project[name];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && typeof value.toString === 'function') return value.toString();
  return String(value);
}

function boolValue(project: any, name: string) {
  return project[name] ? 'true' : 'false';
}

function getRank(name: string) {
  const order = ['高层住宅', '小高层住宅', '洋房住宅', '叠拼/联排', '别墅/合院', '商业街', '底商', '独立商业', '地下产权车位', '非主楼纯地库', '物业用房', '社区用房', '示范区', '售楼部', '样板间'];
  const index = order.indexOf(name);
  return index >= 0 ? index : 999;
}

function isVirtualRevenueProduct(name: string) {
  return name.startsWith('商业收入-') || name.startsWith('其他收入-');
}

function Block({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return <section style={{ border: '1px solid #d9e2ec', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
    <div style={{ padding: '13px 15px', background: '#f8fafc', borderBottom: '1px solid #d9e2ec' }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <p className="meta" style={{ margin: '5px 0 0' }}>{note}</p>
    </div>
    <div style={{ padding: 15 }}>{children}</div>
  </section>;
}

function MiniCard({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return <div style={{ border: '1px solid #e6eef7', borderRadius: 12, background: '#fbfdff', padding: 13 }}>
    <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
    <p className="meta" style={{ margin: '4px 0 12px' }}>{note}</p>
    {children}
  </div>;
}

function Grid({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>{children}</div>;
}

function TwoCol({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>{children}</div>;
}

function selectFor(project: any, name: string, label: string, options: readonly (readonly [string, string])[], defaultValue?: string, note?: string) {
  const value = name.startsWith('is') || name.endsWith('Enabled') || name.endsWith('Fitout') || name.startsWith('has') || name.endsWith('Upgrade') ? boolValue(project, name) : valueOf(project, name) || defaultValue || options[0]?.[0] || '';
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467', fontWeight: 650 }}>{label}
    <select form="construction-standards-form" name={name} defaultValue={value} style={fieldStyle}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    {note ? <span className="meta" style={{ fontWeight: 400 }}>{note}</span> : null}
  </label>;
}

function textFor(project: any, name: string, label: string, placeholder?: string) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467', fontWeight: 650 }}>{label}<input form="construction-standards-form" name={name} defaultValue={valueOf(project, name)} placeholder={placeholder} style={fieldStyle} /></label>;
}

function numberFor(project: any, name: string, label: string) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475467', fontWeight: 650 }}>{label}<input form="construction-standards-form" name={name} type="number" step="0.01" defaultValue={valueOf(project, name)} style={fieldStyle} /></label>;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value" style={{ fontSize: 22 }}>{value}</div><div className="meta">{note}</div></div>;
}

function onOff(value: unknown) {
  return value ? '启用' : '未启用';
}

export default async function ConstructionStandardsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;
  const version = await prisma.projectVersion.findFirst({ where: activeVersionWhere(project), orderBy: activeVersionOrder(project), include: { products: true } });
  const products = [...(version?.products || [])].filter((item) => item.isActive && !isVirtualRevenueProduct(item.name)).sort((a, b) => getRank(a.name) - getRank(b.name) || a.name.localeCompare(b.name));
  const scopeProductNames = products.map((item) => item.name);

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1380 }}>
    <div className="page-header" style={{ alignItems: 'flex-start' }}><div><p className="eyebrow">基础数据</p><h1 className="title">建造配置标准</h1><p className="subtitle">用卡片方式维护装配式、精装、公区、地库品质、配套装修、示范区和采暖。该页只负责标准配置，不录入工程量。</p></div><div className="actions" style={{ marginTop: 0 }}><button form="construction-standards-form" className="btn btn-primary">保存配置标准</button><Link href={`/projects/${project.id}/overview`} className="btn">项目概况</Link><Link href={`/projects/${project.id}/quantity-indicators`} className="btn">工程量指标</Link><Link href={`/projects/${project.id}/product-maintenance`} className="btn">业态产品</Link></div></div>
    {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 16, borderColor: '#b2f2bb', background: '#f0fff4' }}>建造配置标准已保存，相关成本科目启用状态已重建。</div> : null}
    <form id="construction-standards-form" action={`/api/projects/${project.id}/construction-standards`} method="post" />

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <Stat label="装配式" value={onOff(project.isPrefabricated)} note={project.prefabricatedScope || '未选择范围'} />
      <Stat label="住宅精装" value={project.residentialFitoutDelivery ? String(project.residentialFitoutStandard || '精装') : '毛坯'} note="住宅户内交付" />
      <Stat label="地下室品质" value={project.basementQualityUpgrade ? String(project.basementQualityStandard || '品质提升') : '基础'} note="地库美化/品质标准" />
      <Stat label="商业交付" value={String(project.shopDeliveryStandard || '毛坯')} note={project.commercialPublicFitout ? '含商业公区装修' : '不含商业公区装修'} />
      <Stat label="示范区" value={project.hasSalesOffice || project.hasShowFlat ? '启用' : '未启用'} note={`售楼部 ${project.hasSalesOffice ? '有' : '无'} / 样板间 ${project.hasShowFlat ? '有' : '无'}`} />
      <Stat label="采暖" value={onOff(project.heatingEnabled)} note={project.heatingScope || '未选择范围'} />
    </div>

    <section className="card" style={{ marginBottom: 14, borderColor: '#d0ebff', background: '#f8fbff' }}>
      <b>录入口径</b>
      <p className="meta" style={{ margin: '6px 0 0' }}>这里填“标准”和“适用范围”；面积、数量、车位、充电桩、景观、围墙等工程量去工程量指标页维护。范围不选时，对应专项科目不自动启用。</p>
    </section>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Block title="一、装配式标准" note="控制装配式科目是否启用，以及适用哪些业态。">
        <Grid>{selectFor(project, 'isPrefabricated', '是否装配式', yesNo, 'false')}<ProductScopeSelect formId="construction-standards-form" name="prefabricatedScope" label="装配式适用范围" products={scopeProductNames} value={project.prefabricatedScope} />{numberFor(project, 'prefabricationRate', '装配率%')}{textFor(project, 'prefabricatedSystem', '装配式结构形式', 'PC构件/叠合板/预制楼梯/预制墙板')}</Grid>
      </Block>

      <Block title="二、住宅交付与公区标准" note="住宅户内、住宅公区、地下归家动线分别控制。">
        <TwoCol>
          <MiniCard title="住宅公区" note="门厅、电梯厅、标准层公区等。"><Grid>{selectFor(project, 'residentialPublicFitoutStandard', '住宅公区装修标准', fitoutStandards, '标准')}{selectFor(project, 'undergroundLobbyFitoutStandard', '地下归家装修标准', [['无地下归家', '无地下归家'], ['标准', '标准'], ['中档', '中档'], ['高档', '高档']], '标准')}</Grid></MiniCard>
          <MiniCard title="住宅户内" note="毛坯、简装、精装等交付标准。"><Grid>{selectFor(project, 'residentialFitoutDelivery', '是否精装交付', yesNo, 'false')}{selectFor(project, 'residentialFitoutType', '户内精装修类型', [['硬装', '硬装'], ['软装', '软装'], ['硬装+软装', '硬装+软装']], '硬装')}{selectFor(project, 'residentialFitoutStandard', '户内交付标准', [['毛坯', '毛坯'], ['简装', '简装'], ['中装', '中装'], ['精装', '精装'], ['豪装', '豪装']], '毛坯')}</Grid></MiniCard>
        </TwoCol>
      </Block>

      <Block title="三、商业与地下室标准" note="商业交付、公区装修、地库品质单独维护，避免混在一个大表里。">
        <TwoCol>
          <MiniCard title="商业交付" note="底商、商业街、独立商业、公寓办公等。"><Grid>{selectFor(project, 'commercialPublicFitout', '是否商业公区装修', yesNo, 'false')}{selectFor(project, 'commercialPublicFitoutStandard', '商业公区装修标准', fitoutStandards, '标准')}{selectFor(project, 'shopDeliveryStandard', '商铺交付标准', [['毛坯', '毛坯'], ['简装', '简装'], ['中装', '中装'], ['精装', '精装']], '毛坯')}</Grid></MiniCard>
          <MiniCard title="地下室品质" note="车库地坪、墙面、照明、导视、归家动线等。"><Grid>{selectFor(project, 'basementQualityUpgrade', '是否地库品质提升', yesNo, 'false')}{selectFor(project, 'basementQualityStandard', '地库品质标准', [['基础美化', '基础美化'], ['中档', '中档'], ['高档', '高档']], '基础美化')}</Grid></MiniCard>
        </TwoCol>
      </Block>

      <Block title="四、配套公建与示范区" note="配套装修、售楼部、样板间分开控制，后续可区分开发成本与销售费用。">
        <TwoCol>
          <MiniCard title="配套公建装修" note="物业、社区、养老、托育等配套用房。"><Grid>{selectFor(project, 'propertyFitout', '物业用房精装', yesNo, 'false')}{selectFor(project, 'communityFitout', '社区用房精装', yesNo, 'false')}{selectFor(project, 'supportFitout', '配套用房精装', yesNo, 'false')}</Grid></MiniCard>
          <MiniCard title="售楼部 / 样板间" note="示范区展示及营销包装标准。"><Grid>{selectFor(project, 'hasSalesOffice', '是否有售楼部', yesNo, 'false')}{selectFor(project, 'salesOfficeFitoutType', '售楼部装修类型', [['硬装', '硬装'], ['软装', '软装'], ['硬装+软装', '硬装+软装']], '硬装+软装')}{selectFor(project, 'hasShowFlat', '是否有样板间', yesNo, 'false')}{selectFor(project, 'showFlatFitoutType', '样板间装修类型', [['硬装', '硬装'], ['软装', '软装'], ['硬装+软装', '硬装+软装'], ['全部', '全部']], '全部')}</Grid></MiniCard>
        </TwoCol>
      </Block>

      <Block title="五、采暖 / 地暖标准" note="控制采暖科目是否启用，以及适用范围。未选择范围时，不启用采暖科目。">
        <Grid>{selectFor(project, 'heatingEnabled', '是否采暖', yesNo, 'false')}<ProductScopeSelect formId="construction-standards-form" name="heatingScope" label="采暖适用范围" products={scopeProductNames} value={project.heatingScope} />{textFor(project, 'heatingType', '采暖形式', '地暖/散热器/集中供暖/空气源')}</Grid>
      </Block>
    </div>
  </div></main>;
}
