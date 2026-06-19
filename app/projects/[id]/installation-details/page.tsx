import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function InstallationDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="安装明细"
    eyebrow="安装明细表"
    subtitle="给排水、电气弱电、消防暖通、采暖、充电桩安装等科目从成本科目词典预设，并按项目概况配置控制。"
    professionalGroup="安装明细"
    returnPath="installation-details"
    dictionaryKeywords={['安装', '给排水', '电气', '弱电', '消防', '暖通', '采暖', '充电桩']}
    emptyText="暂无安装明细。"
    selectPlaceholder="请选择安装科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如建筑面积、管线长度、点位数量、充电桩数量"
    note="充电桩安装只记录管线、桥架、配电接入和安装调试；设备本体进设备明细表。"
  />;
}
