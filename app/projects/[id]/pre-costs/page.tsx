import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function PreCostsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="前期费用明细"
    eyebrow="前期费用明细表"
    subtitle="报批报建、权籍测绘、专项评价、勘察设计、三通一平、清场移交、临设现场准备等前期费用从V60词典预设。"
    professionalGroup="前期费用"
    returnPath="pre-costs"
    dictionaryKeywords={['前期', '报批', '设计', '三通一平', '勘察', '测绘', '权籍', '清场', '移交', '临设']}
    emptyText="暂无前期费用明细。"
    selectPlaceholder="请选择前期费用科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如建筑面积、红线面积、土地面积、场平面积、临设面积、合同金额"
    note="权籍测绘登记、清场移交、三通一平归前期费；土地款资金占用归财务费用；正式围墙和出入口不在前期费混算。"
  />;
}
