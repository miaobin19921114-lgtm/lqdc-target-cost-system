import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';
import { getProject, jsonError, trashProject } from '@/lib/project-service';

const toNumber = (value: FormDataEntryValue | null) => Number(value || 0);
const toInt = (value: FormDataEntryValue | null) => Math.round(toNumber(value));

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

async function readDeleteReason(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    return typeof body?.deleteReason === 'string' ? body.deleteReason : null;
  }
  if (contentType.includes('form')) {
    const form = await request.formData().catch(() => null);
    return form ? String(form.get('deleteReason') || '').trim() : null;
  }
  return null;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const result = await getProject(params.id);
  if (!result.ok) return jsonError(result.code, result.message, result.status);
  return NextResponse.json({ success: true, project: result.project });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const result = await trashProject(params.id, { deletedBy: null, deleteReason: await readDeleteReason(request) });
  if (!result.ok) return jsonError(result.code, result.message, result.status);
  return NextResponse.json({ success: true, ...result.result, alreadyDeleted: result.alreadyDeleted || false });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const projectResult = await getProject(params.id);
  if (!projectResult.ok) return NextResponse.redirect(`${getBaseUrl(request)}/projects/${params.id}/overview?deleted=1`, 303);
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
      hasMechanicalParking: form.get('hasMechanicalParking') === 'on' || form.get('hasMechanicalParking') === 'true' || toInt(form.get('mechanicalParkingCount')) > 0,
      mechanicalParkingCount: toInt(form.get('mechanicalParkingCount')),
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
      basementFloorHeight: toNumber(form.get('basementB1Height')) || toNumber(form.get('basementFloorHeight')),
      basementB2FloorHeight: toNumber(form.get('basementB2Height')) || toNumber(form.get('basementB2FloorHeight')),
      basementOtherAvgFloorHeight: toNumber(form.get('basementOtherAvgHeight')) || toNumber(form.get('basementOtherAvgFloorHeight')),
      basementParkingArea: toNumber(form.get('basementParkingArea')),
      mainBuildingUndergroundArea: toNumber(form.get('mainBuildingUndergroundArea')),
      publicArea: toNumber(form.get('publicArea')),
      lobbyArea: toNumber(form.get('lobbyArea')),
      remark: String(form.get('remark') || '')
    }
  });

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/overview?saved=1`, 303);
}
