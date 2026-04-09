<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Select, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDynamicMasterDataRecordsApi } from '#/api/mdm/master-data';
import { getModelFieldListApi } from '#/api/mdm/model-definition';

import {
  getMasterDataItemByRouteName,
  getMasterDataSelectOptions,
  loadDynamicMasterDataItems,
} from '../shared/master-data';
import { buildDynamicColumns, useColumns, useSearchSchema } from './data';
import DataFormModal from './modules/form.vue';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  invalid: { color: 'default', label: '失效' },
  normal: { color: 'success', label: '正常' },
  pending: { color: 'warning', label: '审核中' },
};

const route = useRoute();
const router = useRouter();
const currentMasterData = ref<any>(null);
const selectOptions = ref(getMasterDataSelectOptions());
const currentFields = ref<any[]>([]);

const [Form, formModalApi] = useVbenModal({
  connectedComponent: DataFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(String(route.name ?? '')),
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        if (
          currentMasterData.value.dynamic &&
          currentMasterData.value.tableName
        ) {
          const fields = await getModelFieldListApi(
            currentMasterData.value.definitionId,
          );
          currentFields.value = fields;
          gridApi.setGridOptions({
            columns: buildDynamicColumns(fields),
          });

          return await getDynamicMasterDataRecordsApi(
            currentMasterData.value.tableName,
            {
              page: page.currentPage,
              pageSize: page.pageSize,
            },
          );
        }

        const records = currentMasterData.value.records || [];
        const start = (page.currentPage - 1) * page.pageSize;
        const end = start + page.pageSize;
        gridApi.setGridOptions({
          columns: useColumns(String(route.name ?? '')),
        });
        return {
          items: records.slice(start, end),
          total: records.length,
        };
      },
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    search: true,
    zoom: true,
  },
};

const formOptions = {
  schema: useSearchSchema(),
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

async function resolveCurrentMasterData() {
  await loadDynamicMasterDataItems();
  selectOptions.value = getMasterDataSelectOptions();
  currentMasterData.value = getMasterDataItemByRouteName(
    String(route.name ?? ''),
  );
  currentFields.value = [];

  if (!currentMasterData.value) {
    const [firstOption] = selectOptions.value;
    if (firstOption?.value && route.path !== firstOption.value) {
      await router.replace(firstOption.value);
      return;
    }
    return;
  }

  if (currentMasterData.value.definitionId) {
    currentFields.value = await getModelFieldListApi(
      currentMasterData.value.definitionId,
    );
  }

  gridApi.reload();
}

function handleCreate() {
  if (!currentMasterData.value?.tableName) {
    message.warning('请先发布数据模型后再维护主数据。');
    return;
  }
  formModalApi
    .setData({
      fields: currentFields.value,
      masterDataTitle: currentMasterData.value.title,
      onSuccess: refreshGrid,
      tableName: currentMasterData.value.tableName,
    })
    .open();
}

function handleEdit(row: any) {
  if (!currentMasterData.value?.tableName) {
    return;
  }
  formModalApi
    .setData({
      ...row,
      fields: currentFields.value,
      masterDataTitle: currentMasterData.value.title,
      onSuccess: refreshGrid,
      tableName: currentMasterData.value.tableName,
    })
    .open();
}

function handleAudit(row: any) {
  message.info(
    `提交${currentMasterData.value.title}审核: ${row.entityName || row.id}`,
  );
}

function handleHistory(row: any) {
  message.info(
    `查看${currentMasterData.value.title}历史版本: ${row.entityName || row.id}`,
  );
}

function handleMasterDataChange(path: unknown) {
  if (typeof path === 'string') {
    router.push(path);
  }
}

function refreshGrid() {
  message.success(`${currentMasterData.value.title}更新成功`);
  gridApi.reload();
}

watch(
  () => route.name,
  () => {
    resolveCurrentMasterData();
  },
  { immediate: true },
);
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    :description="currentMasterData?.description"
    :title="
      currentMasterData ? `${currentMasterData.title}主数据` : '主数据管理'
    "
  >
    <template #extra>
      <Space>
        <Select
          :options="selectOptions"
          :value="currentMasterData?.path"
          placeholder="切换主数据"
          style="width: 260px"
          @change="handleMasterDataChange"
        />
        <Button
          :disabled="!currentMasterData"
          type="primary"
          @click="handleCreate"
        >
          新增{{ currentMasterData?.title || '' }}
        </Button>
      </Space>
    </template>

    <Form @success="refreshGrid" />

    <div v-if="currentMasterData" class="flex-1 min-h-0">
      <Grid
        :form-options="currentMasterData.dynamic ? undefined : formOptions"
        :table-title="`${currentMasterData.title}记录`"
      >
        <template #status="{ row }">
          <Tag :color="STATUS_MAP[row.status]?.color">
            {{ STATUS_MAP[row.status]?.label }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button size="small" type="link" @click="handleAudit(row)">
              审核
            </Button>
            <Button size="small" type="link" @click="handleHistory(row)">
              历史
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
    <div
      v-else
      class="text-text-secondary flex flex-1 items-center justify-center text-sm"
    >
      暂无已发布的数据模型，请先到“数据模型”页面发布后再进入主数据管理。
    </div>
  </Page>
</template>
