import { NextResponse } from 'next/server';
import { trashProject } from '@/lib/project-service';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData().catch(() => null);
  await trashProject(params.id, { deletedBy: null, deleteReason: form ? String(form.get('deleteReason') || '').trim() : null });
  return NextResponse.redirect(`${getBaseUrl(request)}/projects?deleted=1`, 303);
}
