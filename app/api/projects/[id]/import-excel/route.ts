import { NextResponse } from 'next/server';
import { getEditableActiveVersion } from '@/lib/project-version';

export const runtime = 'nodejs';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const url = baseUrl(request);
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${url}/projects/${params.id}/export?imported=0`, 303);
  if (locked) return NextResponse.redirect(`${url}/projects/${params.id}/export?locked=1`, 303);

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) {
    return NextResponse.redirect(`${url}/projects/${params.id}/export?missingFile=1`, 303);
  }

  return NextResponse.redirect(`${url}/projects/${params.id}/export?uploaded=1&file=${encodeURIComponent(file.name || 'import.xlsx')}`, 303);
}
