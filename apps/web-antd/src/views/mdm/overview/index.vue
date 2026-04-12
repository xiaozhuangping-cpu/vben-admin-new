<script lang="ts" setup>
import type { AnalysisOverviewItem } from '@vben/common-ui';
import type { TabOption } from '@vben/types';

import {
  AnalysisChartCard,
  AnalysisChartsTabs,
  AnalysisOverview,
} from '@vben/common-ui';
import {
  SvgBellIcon,
  SvgCakeIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from '@vben/icons';

// Using the same components from dashboard analytics for now, but with MDM data labels
import AnalyticsTrends from '../../dashboard/analytics/analytics-trends.vue';
import AnalyticsVisitsData from '../../dashboard/analytics/analytics-visits-data.vue';
import AnalyticsVisitsSales from '../../dashboard/analytics/analytics-visits-sales.vue';
import AnalyticsVisitsSource from '../../dashboard/analytics/analytics-visits-source.vue';
import AnalyticsVisits from '../../dashboard/analytics/analytics-visits.vue';

const overviewItems: AnalysisOverviewItem[] = [
  {
    icon: SvgCardIcon,
    title: '全栈类目',
    totalTitle: '家居全品类主题',
    totalValue: 12,
    value: 4,
  },
  {
    icon: SvgCakeIcon,
    title: '设备模型',
    totalTitle: '硬件/IoT组件模型',
    totalValue: 86,
    value: 8,
  },
  {
    icon: SvgDownloadIcon,
    title: '接入总量',
    totalTitle: '联网设备主数据',
    totalValue: 1_250_000,
    value: 8500,
  },
  {
    icon: SvgBellIcon,
    title: '固件更新',
    totalTitle: '待审核版本记录',
    totalValue: 56,
    value: 12,
  },
];

const chartTabs: TabOption[] = [
  {
    label: '数据增长趋势',
    value: 'trends',
  },
  {
    label: '质量评分分布',
    value: 'visits',
  },
];
</script>

<template>
  <div class="p-5">
    <div class="mb-5">
      <h2 class="text-2xl font-bold">JC-MDM 主数据控制台</h2>
      <p class="text-gray-500">
        实时监控主数据模型的生命周期、数据增长及质量健康度。
      </p>
    </div>

    <AnalysisOverview :items="overviewItems" />
    <AnalysisChartsTabs :tabs="chartTabs" class="mt-5">
      <template #trends>
        <AnalyticsTrends />
      </template>
      <template #visits>
        <AnalyticsVisits />
      </template>
    </AnalysisChartsTabs>

    <div class="mt-5 w-full md:flex">
      <AnalysisChartCard
        class="mt-5 md:mt-0 md:mr-4 md:w-1/3"
        title="主题分布概况"
      >
        <AnalyticsVisitsData />
      </AnalysisChartCard>
      <AnalysisChartCard
        class="mt-5 md:mt-0 md:mr-4 md:w-1/3"
        title="数据来源占比"
      >
        <AnalyticsVisitsSource />
      </AnalysisChartCard>
      <AnalysisChartCard class="mt-5 md:mt-0 md:w-1/3" title="数据完整度排行">
        <AnalyticsVisitsSales />
      </AnalysisChartCard>
    </div>
  </div>
</template>
