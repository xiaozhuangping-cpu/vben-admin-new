<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useColumns } from './data';
import FormModal from './modules/form.vue';

const THEME_NAMES = [
  '智能光感系统',
  '全屋安防监控',
  '厨房净水中心',
  '影音娱乐交互',
  '温感气候控制',
  '穿戴式健康设备',
  '智慧楼宇对讲',
  '车家联动套件',
];

const MOCK_THEMES = Array.from({ length: 30 }).map((_, index) => {
  const themeName = THEME_NAMES[index % THEME_NAMES.length];
  return {
    id: `${index + 1}`,
    code: `THEME_${(index + 101).toString(16).toUpperCase()}`,
    name:
      index < THEME_NAMES.length ? themeName : `${themeName} (扩展-${index})`,
    description: `涵盖了 ${themeName} 相关的传感器元数据、逻辑控制器及外部 API 定义。`,
    order: index + 1,
  };
});

const [Form, formModalApi] = useVbenModal({
  connectedComponent: FormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_THEMES,
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleDelete(row: any) {
  message.warning(`删除数据主题: ${row.name}`);
}

function refreshGrid() {
  message.success('数据已更新');
  // gridApi.query();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="对主数据资产进行宏观分类，为后续的模型构建提供维度支撑。"
    title="数据主题管理"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate"> 新增主题 </Button>
    </template>

    <Form @success="refreshGrid" />

    <div class="flex-1 min-h-0">
      <Grid table-title="主题列表">
        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button danger size="small" type="link" @click="handleDelete(row)">
              删除
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
