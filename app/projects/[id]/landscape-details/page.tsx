import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function LandscapeDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="景观工程明细"
    eyebrow="景观工程明细表"
    subtitle="硬景铺装、软景绿化、水景、儿童活动、架空层景观、小品构筑物、景观照明、标识导视等科目从V60词典预设。"
    professionalGroup="景观工程明细"
    returnPath="landscape-details"
    dictionaryKeywords={['景观', '硬景', '软景', '绿化', '水景', '儿童', '架空层', '小品', '照明', '导视']}
    emptyText="暂无景观工程明细。"
    selectPlaceholder="请选择景观工程科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如景观面积、硬景面积、软景面积、水景面积、儿童活动场地面积"
    note="景观工程原则上项目整体共用；硬景按硬景面积、软景按软景面积、水景按水景面积、儿童活动按活动场地面积测算。"
  />;
}
