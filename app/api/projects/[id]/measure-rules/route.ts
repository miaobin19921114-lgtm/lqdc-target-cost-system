import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeVersionStage } from '@/lib/version-stage';

function clean(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

function numberFrom(form: FormData, name: string, fallback = 0) {
  const raw = clean(form, name);
  if (!raw) return fallback;
  const num = Number(raw.replace('%', ''));
  return Number.isFinite(num) ? num : fallback;
}

function boolFrom(form: FormData, name: string) {
  const value = clean(form, name);
  return value === '1' || value === 'true' || value === 'on';
}

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function ruleData(form: FormData) {
  return {
    metricKey: clean(form, 'metricKey') || null,
    metricScope: clean(form, 'metricScope') || 'project',
    quantityUnit: clean(form, 'quantityUnit') || null,
    pricingUnit: clean(form, 'pricingUnit') || null,
    defaultCoefficient: numberFrom(form, 'defaultCoefficient', 1) || 1,
    quantityFormula: clean(form, 'quantityFormula') || null,
    amountFormula: clean(form, 'amountFormula') || null,
    applicableProductType: clean(form, 'applicableProductType') || null,
    priority: numberFrom(form, 'priority', 100) || 100,
    allowManualOverride: boolFrom(form, 'allowManualOverride'),
    remark: clean(form, 'remark') || null,
    enabled: true
  };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData();
  const action = clean(form, 'action') || 'update-rule';
  const ruleId = clean(form, 'ruleId');
  const baseUrl = getBaseUrl(request);
  const stage = normalizeVersionStage(clean(form, 'stage'));
  const q = clean(form, 'q');
  const onlyStage = boolFrom(form, 'onlyStage');
  const backQuery = new URLSearchParams();
  if (stage) backQuery.set('stage', stage);
  if (q) backQuery.set('q', q);
  if (onlyStage) backQuery.set('onlyStage', '1');

  const redirect = (result: string) => {
    backQuery.set(result, '1');
    return NextResponse.redirect(`${baseUrl}/projects/${params.id}/measure-rules?${backQuery.toString()}`, 303);
  };

  if (action === 'create-rule') {
    const costCode = clean(form, 'costCode');
    const basisName = clean(form, 'basisName');
    if (!costCode || !basisName) return redirect('missing');

    const saved = await prisma.measureBasisRule.upsert({
      where: { costCode_basisName: { costCode, basisName } },
      update: ruleData(form),
      create: { costCode, basisName, ...ruleData(form) }
    });

    if (boolFrom(form, 'stageEnabled')) {
      await prisma.measureBasisStageRule.upsert({
        where: { costCode_stage_basisRuleId: { costCode, stage, basisRuleId: saved.id } },
        update: { enabled: true, isDefault: true, priority: saved.priority, remark: `${stage}阶段启用：${basisName}` },
        create: { costCode, stage, basisRuleId: saved.id, priority: saved.priority, isDefault: true, enabled: true, remark: `${stage}阶段启用：${basisName}` }
      });
    }

    backQuery.set('q', costCode);
    return redirect('created');
  }

  if (!ruleId) return redirect('missing');

  const rule = await prisma.measureBasisRule.findUnique({ where: { id: ruleId } });
  if (!rule) return redirect('missing');

  if (action === 'disable-rule') {
    await prisma.measureBasisRule.update({ where: { id: ruleId }, data: { enabled: false } });
    return redirect('disabled');
  }

  if (action === 'toggle-stage') {
    const enabled = boolFrom(form, 'stageEnabled');
    const stageRule = await prisma.measureBasisStageRule.findFirst({ where: { basisRuleId: ruleId, stage } });
    if (stageRule) {
      await prisma.measureBasisStageRule.update({ where: { id: stageRule.id }, data: { enabled, isDefault: enabled ? stageRule.isDefault : false } });
    } else if (enabled) {
      await prisma.measureBasisStageRule.create({ data: { basisRuleId: ruleId, costCode: rule.costCode, stage, priority: rule.priority, isDefault: true, enabled: true, remark: `${stage}阶段启用：${rule.basisName}` } });
    }
    return redirect('stageSaved');
  }

  if (action === 'update-rule') {
    await prisma.measureBasisRule.update({ where: { id: ruleId }, data: ruleData(form) });
    return redirect('saved');
  }

  return redirect('noop');
}
