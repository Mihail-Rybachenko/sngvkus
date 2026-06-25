import api from '@/services/api';
import { DEMO_MODE } from '@/utils/constants';
import {
  exportPackagingSidesToDataUrls,
  type RecipeBackInfo,
} from '@/utils/packagingSnapshot';

export type { RecipeBackInfo } from '@/utils/packagingSnapshot';

export async function loadPackagingPreviewForPresentation(
  projectId: string | null
): Promise<{ front: string; back: string } | null> {
  if (!projectId) return null;

  let bundleJson: string | null = null;
  let recipeInfo: RecipeBackInfo | undefined;
  let deficits: string[] = [];

  if (DEMO_MODE) {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const p = projects.find((x: { id?: string | number }) => String(x.id) === String(projectId));
    bundleJson = (p?.packaging?.canvasData as string | undefined) || null;
    const r = p?.recipe;
    const c = r?.constructor || {};
    const pack = Number(String(c.packagingSize || '').replace(/[^\d]/g, '')) || 40;
    if (r?.nutritionalValue) {
      recipeInfo = {
        productType: r.productType,
        baseMatrix: c.baseMatrix,
        thermalMethod: c.thermalMethod,
        proteins: r.nutritionalValue.proteins,
        fats: r.nutritionalValue.fats,
        carbohydrates: r.nutritionalValue.carbohydrates,
        calories: r.nutritionalValue.calories,
        complianceIssues: r.compliance?.issues || [],
        packWeightGrams: pack,
      };
    }
    const analysisEls = p?.analysis?.elements || [];
    deficits = analysisEls
      .filter((e: { balanceStatus?: string; deficiency?: boolean }) => e?.balanceStatus === 'deficit' || e?.deficiency)
      .map((e: { name?: string }) => String(e?.name || '').trim())
      .filter(Boolean);
  } else {
    const [packRes, recRes, anRes] = await Promise.allSettled([
      api.get(`/projects/${projectId}/packaging`),
      api.get(`/projects/${projectId}/recipe`),
      api.get(`/analysis/project/${projectId}/latest`),
    ]);
    if (packRes.status === 'fulfilled' && typeof packRes.value?.data?.canvasData === 'string') {
      bundleJson = packRes.value.data.canvasData;
    }
    if (recRes.status === 'fulfilled') {
      const r = recRes.value?.data || {};
      const c = r.constructor || {};
      const pack = Number(String(c.packagingSize || '').replace(/[^\d]/g, '')) || 40;
      if (r?.nutritionalValue) {
        recipeInfo = {
          productType: r.productType,
          baseMatrix: c.baseMatrix,
          thermalMethod: c.thermalMethod,
          proteins: r?.nutritionalValue?.proteins,
          fats: r?.nutritionalValue?.fats,
          carbohydrates: r?.nutritionalValue?.carbohydrates,
          calories: r?.nutritionalValue?.calories,
          complianceIssues: r?.compliance?.issues || [],
          packWeightGrams: pack,
        };
      }
    }
    if (anRes.status === 'fulfilled') {
      const elements = anRes.value?.data?.elements || [];
      deficits = elements
        .filter((e: { balanceStatus?: string; deficiency?: boolean }) => e?.balanceStatus === 'deficit' || e?.deficiency)
        .map((e: { name?: string }) => String(e?.name || '').trim())
        .filter(Boolean);
    }
  }

  if (!bundleJson) return null;
  return exportPackagingSidesToDataUrls(bundleJson, recipeInfo, deficits);
}
