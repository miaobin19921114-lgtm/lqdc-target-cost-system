import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';

const toNumber = (value: FormDataEntryValue | null) => Number(value || 0);
const toInt = (value: FormDataEntryValue | null) => Math.round(toNumber(value));

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const { version, locked } = await getEditableActiveVersion(params.id);
  const baseUrl = getBaseUrl(request);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/overview?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/overview?locked=1`, 303);

  await prisma.project.update({
    where: { id: params.id },
    data: {
      name: String(form.get('name') || '未命名项目'),
      city: String(form.get('city') || ''),
      district: String(form.get('district') || ''),
      landArea: toNumber(form.get('landArea')),
      plotRatio: toNumber(form.get('plotRatio')),
      totalBuildingArea: toNumber(form.get('totalBuildingArea')),
      capacityBuildingArea: toNumber(form.get('capacityBuildingArea')),
      aboveGroundArea: toNumber(form.get('aboveGroundArea')),
      undergroundArea: toNumber(form.get('undergroundArea')),
      saleableArea: toNumber(form.get('saleableArea')),
      nonSaleableArea: toNumber(form.get('nonSaleableArea')),
      parkingCount: toInt(form.get('parkingCount')),
      buildingCount: toInt(form.get('buildingCount')),
      unitCount: toInt(form.get('unitCount')),
      basementFloors: toInt(form.get('basementFloors')),
      aboveGroundFloors: toInt(form.get('aboveGroundFloors')),
      sitePerimeter: toNumber(form.get('sitePerimeter')),
      landscapeArea: toNumber(form.get('landscapeArea')),
      hardscapeArea: toNumber(form.get('hardscapeArea')),
      softscapeArea: toNumber(form.get('softscapeArea')),
      greenArea: toNumber(form.get('greenArea')),
      roadArea: toNumber(form.get('roadArea')),
      standardFloorArea: toNumber(form.get('standardFloorArea')),
      basementParkingArea: toNumber(form.get('basementParkingArea')),
      mainBuildingUndergroundArea: toNumber(form.get('mainBuildingUndergroundArea')),
      publicArea: toNumber(form.get('publicArea')),
      lobbyArea: toNumber(form.get('lobbyArea')),
      remark: String(form.get('remark') || '')
    }
  });

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/overview?saved=1`, 303);
}
