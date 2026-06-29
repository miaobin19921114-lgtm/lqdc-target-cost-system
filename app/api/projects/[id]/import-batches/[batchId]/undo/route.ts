import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isVersionLocked } from '@/lib/project-version';

export const runtime = 'nodejs';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string; batchId: string } }) {
  const url = baseUrl(request);
  const back = `${url}/projects/${params.id}/import-batches`;
  const batch = await prisma.importBatch.findFirst({
    where: { id: params.batchId }
  });

  if (!batch) return NextResponse.redirect(`${back}?missing=1`, 303);
  const projectVersion = await prisma.projectVersion.findFirst({
    where: { id: batch.projectVersionId, projectId: params.id }
  });

  if (!projectVersion) return NextResponse.redirect(`${back}?missing=1`, 303);
  if (isVersionLocked(projectVersion)) return NextResponse.redirect(`${back}?locked=1`, 303);
  if (batch.status === 'undone') return NextResponse.redirect(`${back}?undone=1&deleted=0`, 303);

  const deleted = await prisma.costLine.deleteMany({ where: { importBatchId: batch.id } });
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: 'undone', remark: `${batch.remark || ''}｜已撤销，删除成本明细${deleted.count}行` }
  });

  return NextResponse.redirect(`${back}?undone=1&deleted=${deleted.count}`, 303);
}
