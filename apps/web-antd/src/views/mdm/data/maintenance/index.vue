<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { Alert, Button, message, Select, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDictItemOptionsApi } from '#/api/mdm/dict';
import { getAuthorizedDynamicMasterDataRecordsApi } from '#/api/mdm/master-data';
import { getCurrentModelDataAuthApi } from '#/api/mdm/model-data-auth';
import { getModelFieldListApi } from '#/api/mdm/model-definition';

import {
  getMasterDataItemByRouteName,
  getMasterDataSelectOptions,
  loadDynamicMasterDataItems,
} from '../shared/master-data';
import { buildDynamicColumns, useColumns, useSearchSchema } from './data';
import DataFormModal from './modules/form.vue';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  history: { color: 'default', label: '历史版本' },
  invalid: { color: 'default', label: '失效' },
  normal: { color: 'success', label: '正常' },
  pending: { color: 'warning', label: '待审核' },
  published: { color: 'success', label: '已发布' },
  rejected: { color: 'error', label: '审核不通过' },
  revised: { color: 'processing', label: '已修订' },
};

function getStatusMeta(status?: string) {
  if (!status) {
    return { color: 'default', label: '-' };
  }

  return STATUS_MAP[status] ?? { color: 'default', label: status };
}

const route = useRoute();
const router = useRouter();
const currentMasterData = ref<any>(null);
const currentDataAuth = ref<any>(null);
const selectOptions = ref(getMasterDataSelectOptions());
const currentFields = ref<any[]>([]);
const currentDictOptionsMap = ref<Record<string, any[]>>({});
const readableFields = computed(() => {
  if (!currentMasterData.value?.dynamic) {
    return currentFields.value;
  }

  if (!currentDataAuth.value?.hasConfig && !currentDataAuth.value?.isSuperAdmin) {
    return currentFields.value;
  }

  return currentFields.value.filter((field: any) => {
    const permission =
      currentDataAuth.value?.fieldPermissionMap?.[String(field.id)];
    return permission?.canRead;
  });
});
const canMaintainCurrentData = computed(
  () => !!currentDataAuth.value?.canCreate || !!currentDataAuth.value?.canEdit,
);

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
          const definitionId = String(currentMasterData.value.definitionId || '');
          const fields = await getModelFieldListApi(
            currentMasterData.value.definitionId,
          );
          currentFields.value = fields;
          currentDataAuth.value = await getCurrentModelDataAuthApi(
            definitionId,
            fields.map((field: any) => String(field.id)).filter(Boolean),
          );
          currentDictOptionsMap.value = await loadDictOptionsMap(readableFields.value);
          gridApi.setGridOptions({
            columns: buildDynamicColumns(
              readableFields.value,
              currentDictOptionsMap.value,
            ),
          });

          return await getAuthorizedDynamicMasterDataRecordsApi(
            definitionId,
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

function isInMasterDataRoute() {
  return route.path.startsWith('/mdm/data');
}

async function resolveCurrentMasterData() {
  if (!isInMasterDataRoute()) {
    currentMasterData.value = null;
    return;
  }

  await loadDynamicMasterDataItems();
  selectOptions.value = getMasterDataSelectOptions();
  currentMasterData.value = getMasterDataItemByRouteName(
    String(route.name ?? ''),
  );
  currentDataAuth.value = null;
  currentFields.value = [];
  currentDictOptionsMap.value = {};

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
    currentDataAuth.value = await getCurrentModelDataAuthApi(
      String(currentMasterData.value.definitionId),
      currentFields.value.map((field: any) => String(field.id)).filter(Boolean),
    );
    currentDictOptionsMap.value = await loadDictOptionsMap(readableFields.value);
  }

  gridApi.reload();
}

async function loadDictOptionsMap(fields: any[]) {
  const dictCodes = [
    ...new Set(
      fields
        .filter((field: any) => field.dataType === 'dict' && field.dictCode)
        .map((field: any) => String(field.dictCode)),
    ),
  ];

  if (dictCodes.length === 0) {
    return {};
  }

  const optionsList = await Promise.all(
    dictCodes.map(async (dictCode) => [
      dictCode,
      await getDictItemOptionsApi(dictCode),
    ]),
  );

  return Object.fromEntries(optionsList);
}

function handleCreate() {
  if (!currentMasterData.value?.tableName) {
    message.warning('请先发布数据模型后再维护主数据。');
    return;
  }
  if (!canMaintainCurrentData.value) {
    message.warning('当前用户没有该模型的数据写入权限');
    return;
  }
  formModalApi
    .setData({
      dataAuth: currentDataAuth.value,
      definitionId: currentMasterData.value.definitionId,
      fields: currentFields.value,
      masterDataTitle: currentMasterData.value.title,
      needAudit: currentMasterData.value.needAudit ?? false,
      onSuccess: refreshGrid,
      tableName: currentMasterData.value.tableName,
    })
    .open();
}

function handleEdit(row: any) {
  if (!currentMasterData.value?.tableName) {
    return;
  }
  if (!currentDataAuth.value?.canEdit) {
    message.warning('当前用户没有该模型的数据编辑权限');
    return;
  }
  formModalApi
    .setData({
      ...row,
      dataAuth: currentDataAuth.value,
      definitionId: currentMasterData.value.definitionId,
      fields: currentFields.value,
      masterDataTitle: currentMasterData.value.title,
      needAudit: currentMasterData.value.needAudit ?? false,
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
  () => route.path,
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
          :disabled="!currentMasterData || !canMaintainCurrentData"
          type="primary"
          @click="handleCreate"
        >
          新增{{ currentMasterData?.title || '' }}
        </Button>
      </Space>
    </template>

    <Form @success="refreshGrid" />

    <div v-if="currentMasterData" class="flex-1 min-h-0">
      <Alert
        v-if="
          currentMasterData.dynamic &&
          currentDataAuth?.hasConfig &&
          !currentDataAuth?.authorized
        "
        class="mb-4"
        message="当前用户所属用户组未被授权访问该模型数据，列表与编辑能力已按数据授权限制。"
        show-icon
        type="warning"
      />
      <Grid
        :form-options="currentMasterData.dynamic ? undefined : formOptions"
        :table-title="`${currentMasterData.title}记录`"
      >
        <template #status="{ row }">
          <Tag :color="getStatusMeta(row.status).color">
            {{ getStatusMeta(row.status).label }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button
              v-if="canMaintainCurrentData"
              size="small"
              type="link"
              @click="handleEdit(row)"
            >
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
