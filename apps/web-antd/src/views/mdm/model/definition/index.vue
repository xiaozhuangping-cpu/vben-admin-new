<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getModelDefinitionDetailApi,
  getModelDefinitionListApi,
  publishModelDefinitionApi,
  unpublishModelDefinitionApi,
  upgradeModelDefinitionApi,
} from '#/api/mdm/model-definition';

import { useColumns } from './data';
import FieldsDrawer from './modules/fields.vue';
import ModelFormModal from './modules/form.vue';
import VersionModal from './modules/version.vue';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'warning', label: '草稿' },
  published: { color: 'success', label: '已发布' },
  unpublished: { color: 'default', label: '取消发布' },
};

const [Form, formModalApi] = useVbenModal({
  connectedComponent: ModelFormModal,
  destroyOnClose: true,
});

const [Version, versionModalApi] = useVbenModal({
  connectedComponent: VersionModal,
  destroyOnClose: true,
});

const [Fields, fieldsDrawerApi] = useVbenDrawer({
  connectedComponent: FieldsDrawer,
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

function openFieldsDrawer(row: any) {
  fieldsDrawerApi
    .setData({
      ...row,
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

function handleEdit(row: any) {
  if (row.status !== 'published') {
    openEditForm(row);
    return;
  }

  Modal.confirm({
    async onOk() {
      try {
        const newDraft = await createUpgradeDraft(row);
        openEditForm(newDraft);
      } catch {
        message.error('自动升级失败，请稍后重试');
      }
    },
    title: '当前是已发布模型，编辑前需要先升级为草稿版本，是否继续？',
  });
}

function handleConfigFields(row: any) {
  if (row.status !== 'published') {
    openFieldsDrawer(row);
    return;
  }

  Modal.confirm({
    async onOk() {
      try {
        const newDraft = await createUpgradeDraft(row);
        message.info('已自动打开升级后草稿的字段配置，可继续新增或调整字段。');
        openFieldsDrawer(newDraft);
      } catch {
        message.error('自动升级失败，请稍后重试');
      }
    },
    title: '当前是已发布模型，调整字段前需要先升级为草稿版本，是否继续？',
  });
}

function handleVersionHistory(row: any) {
  versionModalApi.setData(row).open();
}

function handlePublish(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await publishModelDefinitionApi(row.id);
        message.success(`模型已发布: ${row.name}`);
        gridApi.reload();
      } catch {
        message.error('发布失败');
      }
    },
    title: '是否要发布模型？',
  });
}

function handleUnpublish(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await unpublishModelDefinitionApi(row.id);
        message.success(`已取消发布: ${row.name}`);
        gridApi.reload();
      } catch {
        message.error('取消发布失败');
      }
    },
    title: '是否要取消发布模型？',
  });
}

async function handleUpgrade(row: any) {
  try {
    const newDraft = await createUpgradeDraft(row);
    message.info('已自动打开升级后草稿的字段配置，可继续新增或调整字段。');
    openFieldsDrawer(newDraft);
  } catch {
    message.error('升级失败');
  }
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
    <Version />
    <Fields @success="refreshGrid" />

    <div class="flex-1 min-h-0">
      <Grid table-title="数据模型列表">
        <template #status="{ row }">
          <Tag :color="STATUS_MAP[row.status]?.color">
            {{ STATUS_MAP[row.status]?.label }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space wrap>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button size="small" type="link" @click="handleConfigFields(row)">
              字段配置
            </Button>
            <Button size="small" type="link" @click="handleVersionHistory(row)">
              版本历史
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
              @click="handleUnpublish(row)"
            >
              取消发布
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
