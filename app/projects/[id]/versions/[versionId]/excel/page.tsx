import { redirect } from 'next/navigation';

export default function ProjectVersionExcelPage({ params }: { params: { id: string; versionId: string } }) {
  redirect(`/projects/${params.id}/excel?versionId=${params.versionId}`);
}
