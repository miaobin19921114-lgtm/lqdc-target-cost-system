import { ProfessionalDetailPage } from '@/components/professional-detail-page';

export const dynamic = 'force-dynamic';

export default async function FitoutDetailsPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  return <ProfessionalDetailPage
    projectId={params.id}
    saved={searchParams?.saved}
    title="精装修明细"
    eyebrow="精装修明细表"
    subtitle="大堂、标准层公区、电梯厅、地下大堂、售楼部样板间等精装修科目全部从词典预设。"
    professionalGroup="精装修明细"
    returnPath="fitout-details"
    dictionaryKeywords={['精装', '装修', '大堂', '公区', '售楼部', '样板间']}
    emptyText="暂无精装修明细。"
    selectPlaceholder="请选择精装修科目"
    detailPlaceholder="自动带出四级/明细科目"
    measurePlaceholder="如大堂精装面积、标准层公区面积、电梯厅面积"
    note="选择成本科目后，自动带出区域/业态、精装位置、测算依据、单位、税率和分摊口径。"
  />;
}
