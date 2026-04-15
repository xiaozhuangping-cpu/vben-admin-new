<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { MdmOverviewThemeDistributionItem } from '#/api/mdm/overview';

import { nextTick, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const props = withDefaults(
  defineProps<{
    data?: MdmOverviewThemeDistributionItem[];
  }>(),
  {
    data: () => [],
  },
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

async function renderChart() {
  await nextTick();

  const source = [...(props.data ?? [])]
    .toSorted((left, right) => right.modelCount - left.modelCount)
    .slice(0, 12);
  const labels = source.map((item) => item.themeName);
  const values = source.map((item) => item.modelCount);

  renderEcharts({
    color: ['#13c2c2'],
    grid: {
      bottom: 8,
      containLabel: true,
      left: 16,
      right: 20,
      top: 20,
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      minInterval: 1,
      splitNumber: 4,
      type: 'value',
    },
    yAxis: {
      axisTick: {
        show: false,
      },
      data: labels,
      type: 'category',
    },
    series: [
      {
        barMaxWidth: 22,
        data: values,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
        },
        type: 'bar',
      },
    ],
  });
}

watch(
  () => props.data,
  () => {
    renderChart();
  },
  {
    deep: true,
    immediate: true,
  },
);
</script>

<template>
  <EchartsUI ref="chartRef" class="h-full w-full" />
</template>
