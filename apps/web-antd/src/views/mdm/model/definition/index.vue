<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteModelDefinitionApi,
  getModelDefinitionDetailApi,
  getModelDefinitionListApi,
  publishModelDefinitionApi,
  updateModelDefinitionStatusApi,
  upgradeModelDefinitionApi,
} from '#/api/mdm/model-definition';

import { useColumns } from './data';
import ModelFormModal from './modules/form.vue';

const router = useRouter();

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'warning', label: '草稿' },
  history: { color: 'default', label: '历史' },
  invalid: { color: 'default', label: '失效' },
  published: { color: 'success', label: '已发布' },
  revised: { color: 'processing', label: '升级' },
};

const [Form, formModalApi] = useVbenModal({
  connectedComponent: ModelFormModal,
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
        return await getModelDefinitionListApi({
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

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

async function createUpgradeDraft(row: any) {
  const newDefinitionId = await upgradeModelDefinitionApi(row.id);
  const newDraft = newDefinitionId
    ? await getModelDefinitionDetailApi(String(newDefinitionId))
    : null;

  if (!newDraft) {
    throw new Error('未获取到升级后的草稿模型');
  }

  message.success(
    `已从已发布模型生成升级草稿: ${row.name} v${Number(row.versionNo || 1) + 1}`,
  );
  gridApi.reload();
  return newDraft;
}

function handleCreate() {
  formModalApi
    .setData({
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

function openEditForm(row: any) {
  formModalApi
    .setData({
      ...row,
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

function handleEdit(row: any) {
  openEditForm(row);
}

function handleConfigFields(row: any) {
  router.push({
    name: 'MdmModelDefinitionManage',
    params: { id: row.id },
    query: { tab: 'fields' },
  });
}

async function handleUpgrade(row: any) {
  try {
    const newDraft = await createUpgradeDraft(row);
    message.info('已自动跳转到升级后的模型管理页面，可继续维护字段。');
    router.push({
      name: 'MdmModelDefinitionManage',
      params: { id: newDraft.id },
      query: { tab: 'fields' },
    });
  } catch {
    message.error('升级失败');
  }
}

function handleDelete(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await deleteModelDefinitionApi(row.id);
        message.success(`已删除模型: ${row.name}`);
        gridApi.reload();
      } catch {
        message.error('删除失败');
      }
    },
    title: `是否删除模型 ${row.name}？`,
  });
}

function handlePublish(row: any) {
  Modal.confirm({
    title: '你确定要发布模型吗',
    async onOk() {
      try {
        await publishModelDefinitionApi(row.id);
        message.success('模型已发布');
        gridApi.reload();
      } catch {
        message.error('发布失败');
      }
    },
  });
}

function handleDisable(row: any) {
  Modal.confirm({
    title: '你确定要禁用模型吗',
    async onOk() {
      try {
        await updateModelDefinitionStatusApi(row.id, 'invalid');
        message.success('模型已禁用');
        gridApi.reload();
      } catch {
        message.error('禁用失败');
      }
    },
  });
}

function handleEnable(row: any) {
  Modal.confirm({
    title: '你确定要启用模型吗',
    async onOk() {
      try {
        await updateModelDefinitionStatusApi(row.id, 'published');
        message.success('模型已启用');
        gridApi.reload();
      } catch {
        message.error('启用失败');
      }
    },
  });
}

function refreshGrid() {
  message.success('更新成功');
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="管理主数据模型定义，直接在列表中维护数据主题、字段结构、发布状态与版本历史。"
    title="模型管理"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">新增模型</Button>
    </template>

    <Form @success="refreshGrid" />

    <div class="min-h-0 flex-1">
      <Grid table-title="数据模型列表">
        <template #status="{ row }">
          <Tag :color="STATUS_MAP[row.status]?.color">
            {{ STATUS_MAP[row.status]?.label }}
          </Tag>
        </template>

        <template #enabled="{ row }">
          <Tag :color="row.enabled ? 'success' : 'default'">
            {{ row.enabled ? '启用' : '禁用' }}
          </Tag>
        </template>

        <template #needAudit="{ row }">
          <Tag :color="row.needAudit ? 'processing' : 'default'">
            {{ row.needAudit ? '是' : '否' }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space wrap>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button
              v-if="['draft', 'revised'].includes(row.status)"
              danger
              size="small"
              type="link"
              @click="handleDelete(row)"
            >
              删除
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
              v-if="row.status === 'published'"
              size="small"
              type="link"
              @click="handleDisable(row)"
            >
              禁用
            </Button>
            <Button
              v-if="row.status === 'invalid'"
              size="small"
              type="link"
              @click="handleEnable(row)"
            >
              启用
            </Button>
            <Button size="small" type="link" @click="handleConfigFields(row)">
              模型管理
            </Button>
            <Button
              v-if="row.status === 'published'"
              size="small"
              type="link"
              @click="handleUpgrade(row)"
            >
              升级
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
