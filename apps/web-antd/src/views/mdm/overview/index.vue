<script lang="ts" setup>
import type { AnalysisOverviewItem } from '@vben/common-ui';

import { computed, onMounted, ref } from 'vue';

import { AnalysisChartCard, AnalysisOverview } from '@vben/common-ui';
import {
  SvgBellIcon,
  SvgCakeIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from '@vben/icons';

import { message } from 'ant-design-vue';

import { getMdmOverviewDashboardApi } from '#/api/mdm/overview';

import MonthlyIncrementChart from './modules/monthly-increment-chart.vue';
import ThemeModelDistributionChart from './modules/theme-model-distribution-chart.vue';

const loading = ref(false);
const dashboard = ref({
  cards: {
    modelCount: 0,
    schemeCount: 0,
    targetCount: 0,
    themeCount: 0,
  },
  monthlyIncrements: [],
  themeModelDistribution: [],
});

const overviewItems = computed<AnalysisOverviewItem[]>(() => [
  {
    icon: SvgCardIcon,
    title: '数据主题',
    totalTitle: '当前数据主题总数',
    totalValue: dashboard.value.cards.themeCount,
    value: dashboard.value.cards.themeCount,
  },
  {
    icon: SvgCakeIcon,
    title: '数据模型',
    totalTitle: '当前数据模型总数',
    totalValue: dashboard.value.cards.modelCount,
    value: dashboard.value.cards.modelCount,
  },
  {
    icon: SvgDownloadIcon,
    title: '接入系统',
    totalTitle: '当前分发目标总数',
    totalValue: dashboard.value.cards.targetCount,
    value: dashboard.value.cards.targetCount,
  },
  {
    icon: SvgBellIcon,
    title: '订阅数',
    totalTitle: '当前分发方案总数',
    totalValue: dashboard.value.cards.schemeCount,
    value: dashboard.value.cards.schemeCount,
  },
]);

async function loadDashboard() {
  loading.value = true;

  try {
    dashboard.value = await getMdmOverviewDashboardApi();
  } catch (error: any) {
    message.error(error?.message || '加载概览统计失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadDashboard();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-5">
      <h2 class="text-2xl font-bold">JC-MDM 主数据控制台</h2>
      <p class="text-gray-500">
        实时监控数据主题、数据模型、接入系统、订阅方案以及主数据增量变化情况。
      </p>
    </div>

    <AnalysisOverview :items="overviewItems" />

    <div class="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
      <AnalysisChartCard title="主数据增量分布">
        <div
          v-if="loading"
          class="text-text-secondary flex h-[320px] items-center justify-center text-sm"
        >
          正在加载统计数据...
        </div>
        <MonthlyIncrementChart
          v-else
          :data="dashboard.monthlyIncrements"
          class="h-[320px]"
        />
      </AnalysisChartCard>

      <AnalysisChartCard title="主题模型分布">
        <div
          v-if="loading"
          class="text-text-secondary flex h-[320px] items-center justify-center text-sm"
        >
          正在加载统计数据...
        </div>
        <ThemeModelDistributionChart
          v-else
          :data="dashboard.themeModelDistribution"
          class="h-[320px]"
        />
      </AnalysisChartCard>
    </div>
  </div>
</template>
