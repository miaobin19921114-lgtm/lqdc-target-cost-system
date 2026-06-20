import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function WallGateDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="围墙出入口明细"
    eyebrow="围墙出入口明细表"
    subtitle="正式围墙、围墙附属、正式出入口、车辆出入口道闸、临设围挡、验收移交等科目从V60词典预设。"
    professionalGroup="围墙出入口明细"
    returnPath="wall-gate-details"
    dictionaryKeywords={['围墙', '出入口', '门岗', '围挡', '临设', '道闸', '门禁']}
    emptyText="暂无围墙出入口明细。"
    selectPlaceholder="请选择围墙出入口科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="围墙按周界长度，正式出入口按数量，临时出入口按临时数量"
    note="围墙、出入口、临设围挡分开测算；围墙按周界长度，出入口按正式/临时数量，临设围挡按临设范围或周界长度。"
  />;
}
