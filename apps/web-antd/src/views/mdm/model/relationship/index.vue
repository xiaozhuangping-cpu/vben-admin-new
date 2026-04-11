<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteModelRelationshipApi,
  getModelRelationshipListApi,
  obsoleteModelRelationshipApi,
  publishModelRelationshipApi,
} from '#/api/mdm/model-relationship';

import { useColumns } from './data';
import RelationshipFormModal from './modules/form.vue';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'warning', label: '草稿' },
  published: { color: 'success', label: '已发布' },
  obsolete: { color: 'default', label: '作废' },
};

const RELATION_TYPE_MAP: Record<string, string> = {
  '1:1': '一对一',
  '1:N': '一对多',
  'N:1': '多对一',
  'N:N': '多对多',
};

const [Form, formModalApi] = useVbenModal({
  connectedComponent: RelationshipFormModal,
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
      query: async ({ page }) => {
        return await getModelRelationshipListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
        });
      },
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

function handleCreate() {
  formModalApi
    .setData({
      sort: 10,
      status: 'draft',
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

function handleEdit(row: any) {
  if (row.status !== 'draft') {
    message.warning('只有草稿状态的模型关系才能编辑');
    return;
  }

  formModalApi
    .setData({
      ...row,
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

async function handleDelete(row: any) {
  if (row.status !== 'draft') {
    message.warning('只有草稿状态的模型关系才能删除');
    return;
  }

  Modal.confirm({
    async onOk() {
      try {
        await deleteModelRelationshipApi(row.id);
        message.success(
          `已删除模型关系: ${row.sourceModelName} -> ${row.targetModelName}`,
        );
        gridApi.reload();
      } catch {
        message.error('删除失败');
      }
    },
    title: '是否删除当前模型关系？',
  });
}

function handlePublish(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await publishModelRelationshipApi(row.id);
        message.success('模型关系已发布');
        gridApi.reload();
      } catch {
        message.error('发布失败');
      }
    },
    title: '是否发布当前模型关系？',
  });
}

function handleObsolete(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await obsoleteModelRelationshipApi(row.id);
        message.success('模型关系已作废');
        gridApi.reload();
      } catch {
        message.error('作废失败');
      }
    },
    title: '是否将当前模型关系置为作废？',
  });
}

function refreshGrid() {
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="管理主数据模型之间的关系定义，并通过草稿、发布、作废状态控制变更窗口。"
    title="模型关系"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">新增关系</Button>
    </template>

    <Form @success="refreshGrid" />

    <div class="flex-1 min-h-0">
      <Grid table-title="关系列表">
        <template #relationType="{ row }">
          {{ RELATION_TYPE_MAP[row.relationType] ?? row.relationType }}
        </template>

        <template #status="{ row }">
          <Tag :color="STATUS_MAP[row.status]?.color">
            {{ STATUS_MAP[row.status]?.label ?? row.status }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space wrap>
            <Button
              v-if="row.status === 'draft'"
              size="small"
              type="link"
              @click="handleEdit(row)"
            >
              编辑
            </Button>
            <Button
              v-if="row.status === 'draft'"
              size="small"
              type="link"
              @click="handlePublish(row)"
            >
              发布
            </Button>
            <Button
              v-if="row.status === 'draft'"
              danger
              size="small"
              type="link"
              @click="handleDelete(row)"
            >
              删除
            </Button>
            <Button
              v-if="row.status === 'draft' || row.status === 'published'"
              size="small"
              type="link"
              @click="handleObsolete(row)"
            >
              作废
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
