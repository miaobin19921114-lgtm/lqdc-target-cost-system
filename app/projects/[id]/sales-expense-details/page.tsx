import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function SalesExpenseDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="销售费用明细"
    eyebrow="销售费用明细表"
    subtitle="营销推广、渠道佣金、销售代理、案场包装、广告宣传等销售费用科目从成本词典预设。"
    professionalGroup="销售费用明细"
    returnPath="sales-expense-details"
    dictionaryKeywords={['销售费用', '销售', '营销', '广告', '渠道', '佣金', '代理']}
    emptyText="暂无销售费用明细。"
    selectPlaceholder="请选择销售费用科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如销售收入、可售面积、固定金额、合同金额"
    note="销售费用按词典预设自动带出测算依据、单位、税率、经营分摊和税务口径。"
  />;
}
