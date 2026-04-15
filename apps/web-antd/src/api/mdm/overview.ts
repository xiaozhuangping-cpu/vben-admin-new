import { requestClient } from '#/api/request';

import { withRequestCache } from './_cache';
import {
  getDistributionSchemeListApi,
  getDistributionTargetListApi,
} from './distribution';
import { getDynamicMasterDataRecordsApi } from './master-data';
import { getModelDefinitionListApi } from './model-definition';
import { getThemeListApi } from './theme';

export interface MdmOverviewCardStats {
  modelCount: number;
  schemeCount: number;
  targetCount: number;
  themeCount: number;
}

export interface MdmOverviewMonthlyIncrement {
  count: number;
  month: string;
}

export interface MdmOverviewThemeDistributionItem {
  modelCount: number;
  themeId: string;
  themeName: string;
}

export interface MdmOverviewDashboard {
  cards: MdmOverviewCardStats;
  monthlyIncrements: MdmOverviewMonthlyIncrement[];
  themeModelDistribution: MdmOverviewThemeDistributionItem[];
}

const DEFAULT_THEME_NAME = 'Uncategorized';

function normalizeDashboardPayload(payload: any) {
  return {
    cards: {
      modelCount: Number(payload?.cards?.modelCount ?? 0),
      schemeCount: Number(payload?.cards?.schemeCount ?? 0),
      targetCount: Number(payload?.cards?.targetCount ?? 0),
      themeCount: Number(payload?.cards?.themeCount ?? 0),
    },
    monthlyIncrements: Array.isArray(payload?.monthlyIncrements)
      ? payload.monthlyIncrements.map((item: any) => ({
          count: Number(item?.count ?? 0),
          month: String(item?.month ?? ''),
        }))
      : [],
    themeModelDistribution: Array.isArray(payload?.themeModelDistribution)
      ? payload.themeModelDistribution.map((item: any) => ({
          modelCount: Number(item?.modelCount ?? 0),
          themeId: String(item?.themeId ?? ''),
          themeName: String(item?.themeName ?? ''),
        }))
      : [],
  } satisfies MdmOverviewDashboard;
}

function shouldFallbackToClientAggregation(error: any) {
  const responseData = error?.response?.data;
  const message = [
    responseData?.code,
    responseData?.details,
    responseData?.error,
    responseData?.hint,
    responseData?.message,
    error?.message,
  ]
    .filter((item) => item !== undefined && item !== null && item !== '')
    .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
    .join(' | ')
    .toLowerCase();

  return (
    (message.includes('get_mdm_overview_dashboard') ||
      message.includes('public.get_mdm_overview_dashboard')) &&
    (message.includes('schema cache') ||
      message.includes('could not find') ||
      message.includes('without parameters') ||
      message.includes('pgrst202'))
  );
}

function getRecentMonthKeys() {
  const months: string[] = [];
  const today = new Date();

  for (let index = 11; index >= 0; index -= 1) {
    const monthDate = new Date(
      today.getFullYear(),
      today.getMonth() - index,
      1,
    );
    const month = `${monthDate.getMonth() + 1}`.padStart(2, '0');
    months.push(`${monthDate.getFullYear()}-${month}`);
  }

  return months;
}

async function buildMonthlyIncrements(tableNames: string[]) {
  const monthKeys = getRecentMonthKeys();
  const monthMap = new Map(monthKeys.map((month) => [month, 0]));

  await Promise.all(
    tableNames.map(async (tableName) => {
      try {
        const result = await getDynamicMasterDataRecordsApi(tableName, {
          order: 'created_at.desc',
          page: 1,
          pageSize: 1000,
        });

        for (const item of result.items) {
          const createdAt = String(item?.created_at ?? '').trim();
          const month = createdAt.slice(0, 7);

          if (!monthMap.has(month)) {
            continue;
          }

          monthMap.set(month, Number(monthMap.get(month) ?? 0) + 1);
        }
      } catch {
        // Ignore a single table failure so the overview can still load.
      }
    }),
  );

  return monthKeys.map((month) => ({
    count: Number(monthMap.get(month) ?? 0),
    month,
  }));
}

async function buildClientOverviewDashboard(): Promise<MdmOverviewDashboard> {
  const [
    { items: themes, total: themeTotal },
    { items: allModels },
    targets,
    schemes,
  ] = await Promise.all([
    getThemeListApi({ pageSize: 1000 }),
    getModelDefinitionListApi({
      includeHistory: true,
      pageSize: 1000,
    }),
    getDistributionTargetListApi({ pageSize: 1000 }),
    getDistributionSchemeListApi({ pageSize: 1000 }),
  ]);

  const models = allModels.filter((item: any) => item.status !== 'history');
  const themeNameMap = new Map(
    themes.map((item: any) => [
      String(item.id ?? ''),
      String(item.name ?? DEFAULT_THEME_NAME),
    ]),
  );
  const themeModelMap = new Map<string, MdmOverviewThemeDistributionItem>();

  for (const model of models) {
    const themeId = String(model.themeId ?? '');
    const themeName = themeNameMap.get(themeId) ?? DEFAULT_THEME_NAME;
    const current = themeModelMap.get(themeId) ?? {
      modelCount: 0,
      themeId,
      themeName,
    };

    current.modelCount += 1;
    themeModelMap.set(themeId, current);
  }

  const monthlyIncrements = await buildMonthlyIncrements(
    models
      .filter((item: any) => item.status === 'published' && item.tableName)
      .map((item: any) => String(item.tableName))
      .filter(Boolean),
  );

  return {
    cards: {
      modelCount: models.length,
      schemeCount: Number(schemes.total ?? schemes.items.length ?? 0),
      targetCount: Number(targets.total ?? targets.items.length ?? 0),
      themeCount: Number(themeTotal ?? themes.length ?? 0),
    },
    monthlyIncrements,
    themeModelDistribution: [...themeModelMap.values()].toSorted(
      (left, right) =>
        right.modelCount - left.modelCount ||
        left.themeName.localeCompare(right.themeName),
    ),
  };
}

export async function getMdmOverviewDashboardApi() {
  return withRequestCache('mdm_overview:dashboard', {}, async () => {
    try {
      const response = await requestClient.post<any>(
        '/supabase-mdm/rpc/get_mdm_overview_dashboard',
        {},
        {
          responseReturn: 'raw',
        },
      );

      const payload = response.data?.data ?? response.data ?? {};
      return normalizeDashboardPayload(payload);
    } catch (error: any) {
      if (!shouldFallbackToClientAggregation(error)) {
        throw error;
      }

      return await buildClientOverviewDashboard();
    }
  });
}
