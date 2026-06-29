import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEditableActiveVersion } from '@/lib/project-version';

const toInt = (form: FormData, name: string) => Math.max(0, Math.floor(Number(form.get(name) || 0)));
const toNumber = (form: FormData, name: string) => Number(form.get(name) || 0);

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const { version, locked } = await getEditableActiveVersion(params.id);
  const baseUrl = getBaseUrl(request);
  if (!version) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/parking?saved=0`, 303);
  if (locked) return NextResponse.redirect(`${baseUrl}/projects/${params.id}/parking?locked=1`, 303);

  const undergroundPropertyParkingCount = toInt(form, 'undergroundPropertyParkingCount');
  const undergroundUseRightParkingCount = toInt(form, 'undergroundUseRightParkingCount');
  const civilDefenseParkingCount = toInt(form, 'civilDefenseParkingCount');
  const aboveGroundParkingCount = toInt(form, 'aboveGroundParkingCount');
  const chargingPileCount = toInt(form, 'chargingPileCount');
  const fastChargingPileCount = toInt(form, 'fastChargingPileCount');
  const slowChargingPileCount = toInt(form, 'slowChargingPileCount');
  const reservedChargingPileCount = toInt(form, 'reservedChargingPileCount');
  const parkingCount = undergroundPropertyParkingCount + undergroundUseRightParkingCount + civilDefenseParkingCount + aboveGroundParkingCount;
  const chargingPileRatio = parkingCount ? chargingPileCount / parkingCount : 0;

  await prisma.project.update({
    where: { id: params.id },
    data: {
      parkingCount,
      undergroundPropertyParkingCount,
      undergroundUseRightParkingCount,
      civilDefenseParkingCount,
      aboveGroundParkingCount,
      chargingPileCount,
      fastChargingPileCount,
      slowChargingPileCount,
      reservedChargingPileCount,
      chargingPileRatio,
      parkingPowerCapacity: toNumber(form, 'parkingPowerCapacity'),
      chargingIncludedInParkingPrice: form.get('chargingIncludedInParkingPrice') === 'on',
      chargingSeparateCostMeasure: form.get('chargingSeparateCostMeasure') === 'on',
      parkingRemark: String(form.get('parkingRemark') || '')
    }
  });

  return NextResponse.redirect(`${baseUrl}/projects/${params.id}/parking?saved=1`, 303);
}
