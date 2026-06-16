import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  const found = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
}

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function redirectTo(request: Request, projectId: string, flag: string) {
  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${projectId}?${flag}=1`, 303);
}

function defaultTemplateName(projectName: string, stage?: string | null) {
  const suffix = stage ? `-${stage}` : '';
  return `${projectName}${suffix}模板`;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const userId = cookieValue(request, 'lqdc_session');
  if (!userId) return redirectTo(request, params.id, 'templateMissing');

  const form = await request.formData();
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return redirectTo(request, params.id, 'templateMissing');

  const version = project.activeVersionId
    ? await prisma.projectVersion.findFirst({
      where: { id: project.activeVersionId, projectId: params.id },
      include: { products: true, costRules: true, taxes: true }
    })
    : await prisma.projectVersion.findFirst({
      where: { projectId: params.id },
      orderBy: { createdAt: 'asc' },
      include: { products: true, costRules: true, taxes: true }
    });

  if (!version) return redirectTo(request, params.id, 'templateMissing');

  const name = clean(form, 'name') || defaultTemplateName(project.name, version.stage);
  const type = clean(form, 'type') || '项目沉淀模板';
  const activeProducts = version.products.filter((item) => item.isActive);
  const now = new Date().toISOString().slice(0, 10);

  const taxRules = version.taxes ? [
    { name: '增值税', rate: version.taxes.vatRate, scope: '销售收入', remark: '项目反向沉淀', sortOrder: 10 },
    { name: '城建税', rate: version.taxes.urbanMaintenanceRate, scope: '增值税', remark: '项目反向沉淀', sortOrder: 20 },
    { name: '教育费附加', rate: version.taxes.educationSurchargeRate, scope: '增值税', remark: '项目反向沉淀', sortOrder: 30 },
    { name: '地方教育附加', rate: version.taxes.localEducationSurchargeRate, scope: '增值税', remark: '项目反向沉淀', sortOrder: 40 },
    { name: '企业所得税', rate: version.taxes.corporateIncomeTaxRate, scope: '利润总额', remark: '项目反向沉淀', sortOrder: 50 },
    { name: '土地增值税', rate: version.taxes.landValueAddedTaxRate, scope: '清算增值额', remark: '项目反向沉淀', sortOrder: 60 }
  ] : [];

  await prisma.template.create({
    data: {
      ownerId: userId,
      baseTemplateId: null,
      name,
      type,
      description: clean(form, 'description') || `由项目「${project.name}」当前版本「${version.name}」于 ${now} 反向沉淀生成`,
      isDefault: false,
      isActive: true,
      sortOrder: 0,
      products: {
        create: activeProducts.map((item, index) => ({
          category: item.remark?.includes('模板业态｜') ? item.remark.split('模板业态｜')[1] || '其他' : '项目业态',
          name: item.name,
          isSaleable: item.isSaleable,
          participateAllocation: item.participateAllocation,
          allocationWeight: item.allocationWeight,
          sortOrder: index + 1,
          remark: item.remark || '项目反向沉淀',
          isActive: true
        }))
      },
      costRules: {
        create: version.costRules.map((item) => ({
          costCode: item.costCode,
          category: item.category,
          subjectName: item.subjectName,
          sourceTable: item.sourceTable,
          measureBasis: item.measureBasis,
          unit: item.unit,
          defaultTaxRate: item.defaultTaxRate,
          allocationMethod: item.allocationMethod,
          sortOrder: item.sortOrder,
          remark: item.remark || '项目反向沉淀'
        }))
      },
      taxRules: { create: taxRules }
    }
  });

  return redirectTo(request, params.id, 'templateSaved');
}
