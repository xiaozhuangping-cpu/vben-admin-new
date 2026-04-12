<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getModelDefinitionListApi } from '#/api/mdm/model-definition';

import { useColumns } from './data';

defineOptions({ name: 'MdmModelVersion' });

const router = useRouter();

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  history: { color: 'default', label: '历史' },
  invalid: { color: 'default', label: '失效' },
  published: { color: 'success', label: '已生效' },
};

function formatVersionLabel(versionNo?: number | string) {
  if (versionNo === null || versionNo === undefined || versionNo === '') {
    return '-';
  }
  return `V${versionNo}`;
}

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        const result = await getModelDefinitionListApi({
          includeHistory: true,
          order: 'updated_at.desc,created_at.desc',
          page: page.currentPage,
          pageSize: page.pageSize,
          status: 'in.(history,invalid,published)',
        });

        return {
          items: result.items.map((item) => ({
            ...item,
            modelName: item.code ? `${item.name} (${item.code})` : item.name,
            publisher: item.updatedBy || '-',
            publishTime: item.updatedAt,
            remark: item.remark || item.description || '-',
            statusLabel: STATUS_MAP[item.status]?.label || item.status,
            version: formatVersionLabel(item.versionNo),
          })),
          total: result.total,
        };
      },
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const [Grid] = useVbenVxeGrid({
  gridOptions,
});

function handleViewDefinition(row: any) {
  router.push({
    name: 'MdmModelDefinitionManage',
    params: { id: row.id },
  });
}
</script>

<template>
  <Page
    auto-content-height
    description="从数据模型库读取已生效、失效和历史版本，统一查看模型版本状态与发布时间。"
    title="模型版本管理"
  >
    <Grid table-title="模型版本列表">
      <template #version="{ row }">
        <Tag color="blue">{{ row.version }}</Tag>
      </template>

      <template #status="{ row }">
        <Tag :color="STATUS_MAP[row.status]?.color">
          {{ STATUS_MAP[row.status]?.label || row.statusLabel }}
        </Tag>
      </template>

      <template #action="{ row }">
        <Space>
          <Button size="small" type="link" @click="handleViewDefinition(row)">
            查看模型
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
