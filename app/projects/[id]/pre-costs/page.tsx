import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function PreCostsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="前期费用明细"
    eyebrow="前期费用明细表"
    subtitle="报批报建、设计咨询、三通一平、勘察检测、临设围墙等前期费用从成本科目词典预设。"
    professionalGroup="前期费用"
    returnPath="pre-costs"
    dictionaryKeywords={['前期', '报批', '设计', '三通一平', '勘察', '临设']}
    emptyText="暂无前期费用明细。"
    selectPlaceholder="请选择前期费用科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如建筑面积、场地面积、固定金额、合同金额"
    note="选择成本科目后，自动带出区域/业态、测算依据、单位、税率、分摊方式、土增税和所得税口径。"
  />;
}
