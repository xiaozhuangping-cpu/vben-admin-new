<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { MdmOverviewMonthlyIncrement } from '#/api/mdm/overview';

import { nextTick, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const props = withDefaults(
  defineProps<{
    data?: MdmOverviewMonthlyIncrement[];
  }>(),
  {
    data: () => [],
  },
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

async function renderChart() {
  await nextTick();

  const source = props.data ?? [];
  const months = source.map((item) => item.month);
  const values = source.map((item) => item.count);
  const maxValue = Math.max(...values, 0);

  renderEcharts({
    color: ['#1677ff'],
    grid: {
      bottom: 24,
      containLabel: true,
      left: 16,
      right: 16,
      top: 20,
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      axisTick: {
        show: false,
      },
      data: months,
      type: 'category',
    },
    yAxis: {
      minInterval: 1,
      max: maxValue > 0 ? undefined : 10,
      splitNumber: 4,
      type: 'value',
    },
    series: [
      {
        barMaxWidth: 48,
        data: values,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
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
