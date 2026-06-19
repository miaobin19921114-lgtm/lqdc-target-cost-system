import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function BuildingDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="土建明细"
    eyebrow="土建明细表"
    subtitle="桩基、基坑、主体结构、砌体、防水、保温、门窗栏杆、装配式等全部从成本科目词典预设；装配式按项目概况配置控制显示。"
    professionalGroup="土建明细"
    returnPath="building-details"
    dictionaryKeywords={['土建', '桩基', '主体', '砌体', '防水', '保温', '门窗', '装配式']}
    emptyText="暂无土建明细。"
    selectPlaceholder="请选择土建科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如建筑面积、基底面积、外墙面积、门窗面积、装配式建筑面积"
    note="选择成本科目后，自动带出一二三四级路径、末级明细、区域/业态、测算依据、单位、税率、分摊口径、土增税和所得税口径。"
  />;
}
