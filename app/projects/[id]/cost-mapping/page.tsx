import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateActiveVersion } from '@/lib/project-version';

export const dynamic = 'force-dynamic';

type RuleRow = {
  group: string;
  subject: string;
  source: string;
  quantityField: string;
  configField: string;
  pricing: string;
  scope: string;
  manual: string;
  note: string;
};

const ruleRows: RuleRow[] = [
  { group: '土地费', subject: '土地价款 / 契税 / 交易服务费', source: '概况表 / 手工录入', quantityField: '土地面积、土地总价', configField: '无', pricing: '直接金额', scope: '项目整体', manual: '允许', note: '土地费通常不按工程量自动生成，保留手工录入和税务扣除口径。' },
  { group: '前期工程费', subject: '三通一平 / 临设 / 围挡', source: '工程量指标', quantityField: 'siteLevelingArea、temporaryFacilityArea、sitePerimeter', configField: '项目阶段 / 临设标准', pricing: '面积/长度 × 单价', scope: '项目整体', manual: '允许', note: '三通一平后续可细分水、电、路、场平、网络通。' },
  { group: '前期工程费', subject: '勘察设计 / 报批报建 / 规费', source: '概况表 / 测算规则', quantityField: 'totalBuildingArea、capacityBuildingArea', configField: '城市区域、项目阶段', pricing: '建面 × 单价 或 费率', scope: '项目整体', manual: '允许', note: '部分规费地区差异大，应允许关闭和手改。' },
  { group: '土建工程', subject: '土石方 / 基坑支护', source: '工程量指标', quantityField: 'earthworkVolume、baseArea', configField: '地下室层数、基坑深度', pricing: 'm³/㎡ × 单价', scope: '地下空间 / 项目整体', manual: '允许', note: '投拓阶段可按地下建面或基底面积估算。' },
  { group: '土建工程', subject: '桩基工程', source: '工程量指标', quantityField: 'pileFoundationArea、baseArea', configField: '基础形式 / 地勘条件', pricing: '㎡ × 单价 或 根数 × 单价', scope: '对应业态/地下室', manual: '允许', note: '当前先按基底面积估算，后续可增加桩型、桩长、桩径。' },
  { group: '土建工程', subject: '主体结构', source: '概况表 + 工程量指标', quantityField: 'aboveGroundArea、undergroundArea、standardFloorArea', configField: '结构体系、装配式标准', pricing: '建面 × 单方', scope: '各业态', manual: '允许', note: '住宅、商业、地下室应分别取不同单方。' },
  { group: '土建工程', subject: '屋面 / 防水 / 保温', source: '工程量指标', quantityField: 'waterproofArea、roofArea、insulationArea', configField: '交付标准、地下室品质', pricing: '面积 × 单价', scope: '各业态', manual: '允许', note: '屋面、防水、保温从建面估算逐步过渡到专项面积。' },
  { group: '土建工程', subject: '外立面工程', source: '工程量指标 + 建造配置', quantityField: 'facadeArea', configField: '外立面档次（待扩展）', pricing: '外立面面积 × 档次单价', scope: '住宅/商业', manual: '允许', note: '后续建造配置页补涂料、真石漆、铝板、石材等档次。' },
  { group: '土建工程', subject: '门窗工程', source: '工程量指标 + 建造配置', quantityField: 'windowArea', configField: '门窗系统（待扩展）', pricing: '门窗面积 × 系统单价', scope: '住宅/商业', manual: '允许', note: '后续补普通铝合金、断桥铝、系统窗等配置。' },
  { group: '土建工程', subject: '栏杆 / 栏板', source: '工程量指标', quantityField: 'railingLength', configField: '产品档次', pricing: '长度 × 单价', scope: '住宅/商业', manual: '允许', note: '阳台栏杆、楼梯栏杆、护窗栏杆后续可分项。' },
  { group: '安装工程', subject: '给排水 / 强弱电 / 消防 / 暖通', source: '概况表 + 工程量指标', quantityField: 'buildingArea、undergroundArea、householdCount', configField: '采暖范围、智能化档次（待扩展）', pricing: '建面 × 单方', scope: '各业态', manual: '允许', note: '安装工程先按业态建面估算，后续按专业细分。' },
  { group: '设备工程', subject: '电梯工程', source: '工程量指标 + 建造配置', quantityField: 'elevatorCount、unitCount', configField: '电梯档次（待扩展）', pricing: '台数 × 单价', scope: '住宅/商业', manual: '允许', note: '电梯数量来自工程量指标，档次影响单价。' },
  { group: '设备工程', subject: '变配电 / 水泵房 / 消防水池', source: '工程量指标', quantityField: 'powerRoomCount、pumpRoomCount、firePoolVolume', configField: '设备标准', pricing: '数量/容积 × 单价', scope: '项目整体/地下室', manual: '允许', note: '设备房数量和消防水池容积直接影响设备及土建成本。' },
  { group: '设备工程', subject: '充电桩工程', source: '工程量指标 + 业态归属', quantityField: 'chargingPileCount、fastChargingPileCount、slowChargingPileCount', configField: '充电桩是否单独测算', pricing: '桩数 × 单价', scope: '归属地下车位', manual: '允许', note: '充电桩不作为业态，归属地下车位/安装设备成本。' },
  { group: '精装修', subject: '住宅户内精装', source: '概况表 + 建造配置', quantityField: 'saleableArea 或 精装面积', configField: 'residentialFitoutDelivery、residentialFitoutStandard', pricing: '精装面积 × 标准单价', scope: '住宅类', manual: '允许', note: '后续工程量页应补精装面积，当前可先按可售面积估算。' },
  { group: '精装修', subject: '住宅公区 / 入户大堂 / 地下归家', source: '工程量指标 + 建造配置', quantityField: 'publicArea、lobbyArea、undergroundArea', configField: 'residentialPublicFitoutStandard、undergroundLobbyFitoutStandard', pricing: '面积 × 标准单价', scope: '住宅类/地下空间', manual: '允许', note: '公区、大堂、地下归家应分开取量。' },
  { group: '精装修', subject: '商业公区 / 商铺交付', source: '建造配置 + 工程量指标', quantityField: '商业公区面积（待扩展）', configField: 'commercialPublicFitout、commercialPublicFitoutStandard、shopDeliveryStandard', pricing: '面积 × 标准单价', scope: '商业类', manual: '允许', note: '商业交付标准影响商业精装或二装预留成本。' },
  { group: '精装修', subject: '售楼部 / 样板间', source: '工程量指标 + 建造配置', quantityField: 'salesOfficeArea、showFlatArea', configField: 'hasSalesOffice、salesOfficeFitoutType、hasShowFlat、showFlatFitoutType', pricing: '面积 × 装修类型单价', scope: '示范区/销售费用', manual: '允许', note: '后续应可选择计入开发成本或销售费用。' },
  { group: '室外配套', subject: '景观工程', source: '工程量指标 + 建造配置', quantityField: 'landscapeArea、hardscapeArea、softscapeArea、waterFeatureArea', configField: '景观档次（待扩展）', pricing: '面积 × 档次单价', scope: '项目整体', manual: '允许', note: '硬景、软景、水景、儿童活动区应逐步拆分。' },
  { group: '室外配套', subject: '道路总平', source: '工程量指标', quantityField: 'roadArea、fireRoadArea、asphaltRoadArea', configField: '道路做法', pricing: '面积 × 单价', scope: '项目整体', manual: '允许', note: '道路、消防车道、沥青面层建议分项。' },
  { group: '室外配套', subject: '围墙 / 出入口', source: '工程量指标', quantityField: 'sitePerimeter、gateCount、formalGateCount、temporaryGateCount', configField: '围墙及出入口档次', pricing: '长度/数量 × 单价', scope: '项目整体', manual: '允许', note: '围墙按周界长度，出入口按数量单独计算。' },
  { group: '开发间接费', subject: '管理费 / 财务费 / 销售费用', source: '概况表 / 成本汇总 / 收入测算', quantityField: '销售收入、目标成本、开发周期', configField: '费率参数', pricing: '金额 × 费率', scope: '项目整体', manual: '允许', note: '销售费用可承接示范区、售楼部、样板间等营销包装成本。' },
  { group: '税金', subject: '增值税及附加 / 土增税 / 所得税', source: '收入测算 + 成本测算 + 税务清算对象', quantityField: '收入、进项、可扣除成本、清算对象', configField: '税率、清算口径', pricing: '税法公式', scope: '清算对象/项目整体', manual: '允许', note: '税金不是单价乘工程量，应单独按税务表计算。' }
];

const groups = Array.from(new Set(ruleRows.map((row) => row.group)));

function short(value?: string | null) {
  return value || '-';
}

function anchor(text: string) {
  return encodeURIComponent(text.replace(/\s+/g, '-'));
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="meta">{note}</div></div>;
}

export default async function CostMappingPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  const version = await getOrCreateActiveVersion(params.id);
  const mappings = await prisma.costDictionaryRow.findMany({
    where: { projectId: params.id, sourceTable: 'Excel科目映射' },
    orderBy: { updatedAt: 'desc' }
  });
  const subjects = await prisma.costSubject.findMany({
    where: { enabled: true },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
    take: 500
  });
  const recentLines = version
    ? await prisma.costLine.findMany({
        where: { projectVersionId: version.id, regionOrProductType: 'Excel导入' },
        include: { costSubject: true },
        orderBy: { sortOrder: 'asc' },
        take: 80
      })
    : [];

  return (
    <main className="page" style={{ background: '#eef3f8' }}>
      <div className="container" style={{ maxWidth: 1500 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">目标成本</p>
            <h1 className="title">{project?.name || '项目'} · 测算规则 / 科目映射</h1>
            <p className="subtitle">上半部分梳理“概况表、建造配置、工程量指标”如何驱动成本测算；下半部分保留 Excel 科目映射功能。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${params.id}/costs-batch`} className="btn btn-primary">目标成本测算</Link>
            <Link href={`/projects/${params.id}/overview`} className="btn">概况表</Link>
            <Link href={`/projects/${params.id}/construction-standards`} className="btn">建造配置</Link>
            <Link href={`/projects/${params.id}/quantity-indicators`} className="btn">工程量指标</Link>
            <Link href={`/projects/${params.id}`} className="btn">测算中心</Link>
          </div>
        </div>

        {searchParams?.saved === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>映射已保存。下次导入成本明细会优先使用该映射。</div> : null}
        {searchParams?.deleted === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#b2f2bb', background: '#f0fff4' }}>映射已删除。</div> : null}
        {searchParams?.missing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffd8a8' }}>请填写 Excel 科目，并选择系统标准科目。</div> : null}
        {searchParams?.targetMissing === '1' ? <div className="card" style={{ marginBottom: 14, borderColor: '#ffc9c9' }}>未找到选择的系统标准科目。</div> : null}

        <div className="summary-strip" style={{ marginBottom: 14 }}>
          <Stat label="测算规则" value={ruleRows.length} note="内置规则总览" />
          <Stat label="成本分组" value={groups.length} note="一级成本模块" />
          <Stat label="Excel映射" value={mappings.length} note="已保存映射" />
          <Stat label="标准科目" value={subjects.length} note="可映射标准科目" />
        </div>

        <section className="card" style={{ marginBottom: 16, borderColor: '#d0ebff', background: '#f8fbff' }}>
          <b>测算主线</b>
          <p className="meta" style={{ margin: '6px 0 10px' }}>概况表回答项目规模，建造配置回答档次做法，工程量指标回答数量，测算规则决定每个成本科目怎么取数。最终公式为：成本金额 = 工程量 × 建造配置对应单价/系数 × 适用范围。</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{groups.map((group) => <a key={group} className="btn" href={`#${anchor(group)}`}>{group}</a>)}</div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          {groups.map((group) => {
            const rows = ruleRows.filter((row) => row.group === group);
            return <section key={group} id={anchor(group)} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>{group}</h2><p className="meta" style={{ margin: '5px 0 0' }}>本组共 {rows.length} 条规则。</p></div><span style={{ border: '1px solid #d0ebff', background: '#e7f5ff', color: '#0b7285', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{rows.length} 条规则</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: 1180 }}>
                  <thead><tr><th>成本科目</th><th>取数来源</th><th>工程量字段</th><th>建造配置字段</th><th>默认计价口径</th><th>适用业态/对象</th><th>手动调整</th><th>说明</th></tr></thead>
                  <tbody>{rows.map((row) => <tr key={`${group}-${row.subject}`}><td><b>{row.subject}</b></td><td>{row.source}</td><td>{row.quantityField}</td><td>{row.configField}</td><td>{row.pricing}</td><td>{row.scope}</td><td>{row.manual}</td><td className="meta" style={{ minWidth: 230 }}>{row.note}</td></tr>)}</tbody>
                </table>
              </div>
            </section>;
          })}
        </div>

        <section className="card" style={{ marginBottom: 16, borderColor: '#c5eef3', background: '#f8fbff' }}>
          <b>Excel 科目映射</b>
          <p className="meta" style={{ margin: '6px 0 0' }}>下面保留原来的 Excel 科目映射功能。它解决外部 Excel 叫法不统一的问题；上面的测算规则表解决“系统自己怎么自动取数计算”的问题。</p>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>新增 / 更新 Excel 映射</h2>
          <form action={`/api/projects/${params.id}/cost-mapping`} method="post" style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <label><div className="meta">Excel 科目名称 / 科目路径 / 科目编码</div><input name="sourceText" placeholder="例如：主体建安 / 主体结构 / 土建工程费" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }} /></label>
            <label><div className="meta">映射到系统标准成本科目</div><select name="targetCode" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}><option value="">请选择标准成本科目</option>{subjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.code}｜{subject.fullPath || subject.name}</option>)}</select></label>
            <label><div className="meta">备注</div><input name="remark" placeholder="可选，如：来自某版目标成本表、供应商清单或历史Excel" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }} /></label>
            <div><button className="btn btn-primary">保存映射</button></div>
          </form>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2>已保存 Excel 映射</h2>
          <div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}><thead><tr>{['Excel 科目', '系统标准科目编码', '备注', '操作'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{mappings.map((mapping) => <tr key={mapping.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{short(mapping.detailSubject)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(mapping.targetMappingCode)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(mapping.remark)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}><form action={`/api/projects/${params.id}/cost-mapping`} method="post"><input type="hidden" name="action" value="delete" /><input type="hidden" name="mappingId" value={mapping.id} /><button className="btn" style={{ borderColor: '#ffc9c9' }}>删除</button></form></td></tr>)}{!mappings.length ? <tr><td colSpan={4} style={{ padding: 18, color: 'var(--muted)' }}>暂无映射。第一次导入可先使用系统科目，导入后再补充常用映射。</td></tr> : null}</tbody></table></div>
        </section>

        <section className="card">
          <h2>最近 Excel 导入科目参考</h2>
          <p className="meta">可以复制这些科目名称或路径，填到上面的“Excel 科目名称”。</p>
          <div style={{ overflowX: 'auto', marginTop: 12 }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['工作表 / 分组', '当前明细科目', '当前系统科目', '科目路径'].map((head) => <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>)}</tr></thead><tbody>{recentLines.map((line) => <tr key={line.id}><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(line.professionalGroup)}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{line.detailName}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{line.costSubject.code}｜{line.costSubject.name}</td><td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{short(line.description)}</td></tr>)}{!recentLines.length ? <tr><td colSpan={4} style={{ padding: 18, color: 'var(--muted)' }}>暂无 Excel 导入科目。</td></tr> : null}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}
