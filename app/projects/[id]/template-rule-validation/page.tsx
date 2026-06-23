import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SubjectRow = {
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  parentCode: string | null;
  level: number;
  sortOrder: number;
  isEnabled: boolean;
};

type RuleRow = {
  id: string;
  ruleType: string;
  subjectCode: string;
  subjectName: string;
  applicableStage: string;
  precisionLevel: string;
  dataSourceTable: string | null;
  requiredFields: string | null;
  measureBasis: string | null;
  quantityFormula: string | null;
  pricingUnit: string | null;
  unitPriceSource: string | null;
  amountFormula: string | null;
  costAttributionMethod: string | null;
  allocationMethod: string | null;
  vatTreatment: string | null;
  landVatTreatment: string | null;
  incomeTaxTreatment: string | null;
  financeTreatment: string | null;
  isEnabled: boolean;
};

type Check = {
  name: string;
  status: '通过' | '提醒' | '异常';
  detail: string;
};

const expectedCostTax = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const expectedRevenue = ['R01', 'R02', 'R03', 'R04'];
const expectedFinance = ['F01', 'F02', 'F03', 'F04', 'F05'];
const expectedPrecision = ['L1 快速估算', 'L2 方案估算', 'L3 目标测算', 'L4 动态控制', 'L5 结算复盘'];

function missing(expected: string[], actual: Set<string>) {
  return expected.filter((item) => !actual.has(item));
}

function isBlank(value?: string | null) {
  return !String(value || '').trim();
}

async function loadSubjects() {
  try {
    return await prisma.$queryRawUnsafe<SubjectRow[]>(`
      SELECT "ruleType", "subjectCode", "subjectName", "parentCode", "level", "sortOrder", "isEnabled"
      FROM "TemplateRuleSubject"
      WHERE "templateCode" = 'residential-v1'
    `);
  } catch {
    return [];
  }
}

async function loadRules() {
  try {
    return await prisma.$queryRawUnsafe<RuleRow[]>(`
      SELECT "id", "ruleType", "subjectCode", "subjectName", "applicableStage", "precisionLevel", "dataSourceTable", "requiredFields",
             "measureBasis", "quantityFormula", "pricingUnit", "unitPriceSource", "amountFormula", "costAttributionMethod", "allocationMethod",
             "vatTreatment", "landVatTreatment", "incomeTaxTreatment", "financeTreatment", "isEnabled"
      FROM "TemplateUnifiedRule"
      WHERE "templateCode" = 'residential-v1'
    `);
  } catch {
    return [];
  }
}

function buildChecks(subjects: SubjectRow[], rules: RuleRow[]): Check[] {
  const checks: Check[] = [];
  const subjectCodes = new Set(subjects.map((subject) => subject.subjectCode));
  const rulePrecisions = new Set(rules.map((rule) => rule.precisionLevel));
  const parentCodes = new Set(subjects.map((subject) => subject.parentCode).filter(Boolean) as string[]);
  const leafSubjects = subjects.filter((subject) => !parentCodes.has(subject.subjectCode));
  const l3Rules = rules.filter((rule) => rule.precisionLevel === 'L3 目标测算');
  const l3RuleKeys = new Set(l3Rules.map((rule) => `${rule.ruleType}:${rule.subjectCode}`));

  const missCostTax = missing(expectedCostTax, subjectCodes);
  checks.push({
    name: '01-12 成本/税金科目',
    status: missCostTax.length ? '异常' : '通过',
    detail: missCostTax.length ? `缺少：${missCostTax.join('、')}` : '01 土地费至 12 税金已齐全。',
  });

  const missRevenue = missing(expectedRevenue, subjectCodes);
  checks.push({
    name: 'R 收入规则',
    status: missRevenue.length ? '异常' : '通过',
    detail: missRevenue.length ? `缺少：${missRevenue.join('、')}` : 'R01-R04 收入规则已齐全。',
  });

  const missFinance = missing(expectedFinance, subjectCodes);
  checks.push({
    name: 'F 财务评价规则',
    status: missFinance.length ? '异常' : '通过',
    detail: missFinance.length ? `缺少：${missFinance.join('、')}` : 'F01-F05 财务评价规则已齐全。',
  });

  const missPrecision = missing(expectedPrecision, rulePrecisions);
  checks.push({
    name: 'L1-L5 精度等级',
    status: missPrecision.length ? '异常' : '通过',
    detail: missPrecision.length ? `缺少：${missPrecision.join('、')}` : 'L1-L5 五级规则已生成。',
  });

  const leafMissingRules = leafSubjects.filter((subject) => !l3RuleKeys.has(`${subject.ruleType}:${subject.subjectCode}`));
  checks.push({
    name: '末级科目 L3 规则',
    status: leafMissingRules.length ? '提醒' : '通过',
    detail: leafMissingRules.length ? `有 ${leafMissingRules.length} 个末级科目缺少 L3 规则。` : '末级科目均有 L3 目标测算规则。',
  });

  const incompleteRules = rules.filter((rule) => ['dataSourceTable', 'requiredFields', 'measureBasis', 'quantityFormula', 'pricingUnit', 'unitPriceSource', 'amountFormula'].some((field) => isBlank((rule as Record<string, unknown>)[field] as string | null)));
  checks.push({
    name: '规则字段完整度',
    status: incompleteRules.length ? '提醒' : '通过',
    detail: incompleteRules.length ? `有 ${incompleteRules.length} 条规则缺少来源表/字段/公式/单位等信息。` : '规则来源、字段、公式、单位已填写。',
  });

  const hasLandCostWrongName = subjects.some((subject) => subject.subjectName.includes('土地成本'));
  const hasLandFee = subjects.some((subject) => subject.subjectCode === '01' && subject.subjectName === '土地费');
  checks.push({
    name: '土地费命名',
    status: hasLandFee && !hasLandCostWrongName ? '通过' : '异常',
    detail: hasLandFee && !hasLandCostWrongName ? '土地一级科目命名为“土地费”，未发现“土地成本”作为一级科目。' : '请检查土地费命名，避免使用“土地成本”作为一级成本科目。',
  });

  const reserve = subjects.find((subject) => subject.subjectCode === '11');
  const tax = subjects.find((subject) => subject.subjectCode === '12');
  checks.push({
    name: '预备费排序',
    status: reserve && tax && reserve.sortOrder < tax.sortOrder ? '通过' : '异常',
    detail: reserve && tax && reserve.sortOrder < tax.sortOrder ? '预备费排在税金前。' : '请检查预备费与税金排序。',
  });

  const chargeSubjects = subjects.filter((subject) => subject.subjectName.includes('充电桩'));
  const chargeOk = chargeSubjects.length > 0 && chargeSubjects.every((subject) => subject.subjectCode.startsWith('05'));
  checks.push({
    name: '充电桩归属',
    status: chargeOk ? '通过' : '提醒',
    detail: chargeOk ? '充电桩位于 05 设备工程下，归属地下车位/地库口径。' : '请检查充电桩是否位于设备工程下，且不作为业态。',
  });

  const taxRules = rules.filter((rule) => rule.ruleType === 'TAX');
  const taxOk = taxRules.length > 0 && taxRules.every((rule) => !isBlank(rule.vatTreatment) && !isBlank(rule.landVatTreatment) && !isBlank(rule.incomeTaxTreatment));
  checks.push({
    name: '税务口径',
    status: taxOk ? '通过' : '提醒',
    detail: taxOk ? '税费规则已包含增值税、土增税、所得税处理口径。' : '存在税费规则缺少税务处理口径。',
  });

  return checks;
}

function statusColor(status: Check['status']) {
  if (status === '通过') return '#2b8a3e';
  if (status === '提醒') return '#f08c00';
  return '#c92a2a';
}

export default async function TemplateRuleValidationPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!project) return <main className="page">项目不存在</main>;

  const [subjects, rules] = await Promise.all([loadSubjects(), loadRules()]);
  const checks = buildChecks(subjects, rules);
  const passCount = checks.filter((check) => check.status === '通过').length;
  const warnCount = checks.filter((check) => check.status === '提醒').length;
  const errorCount = checks.filter((check) => check.status === '异常').length;
  const activeRules = rules.filter((rule) => rule.isEnabled).length;

  return <main className="page" style={{ background: '#eef3f8' }}><div className="container" style={{ maxWidth: 1300 }}>
    <div className="page-header">
      <div>
        <p className="eyebrow">模板规则</p>
        <h1 className="title">{project.name} · 模板规则校验</h1>
        <p className="subtitle">校验住宅模板科目、规则、精度等级、字段公式和税务口径是否符合当前成本系统设计。</p>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href={`/projects/${project.id}/rule-template-center`} className="btn btn-primary">规则模板中心</Link>
        <Link href={`/projects/${project.id}/precision-rule-matrix`} className="btn">L1-L5精度规则</Link>
      </div>
    </div>

    <div className="summary-strip" style={{ marginBottom: 14 }}>
      <div className="stat"><div className="stat-label">校验通过</div><div className="stat-value">{passCount}</div><div className="meta">正常项</div></div>
      <div className="stat"><div className="stat-label">提醒</div><div className="stat-value">{warnCount}</div><div className="meta">需关注</div></div>
      <div className="stat"><div className="stat-label">异常</div><div className="stat-value">{errorCount}</div><div className="meta">需修正</div></div>
      <div className="stat"><div className="stat-label">启用规则</div><div className="stat-value">{activeRules}</div><div className="meta">模板母版</div></div>
    </div>

    <section className="card">
      <h2 style={{ marginTop: 0 }}>校验结果</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {checks.map((check) => <div key={check.name} style={{ display: 'grid', gridTemplateColumns: '160px 90px 1fr', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fff' }}>
          <b>{check.name}</b>
          <span style={{ color: statusColor(check.status), fontWeight: 800 }}>{check.status}</span>
          <span className="meta" style={{ color: '#334155' }}>{check.detail}</span>
        </div>)}
      </div>
    </section>

    <section className="card" style={{ marginTop: 14 }}>
      <h2 style={{ marginTop: 0 }}>模板规模</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <div><div className="meta">模板科目</div><b>{subjects.length}</b></div>
        <div><div className="meta">模板规则</div><b>{rules.length}</b></div>
        <div><div className="meta">L3 目标规则</div><b>{rules.filter((rule) => rule.precisionLevel === 'L3 目标测算').length}</b></div>
        <div><div className="meta">L5 结算复盘规则</div><b>{rules.filter((rule) => rule.precisionLevel === 'L5 结算复盘').length}</b></div>
      </div>
    </section>
  </div></main>;
}
