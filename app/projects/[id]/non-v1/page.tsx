import { NonV1Placeholder } from '@/components/non-v1-placeholder';

export const dynamic = 'force-dynamic';

export default function ProjectNonV1Page({ params }: { params: { id: string } }) {
  return <NonV1Placeholder projectId={params.id} />;
}
