import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function LandscapeDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="景观工程明细"
    eyebrow="景观工程明细表"
    subtitle="硬景、软景、水景、小品、照明等景观工程科目从成本词典预设。"
    professionalGroup="景观工程明细"
    returnPath="landscape-details"
    dictionaryKeywords={['景观', '硬景', '软景', '绿化', '小品']}
    emptyText="暂无景观工程明细。"
    selectPlaceholder="请选择景观工程科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如景观面积、硬景面积、软景面积"
    note="景观工程按词典预设自动带出硬景、软景、综合景观等测算依据、单位、税率和分摊口径。"
  />;
}
