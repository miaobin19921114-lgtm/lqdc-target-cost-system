import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function FinanceExpenseDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="财务费用明细"
    eyebrow="财务费用明细表"
    subtitle="土地款资金占用、开发贷利息、股东借款利息、融资手续费、担保抵押、保函及银行资金管理费用等科目从V60词典预设。"
    professionalGroup="财务费用明细"
    returnPath="finance-expense-details"
    dictionaryKeywords={['财务费用', '财务', '融资', '利息', '资金', '手续费', '担保', '保函', '银行']}
    emptyText="暂无财务费用明细。"
    selectPlaceholder="请选择财务费用科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如融资金额、计息周期、利率、费率、固定金额"
    note="土地款资金占用、融资利息、融资手续费、担保及保函费用归财务费用，不放土地费或前期费；按融资合同、利息单和计息台账复核。"
  />;
}
