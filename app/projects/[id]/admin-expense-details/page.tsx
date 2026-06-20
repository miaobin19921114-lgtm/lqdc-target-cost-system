import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function AdminExpenseDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="管理费用明细"
    eyebrow="管理费用明细表"
    subtitle="项目管理人员、办公行政、差旅招待、项目公司运营、后台管理分摊、管理专项服务、其他管理费用等科目从V60词典预设。"
    professionalGroup="管理费用明细"
    returnPath="admin-expense-details"
    dictionaryKeywords={['管理费用', '管理', '行政', '办公', '人员', '后台', '分摊', '审计', '财税', '合规']}
    emptyText="暂无管理费用明细。"
    selectPlaceholder="请选择管理费用科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如开发周期、人员月费用、建筑面积、销售收入、项目预算、合同金额"
    note="管理费用不混入销售费用、财务费用、建安成本或前期工程费；工程造价、监理、设计类咨询应归对应工程/前期口径。"
  />;
}
