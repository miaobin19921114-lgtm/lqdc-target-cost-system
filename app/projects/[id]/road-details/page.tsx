import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function RoadDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="道路总平明细"
    eyebrow="道路总平明细表"
    subtitle="小区道路、铺装、场地总平、标识划线等科目从成本词典预设。"
    professionalGroup="道路总平明细"
    returnPath="road-details"
    dictionaryKeywords={['道路', '总平', '铺装', '场地', '划线']}
    emptyText="暂无道路总平明细。"
    selectPlaceholder="请选择道路总平科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如道路面积、铺装面积、总平面积"
    note="道路总平按词典预设自动带出测算依据、单位、税率和分摊口径。"
  />;
}
