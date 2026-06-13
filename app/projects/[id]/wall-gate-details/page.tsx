import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function WallGateDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="围墙出入口明细"
    eyebrow="围墙出入口明细表"
    subtitle="围墙、临设围挡、出入口、门岗等科目从成本词典预设。"
    professionalGroup="围墙出入口明细"
    returnPath="wall-gate-details"
    dictionaryKeywords={['围墙', '出入口', '门岗', '围挡', '临设']}
    emptyText="暂无围墙出入口明细。"
    selectPlaceholder="请选择围墙出入口科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="围墙按周界长度，出入口按数量"
    note="围墙按周界长度测算，出入口按数量测算；区域、税率、分摊口径按词典自动预设。"
  />;
}
