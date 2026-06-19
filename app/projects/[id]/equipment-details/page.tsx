import { ProfessionalDetailPage } from '@/components/professional-detail-page';
import { rebuildProjectCostDictionary } from '@/lib/rebuild-project-cost-dictionary';

export const dynamic = 'force-dynamic';

export default async function EquipmentDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  await rebuildProjectCostDictionary(params.id);

  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="设备明细"
    eyebrow="设备明细表"
    subtitle="电梯、水泵、风机、配电设备、采暖设备、充电桩设备本体等科目从成本科目词典预设，并按项目概况配置控制。"
    professionalGroup="设备明细"
    returnPath="equipment-details"
    dictionaryKeywords={['设备', '电梯', '水泵', '风机', '采暖', '充电桩']}
    emptyText="暂无设备明细。"
    selectPlaceholder="请选择设备科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如单元数量、台套数量、快充数量、慢充数量"
    note="充电桩设备只记录快充、慢充、控制箱及设备本体；管线和安装调试进入安装明细表。"
  />;
}
