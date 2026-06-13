import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function AdminExpenseDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="管理费用明细"
    eyebrow="管理费用明细表"
    subtitle="项目管理、行政办公、人员管理、咨询服务等管理费用科目从成本词典预设。"
    professionalGroup="管理费用明细"
    returnPath="admin-expense-details"
    dictionaryKeywords={['管理费用', '管理', '行政', '办公', '咨询', '人员']}
    emptyText="暂无管理费用明细。"
    selectPlaceholder="请选择管理费用科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如建筑面积、开发周期、固定金额、合同金额"
    note="管理费用按词典预设自动带出测算依据、单位、税率、经营分摊和税务口径。"
  />;
}
