import { NextResponse } from 'next/server';
import { listTrashedProjects } from '@/lib/project-service';

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const result = await listTrashedProjects({
    search: searchParams.get('search') || searchParams.get('q'),
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize') || searchParams.get('limit')
  });
  return NextResponse.json({ success: true, ...result });
}
