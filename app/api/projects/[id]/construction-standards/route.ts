import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rebuildProjectCostDictionary } from '@/lib/rebuild-project-cost-dictionary';
import { getEditableActiveVersion } from '@/lib/project-version';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function toNumber(form: FormData, name: string) {
  const value = Number(clean(form, name));
  return Number.isFinite(value) ? value : 0;
}

function toBool(form: FormData, name: string) {
  return form.get(name) === 'on' || form.get(name) === 'true';
}

function optionalText(form: FormData, name: string) {
  return clean(form, name) || null;
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const { version, locked } = await getEditableActiveVersion(params.id);
  if (!version) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/construction-standards?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/construction-standards?locked=1`, 303);

  await prisma.project.update({
    where: { id: params.id },
    data: {
      isPrefabricated: toBool(form, 'isPrefabricated'),
      prefabricatedScope: optionalText(form, 'prefabricatedScope'),
      prefabricationRate: toNumber(form, 'prefabricationRate'),
      prefabricatedSystem: optionalText(form, 'prefabricatedSystem'),

      residentialPublicFitoutStandard: clean(form, 'residentialPublicFitoutStandard') || '标准',
      undergroundLobbyFitoutStandard: clean(form, 'undergroundLobbyFitoutStandard') || '标准',
      residentialFitoutDelivery: toBool(form, 'residentialFitoutDelivery'),
      residentialFitoutType: clean(form, 'residentialFitoutType') || '硬装',
      residentialFitoutStandard: clean(form, 'residentialFitoutStandard') || '毛坯',

      commercialPublicFitout: toBool(form, 'commercialPublicFitout'),
      commercialPublicFitoutStandard: clean(form, 'commercialPublicFitoutStandard') || '标准',
      shopDeliveryStandard: clean(form, 'shopDeliveryStandard') || '毛坯',
      basementQualityUpgrade: toBool(form, 'basementQualityUpgrade'),
      basementQualityStandard: clean(form, 'basementQualityStandard') || '基础美化',
      propertyFitout: toBool(form, 'propertyFitout'),
      communityFitout: toBool(form, 'communityFitout'),
      supportFitout: toBool(form, 'supportFitout'),
      hasSalesOffice: toBool(form, 'hasSalesOffice'),
      salesOfficeFitoutType: clean(form, 'salesOfficeFitoutType') || '硬装+软装',
      hasShowFlat: toBool(form, 'hasShowFlat'),
      showFlatFitoutType: clean(form, 'showFlatFitoutType') || '全部',

      heatingEnabled: toBool(form, 'heatingEnabled'),
      heatingScope: optionalText(form, 'heatingScope'),
      heatingType: optionalText(form, 'heatingType')
    }
  });

  await rebuildProjectCostDictionary(params.id);

  return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/construction-standards?saved=1`, 303);
}
