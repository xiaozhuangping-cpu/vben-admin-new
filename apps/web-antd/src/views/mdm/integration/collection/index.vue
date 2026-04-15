<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Popconfirm, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCollectionTaskApi,
  dispatchCollectionTaskRunsApi,
  enqueueCollectionTaskRunApi,
  getCollectionTaskListApi,
} from '#/api/mdm/collection';

import { useColumns, useSearchSchema } from './data';
import CollectionFormModal from './modules/form.vue';
import CollectionLogModal from './modules/log-modal.vue';

defineOptions({ name: 'MdmIntegrationCollection' });

const COLLECTION_TYPE_MAP: Record<string, { color: string; label: string }> = {
  api: { color: 'blue', label: 'API' },
  plugin: { color: 'purple', label: '插件' },
};

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  disabled: { color: 'default', label: '停用' },
  enabled: { color: 'success', label: '启用' },
};

const [Form, formModalApi] = useVbenModal({
  connectedComponent: CollectionFormModal,
  destroyOnClose: true,
});

const [LogModal, logModalApi] = useVbenModal({
  connectedComponent: CollectionLogModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  formConfig: {
    schema: useSearchSchema(),
  },
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }: any, formValues: any) =>
        await getCollectionTaskListApi({
          ...formValues,
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
  gridOptions: {
    ...gridOptions,
    height: 'auto',
  },
});

function handleCreate() {
  formModalApi
    .setData({
      onSuccess: () => {
        gridApi.reload();
      },
    })
    .open();
}

function handleEdit(row: any) {
  formModalApi
    .setData({
      ...row,
      onSuccess: () => {
        gridApi.reload();
      },
    })
    .open();
}

async function handleRun(row: any) {
  try {
    const enqueueResult = await enqueueCollectionTaskRunApi({
      taskId: String(row.id),
      triggerMode: 'manual',
    });

    if (!enqueueResult.runId) {
      throw new Error('创建归集执行批次失败。');
    }

    await dispatchCollectionTaskRunsApi({
      runIds: [enqueueResult.runId],
      triggerMode: 'manual',
    });

    gridApi.reload();
    message.success(`任务 ${row.name} 已完成一次手动执行。`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '执行归集任务失败。';
    message.error(errorMessage);
  }
}

async function handleDelete(row: any) {
  try {
    await deleteCollectionTaskApi(String(row.id));
    gridApi.reload();
    message.success(`任务 ${row.name} 已删除。`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '删除归集任务失败。';
    message.error(errorMessage);
  }
}

function handleLogs(row: any) {
  logModalApi.setData(row).open();
}

function refreshGrid() {
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="维护主数据采集任务，支持 API 与插件两类归集方式，并保留执行历史与日志。"
    title="数据归集任务"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">新增任务</Button>
    </template>

    <Form @success="refreshGrid" />
    <LogModal />

    <div class="min-h-0 flex-1">
      <Grid table-title="任务列表">
        <template #collectionType="{ row }">
          <Tag :color="COLLECTION_TYPE_MAP[row.collectionType]?.color">
            {{
              COLLECTION_TYPE_MAP[row.collectionType]?.label ||
              row.collectionType
            }}
          </Tag>
        </template>

        <template #status="{ row }">
          <Tag :color="STATUS_MAP[row.status]?.color">
            {{ STATUS_MAP[row.status]?.label || row.status }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)">
编辑
</Button>
            <Button size="small" type="link" @click="handleRun(row)">
              立即执行
            </Button>
            <Button size="small" type="link" @click="handleLogs(row)">
日志
</Button>
            <Popconfirm
              title="确认删除该归集任务吗？"
              @confirm="handleDelete(row)"
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
