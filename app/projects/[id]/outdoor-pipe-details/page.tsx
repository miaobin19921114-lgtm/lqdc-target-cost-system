import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function OutdoorPipeDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="室外管网明细"
    eyebrow="室外管网明细表"
    subtitle="室外给排水、电气外网、弱电外网等科目从词典预设。"
    professionalGroup="室外管网明细"
    returnPath="outdoor-pipe-details"
    dictionaryKeywords={['室外管网', '管网', '给水', '排水', '外网']}
    emptyText="暂无室外管网明细。"
    selectPlaceholder="请选择室外管网科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如景观面积、管线长度、建筑面积、固定金额"
    note="选择成本科目后，自动带出测算依据、单位、税率、适用业态和分摊口径。"
  />;
}
