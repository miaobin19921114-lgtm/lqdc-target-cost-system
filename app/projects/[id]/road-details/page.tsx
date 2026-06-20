import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function RoadDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="道路总平明细"
    eyebrow="道路总平明细表"
    subtitle="道路土方及基层、车行道路面层、消防道路、地面停车、路缘石、交通标识标线、市政接驳等科目从V60词典预设。"
    professionalGroup="道路总平明细"
    returnPath="road-details"
    dictionaryKeywords={['道路', '总平', '消防道路', '沥青', '车位', '交安', '标线', '划线', '市政接驳']}
    emptyText="暂无道路总平明细。"
    selectPlaceholder="请选择道路总平科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如道路面积、消防道路面积、沥青道路面积、地上停车位数量"
    note="道路总平原则上项目整体共用；道路按道路面积、消防道路按消防道路面积、沥青路面按沥青道路面积、地面停车按地上停车位数量测算。"
  />;
}
