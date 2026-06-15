import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const productPresets = [
  { category: '住宅类', name: '高层住宅', isSaleable: true, participateAllocation: true },
  { category: '住宅类', name: '小高层住宅', isSaleable: true, participateAllocation: true },
  { category: '住宅类', name: '洋房住宅', isSaleable: true, participateAllocation: true },
  { category: '住宅类', name: '叠拼/联排', isSaleable: true, participateAllocation: true },
  { category: '住宅类', name: '别墅/合院', isSaleable: true, participateAllocation: true },
  { category: '住宅类', name: '中式合院', isSaleable: true, participateAllocation: true },
  { category: '商业商办', name: '底商', isSaleable: true, participateAllocation: true },
  { category: '商业商办', name: '独立商业', isSaleable: true, participateAllocation: true },
  { category: '商业商办', name: '商业街', isSaleable: true, participateAllocation: true },
  { category: '商业商办', name: '商业综合体', isSaleable: true, participateAllocation: true },
  { category: '商业商办', name: '办公', isSaleable: true, participateAllocation: true },
  { category: '商业商办', name: '公寓/LOFT', isSaleable: true, participateAllocation: true },
  { category: '商业商办', name: '酒店', isSaleable: true, participateAllocation: true },
  { category: '商业商办', name: '会所', isSaleable: false, participateAllocation: false },
  { category: '车位储藏', name: '地下产权车位', isSaleable: true, participateAllocation: true },
  { category: '车位储藏', name: '地下使用权车位', isSaleable: true, participateAllocation: true },
  { category: '车位储藏', name: '地上车位', isSaleable: true, participateAllocation: true },
  { category: '车位储藏', name: '人防车位', isSaleable: true, participateAllocation: true },
  { category: '车位储藏', name: '储藏室', isSaleable: true, participateAllocation: true },
  { category: '车位储藏', name: '其他可售', isSaleable: true, participateAllocation: true },
  { category: '配套用房', name: '物业用房', isSaleable: false, participateAllocation: false },
  { category: '配套用房', name: '社区用房', isSaleable: false, participateAllocation: false },
  { category: '配套用房', name: '养老用房', isSaleable: false, participateAllocation: false },
  { category: '配套用房', name: '托育用房', isSaleable: false, participateAllocation: false },
  { category: '配套用房', name: '文化活动用房', isSaleable: false, participateAllocation: false },
  { category: '配套用房', name: '幼儿园', isSaleable: false, participateAllocation: false },
  { category: '配套用房', name: '公厕', isSaleable: false, participateAllocation: false },
  { category: '配套用房', name: '门卫', isSaleable: false, participateAllocation: false },
  { category: '配套用房', name: '设备用房', isSaleable: false, participateAllocation: false },
  { category: '地下空间', name: '高层主楼地下室', isSaleable: false, participateAllocation: true },
  { category: '地下空间', name: '洋房主楼地下室', isSaleable: false, participateAllocation: true },
  { category: '地下空间', name: '别墅地下室', isSaleable: false, participateAllocation: true },
  { category: '地下空间', name: '商业地下室', isSaleable: false, participateAllocation: true },
  { category: '地下空间', name: '非主楼纯地库', isSaleable: false, participateAllocation: true },
  { category: '地下空间', name: '人防地下室', isSaleable: false, participateAllocation: true },
  { category: '专项区域', name: '示范区', isSaleable: false, participateAllocation: false },
  { category: '专项区域', name: '售楼部', isSaleable: false, participateAllocation: false },
  { category: '专项区域', name: '样板间', isSaleable: false, participateAllocation: false },
  { category: '专项区域', name: '私家庭院', isSaleable: false, participateAllocation: false },
  { category: '专项区域', name: '下沉庭院', isSaleable: false, participateAllocation: false },
  { category: '专项区域', name: '水系', isSaleable: false, participateAllocation: false },
  { category: '专项区域', name: '游泳池', isSaleable: false, participateAllocation: false }
];

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

async function getOrCreateVersion(projectId: string) {
  const existing = await prisma.projectVersion.findFirst({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.projectVersion.create({ data: { projectId, name: '初始版本', status: 'draft' } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const version = await getOrCreateVersion(params.id);
  const existing = await prisma.productType.findMany({ where: { projectVersionId: version.id }, select: { name: true } });
  const existingNames = new Set(existing.map((item) => item.name));

  for (const preset of productPresets) {
    if (existingNames.has(preset.name)) continue;
    await prisma.productType.create({
      data: {
        projectVersionId: version.id,
        name: preset.name,
        isSaleable: preset.isSaleable,
        participateAllocation: preset.participateAllocation,
        allocationWeight: preset.participateAllocation ? 1 : 0,
        remark: `模板业态｜${preset.category}`
      }
    });
  }

  const baseUrl = getBaseUrl(request);
  const returnPath = String(form.get('returnPath') || 'products');
  const target = returnPath === 'overview' ? 'overview?preset=1' : 'products?preset=1';
  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/${target}`, 303);
}
