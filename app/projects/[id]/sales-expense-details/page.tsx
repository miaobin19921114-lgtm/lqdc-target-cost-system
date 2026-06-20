import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function SalesExpenseDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="销售费用明细"
    eyebrow="销售费用明细表"
    subtitle="销售代理、渠道佣金、广告推广、案场包装、营销活动、案场运营、销售人员及交付配合等销售费用科目从V60词典预设。"
    professionalGroup="销售费用明细"
    returnPath="sales-expense-details"
    dictionaryKeywords={['销售费用', '销售', '营销', '广告', '渠道', '佣金', '代理', '案场', '样板间', '售楼部']}
    emptyText="暂无销售费用明细。"
    selectPlaceholder="请选择销售费用科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如销售收入、成交金额、可售面积、销售周期、合同金额、固定金额"
    note="销售费用不混入建安、精装或室外成本；售楼部、样板间、示范区若作为营销展示包装，进入销售费用，若形成永久工程需按合同边界复核。"
  />;
}
