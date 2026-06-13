import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function FinanceExpenseDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="财务费用明细"
    eyebrow="财务费用明细表"
    subtitle="贷款利息、融资费用、资金占用、担保手续费等财务费用科目从成本词典预设。"
    professionalGroup="财务费用明细"
    returnPath="finance-expense-details"
    dictionaryKeywords={['财务费用', '财务', '融资', '利息', '资金', '手续费', '担保']}
    emptyText="暂无财务费用明细。"
    selectPlaceholder="请选择财务费用科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如融资金额、计息周期、利率、固定金额"
    note="财务费用按词典预设自动带出测算依据、单位、税率、经营分摊和税务口径。"
  />;
}
