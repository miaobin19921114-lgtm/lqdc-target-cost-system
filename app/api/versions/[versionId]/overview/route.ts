import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isVersionLocked, VERSION_LOCKED_MESSAGE } from '@/lib/project-version';
import { writeOperationLog } from '@/lib/operation-log';

const metricFields = [
  'basementB1Height',
  'basementB2Height',
  'basementOtherAvgHeight',
  'pedestrianRoadArea',
  'prefabArea',
  'isFineDecorationEnabled',
  'fineDecorationArea',
  'fineDecorationStandard',
  'isCivilDefenseEnabled',
  'isHeatingEnabled',
  'heatingArea',
  'heatingBenefitObject',
  'isAncientBuildingEnabled',
  'ancientBuildingArea',
  'ancientBuildingStandard',
  'isChargingPileEnabled',
  'isDemoAreaEnabled',
  'demoArea'
];

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function b(value: unknown) {
  return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
}

function cleanText(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

async function loadOverview(versionId: string) {
  const version = await prisma.projectVersion.findUnique({ where: { id: versionId }, include: { project: true } });
  if (!version) return null;
  const metrics = await prisma.projectMetricValue.findMany({
    where: { projectId: version.projectId, projectVersionId: versionId, scope: 'project', metricKey: { in: metricFields } }
  });
  const metricMap = new Map(metrics.map((item) => [item.metricKey, item]));
  const value = (key: string) => {
    const metric = metricMap.get(key);
    if (!metric) return undefined;
    return metric.remark ?? Number(metric.value || 0);
  };
  const boolValue = (key: string) => Boolean(n(metricMap.get(key)?.value));
  const project = version.project;
  const softLandscapeArea = n(project.softscapeArea) || n(project.greenArea);

  return {
    version,
    data: {
      ...project,
      softLandscapeArea,
      greenArea: project.greenArea,
      basementFloorCount: project.basementFloors,
      basementB1Height: value('basementB1Height') ?? project.basementFloorHeight,
      basementB2Height: value('basementB2Height') ?? 0,
      basementOtherAvgHeight: value('basementOtherAvgHeight') ?? 0,
      pedestrianRoadArea: value('pedestrianRoadArea') ?? 0,
      vehicleRoadArea: project.roadArea,
      fireRoadAreaIncluded: project.fireRoadArea,
      isPrefabEnabled: project.isPrefabricated,
      prefabArea: value('prefabArea') ?? 0,
      isFineDecorationEnabled: boolValue('isFineDecorationEnabled'),
      fineDecorationArea: value('fineDecorationArea') ?? 0,
      fineDecorationStandard: value('fineDecorationStandard') ?? null,
      isCivilDefenseEnabled: boolValue('isCivilDefenseEnabled') || n(project.civilDefenseArea) > 0,
      civilDefenseArea: project.civilDefenseArea,
      civilDefenseParkingCount: project.civilDefenseParkingCount,
      isHeatingEnabled: project.heatingEnabled || boolValue('isHeatingEnabled'),
      heatingArea: value('heatingArea') ?? 0,
      heatingBenefitObject: value('heatingBenefitObject') ?? project.heatingScope,
      isAncientBuildingEnabled: boolValue('isAncientBuildingEnabled'),
      ancientBuildingArea: value('ancientBuildingArea') ?? 0,
      ancientBuildingStandard: value('ancientBuildingStandard') ?? null,
      isChargingPileEnabled: boolValue('isChargingPileEnabled') || n(project.chargingPileCount) > 0,
      chargingPileCount: project.chargingPileCount,
      chargingPileRatio: project.chargingPileRatio,
      isDemoAreaEnabled: boolValue('isDemoAreaEnabled') || n(project.salesOfficeArea) + n(project.showFlatArea) > 0,
      demoArea: value('demoArea') ?? 0,
      salesOfficeArea: project.salesOfficeArea,
      showFlatArea: project.showFlatArea
    }
  };
}

function validateOverview(body: Record<string, unknown>) {
  const vehicleRoadArea = n(body.vehicleRoadArea ?? body.roadArea);
  const fireRoadAreaIncluded = n(body.fireRoadAreaIncluded ?? body.fireRoadArea);
  if (fireRoadAreaIncluded > vehicleRoadArea) return '消防道路面积不得大于车行道路面积。';

  const basementFloorCount = Math.round(n(body.basementFloorCount ?? body.basementFloors));
  if (basementFloorCount === 2 && (n(body.basementB1Height) <= 0 || n(body.basementB2Height) <= 0)) {
    return '地下室为两层时，必须填写 B1 和 B2 层高。';
  }
  if (basementFloorCount > 2 && n(body.basementOtherAvgHeight) < 0) {
    return '地下室超过两层时，其他层平均层高不得为负。';
  }
  return null;
}

async function saveOverview(versionId: string, body: Record<string, unknown>) {
  const loaded = await loadOverview(versionId);
  if (!loaded) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  if (isVersionLocked(loaded.version) || loaded.version.isLocked) return jsonError('VERSION_LOCKED', VERSION_LOCKED_MESSAGE, 423);

  const validationMessage = validateOverview(body);
  if (validationMessage) return jsonError('VALIDATION_FAILED', validationMessage);

  const projectData: Record<string, unknown> = {};
  const assignNumber = (target: string, source: string) => {
    if (source in body) projectData[target] = n(body[source]);
  };
  const assignInt = (target: string, source: string) => {
    if (source in body) projectData[target] = Math.round(n(body[source]));
  };
  const assignBool = (target: string, source: string) => {
    if (source in body) projectData[target] = b(body[source]);
  };
  const assignText = (target: string, source: string) => {
    if (source in body) projectData[target] = cleanText(body[source]);
  };

  assignNumber('softscapeArea', 'softLandscapeArea');
  if ('softLandscapeArea' in body) projectData.greenArea = n(body.softLandscapeArea);
  assignInt('basementFloors', 'basementFloorCount');
  assignNumber('basementFloorHeight', 'basementB1Height');
  assignNumber('roadArea', 'vehicleRoadArea');
  assignNumber('fireRoadArea', 'fireRoadAreaIncluded');
  assignBool('isPrefabricated', 'isPrefabEnabled');
  assignBool('heatingEnabled', 'isHeatingEnabled');
  assignText('heatingScope', 'heatingBenefitObject');
  assignNumber('civilDefenseArea', 'civilDefenseArea');
  assignInt('civilDefenseParkingCount', 'civilDefenseParkingCount');
  assignInt('chargingPileCount', 'chargingPileCount');
  assignNumber('chargingPileRatio', 'chargingPileRatio');
  assignNumber('salesOfficeArea', 'salesOfficeArea');
  assignNumber('showFlatArea', 'showFlatArea');

  await prisma.$transaction(async (tx) => {
    if (Object.keys(projectData).length) {
      await tx.project.update({ where: { id: loaded.version.projectId }, data: projectData });
      await writeOperationLog(tx, {
        projectId: loaded.version.projectId,
        versionId,
        module: 'project_overview',
        action: 'update_key_metrics',
        targetType: 'Project',
        targetId: loaded.version.projectId,
        beforeData: {
          softLandscapeArea: loaded.data.softLandscapeArea,
          greenArea: loaded.data.greenArea,
          basementFloorCount: loaded.data.basementFloorCount,
          basementB1Height: loaded.data.basementB1Height,
          vehicleRoadArea: loaded.data.vehicleRoadArea,
          fireRoadAreaIncluded: loaded.data.fireRoadAreaIncluded
        },
        afterData: projectData,
        remark: {
          changedFields: Object.keys(projectData),
          source: 'versions_overview_api'
        }
      });
    }

    for (const key of metricFields) {
      if (!(key in body)) continue;
      const raw = body[key];
      const textValue = typeof raw === 'string' && Number.isNaN(Number(raw)) ? cleanText(raw) : null;
      await tx.projectMetricValue.deleteMany({
        where: { projectId: loaded.version.projectId, projectVersionId: versionId, scope: 'project', metricKey: key }
      });
      await tx.projectMetricValue.create({
        data: {
          projectId: loaded.version.projectId,
          projectVersionId: versionId,
          scope: 'project',
          metricKey: key,
          value: typeof raw === 'boolean' ? (raw ? 1 : 0) : textValue ? 0 : n(raw),
          remark: textValue,
          source: 'overview'
        }
      });
    }
  });

  const next = await loadOverview(versionId);
  return NextResponse.json({ success: true, data: next?.data || null });
}

export async function GET(_request: Request, { params }: { params: { versionId: string } }) {
  const loaded = await loadOverview(params.versionId);
  if (!loaded) return jsonError('VERSION_NOT_FOUND', '测算版本不存在。', 404);
  return NextResponse.json({ success: true, data: loaded.data });
}

export async function PUT(request: Request, { params }: { params: { versionId: string } }) {
  const body = await request.json().catch(() => ({}));
  return saveOverview(params.versionId, body);
}

export async function PATCH(request: Request, { params }: { params: { versionId: string } }) {
  const body = await request.json().catch(() => ({}));
  return saveOverview(params.versionId, body);
}
