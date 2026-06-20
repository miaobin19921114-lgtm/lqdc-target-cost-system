import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function OutdoorPipeDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="室外管网明细"
    eyebrow="室外管网明细表"
    subtitle="室外综合管网、给水、雨污水、消防管网、强弱电外线、燃气、海绵城市等科目从V60词典预设。"
    professionalGroup="室外管网明细"
    returnPath="outdoor-pipe-details"
    dictionaryKeywords={['室外管网', '综合管网', '给水', '雨水', '污水', '消防', '强电', '弱电', '燃气', '海绵城市']}
    emptyText="暂无室外管网明细。"
    selectPlaceholder="请选择室外管网科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如景观面积、红线面积、管线长度、户数、固定金额"
    note="室外管网原则上项目整体共用；能明确服务对象的可直接归属，不能直接归属时按建筑面积或可售面积分摊。"
  />;
}
