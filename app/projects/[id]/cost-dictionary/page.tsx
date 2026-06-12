import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const dictionary = [
  ['01', '土地获取费', '土地款、契税、交易登记费', '土地面积/合同金额', '可售面积分摊'],
  ['02', '前期工程费', '勘察测绘、设计、报批报建、三通一平、围墙临设', '建筑面积/专项工程量', '建筑面积分摊'],
  ['0204', '三通一平', '临水、临电、临时道路、场地平整', '现场工程量', '建筑面积分摊'],
  ['0205', '临设围墙出入口', '临时围墙、临时出入口、临设工程', '周界长度/出入口数量', '建筑面积分摊'],
  ['03', '建安工程费', '基础、主体、装饰、门窗、精装、安装、消防、电梯、设备', '建筑面积/专业工程量', '建筑面积或可售面积分摊'],
  ['0301', '地基与基础', '桩基、基坑支护、降水、基础处理', '基底面积/桩长/基坑面积', '建筑面积分摊'],
  ['0305', '公共区域精装修', '大堂、电梯厅、走道、公共部位精装', '大堂/公区精装面积', '建筑面积分摊'],
  ['0306', '户内精装修', '户内硬装、精装交付配置', '精装面积', '可售面积分摊'],
  ['0307', '安装工程', '给排水、强电、弱电、暖通、消防联动预留', '建筑面积/系统工程量', '建筑面积分摊'],
  ['030705', '充电桩安装工程', '充电桩管线、桥架、安装调试', '充电桩数量/预留管线数量', '车位或地库分摊'],
  ['0309', '电梯工程', '住宅电梯、商业电梯、扶梯', '电梯台数/单元数量', '建筑面积分摊'],
  ['0310', '设备工程', '主要机电设备、充电桩设备、泵房设备等', '台/套/容量', '建筑面积或专项分摊'],
  ['031001', '充电桩设备', '快充、慢充、控制箱及配套设备', '快充/慢充数量', '车位或地库分摊'],
  ['04', '基础设施费', '道路、管网、供配电、给排水外线、燃气通信、景观', '室外工程量', '建筑面积分摊'],
  ['0401', '红线内道路', '道路基层、面层、路缘石等', '道路面积', '建筑面积分摊'],
  ['0402', '综合管网', '雨污水、强弱电管沟、综合管线', '景观面积/管线长度', '建筑面积分摊'],
  ['0406', '园林景观工程', '硬景、软景、水系、景观构筑物', '景观面积/硬景面积/软景面积', '建筑面积分摊'],
  ['05', '公共配套设施费', '物业、社区、养老托育、幼儿园、会所、公厕门卫', '配套建筑面积/专项工程量', '建筑面积分摊'],
  ['06', '开发间接费', '项目管理、临时办公、工程管理相关间接支出', '项目周期/合同', '建筑面积分摊'],
  ['07', '销售费用', '营销、渠道、广告、案场包装等', '销售收入/合同', '可售面积分摊'],
  ['08', '管理费用', '公司管理分摊及项目管理费用', '收入或成本基数', '可售面积分摊'],
  ['09', '财务费用', '融资利息、手续费等', '融资金额/周期', '可售面积分摊'],
  ['10', '增值税及附加', '增值税、城建税、教育附加、地方教育附加', '销项税额-进项税额', '税金测算'],
  ['11', '企业所得税', '所得税前利润计算所得税', '应纳税所得额', '税金测算']
];

function indent(code: string) {
  if (code.length <= 2) return 0;
  if (code.length <= 4) return 18;
  return 36;
}

export default async function CostDictionaryPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return <main className="page">项目不存在</main>;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1380 }}>
        <div className="page-header">
          <div>
            <p className="eyebrow">系统资料 / 成本科目</p>
            <h1 className="title">成本科目及测算词典</h1>
            <p className="subtitle">先按模板建立科目口径，后续目标成本、前期费、安装明细、设备明细都统一引用这里。</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href={`/projects/${project.id}/costs`} className="btn btn-primary">目标成本测算</Link>
            <Link href={`/projects/${project.id}`} className="btn">返回工作台</Link>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 14 }}>
          <h2>口径说明</h2>
          <p className="meta">充电桩不作为业态；成本进入安装工程和设备工程。围墙按周界长度测算，出入口按数量测算；硬景、软景、景观、水系分别按对应面积或专项工程量测算。</p>
        </section>

        <section className="card">
          <h2>科目词典</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['编码', '成本科目', '定义/包含内容', '测算依据', '默认分摊方式'].map((head) => (
                    <th key={head} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dictionary.map(([code, name, desc, basis, allocation]) => (
                  <tr key={code}>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{code}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)', fontWeight: 800, paddingLeft: 10 + indent(code) }}>{name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{desc}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{basis}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{allocation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
