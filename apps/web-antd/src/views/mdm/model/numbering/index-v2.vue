<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Alert, Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  buildNumberingPreview,
  deleteNumberingSegmentApi,
  generateNumberingSegmentApi,
  getNumberingSegmentListApi,
  NUMBERING_TYPE_LABEL_MAP,
  resetNumberingSegmentApi,
  updateNumberingSegmentEnabledApi,
} from '#/api/mdm/numbering';

import { useColumns } from './data-v2';
import NumberingFormModal from './modules/form-v2.vue';

const [Form, formModalApi] = useVbenModal({
  connectedComponent: NumberingFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getNumberingSegmentListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
        }),
    },
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

function refreshGrid() {
  gridApi.reload();
}

function handleCreate() {
  formModalApi
    .setData({
      onSuccess: refreshGrid,
    })
    .open();
}

function handleEdit(row: any) {
  formModalApi
    .setData({
      ...row,
      onSuccess: refreshGrid,
    })
    .open();
}

function handleToggleEnabled(row: any, enabled: boolean) {
  Modal.confirm({
    async onOk() {
      try {
        await updateNumberingSegmentEnabledApi(row.id, enabled);
        message.success(enabled ? '码段已启用' : '码段已禁用');
        refreshGrid();
      } catch {
        message.error(enabled ? '启用失败' : '禁用失败');
      }
    },
    title: enabled
      ? `确认启用码段 ${row.segmentName}？`
      : `确认禁用码段 ${row.segmentName}？`,
  });
}

function handleReset(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await resetNumberingSegmentApi(row.id);
        message.success('流水已重置');
        refreshGrid();
      } catch {
        message.error('流水重置失败');
      }
    },
    title: `确认重置码段 ${row.segmentName} 的流水？`,
  });
}

function handleDelete(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await deleteNumberingSegmentApi(row.id);
        message.success(`已删除码段 ${row.segmentName}`);
        refreshGrid();
      } catch {
        message.error('删除码段失败');
      }
    },
    title: `确认删除码段 ${row.segmentName}？`,
  });
}

async function handleGenerate(row: any) {
  try {
    const result = await generateNumberingSegmentApi(row.id);
    message.success(`已生成编码：${result?.code ?? '-'}`);
    refreshGrid();
  } catch {
    message.error('生成编码失败');
  }
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="维护码段定义，支持流水码、日期码、日期流水码，并统一管理前缀、后缀、日期格式、起始值、步长与重置策略。"
    title="编码管理"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">
        <Plus class="size-4" /> 新增码段
      </Button>
    </template>

    <div class="mb-4">
      <Alert
        message="本次编码管理仅处理码段自身，不与主数据维护联动。手工试生成和重置流水会直接影响当前流水值。"
        show-icon
        type="info"
      />
    </div>

    <Form @success="refreshGrid" />

    <div class="min-h-0 flex-1">
      <Grid table-title="码段列表">
        <template #numberingType="{ row }">
          <Tag color="blue">
            {{
              NUMBERING_TYPE_LABEL_MAP[row.numberingType] ?? row.numberingType
            }}
          </Tag>
        </template>

        <template #previewCode="{ row }">
          <Tag color="purple">{{ buildNumberingPreview(row) }}</Tag>
        </template>

        <template #enabled="{ row }">
          <Tag :color="row.enabled ? 'success' : 'default'">
            {{ row.enabled ? '启用' : '禁用' }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button
              v-if="row.enabled"
              size="small"
              type="link"
              @click="handleToggleEnabled(row, false)"
            >
              禁用
            </Button>
            <Button
              v-else
              size="small"
              type="link"
              @click="handleToggleEnabled(row, true)"
            >
              启用
            </Button>
            <Button size="small" type="link" @click="handleReset(row)">
              重置流水
            </Button>
            <Button size="small" type="link" @click="handleGenerate(row)">
              试生成
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
