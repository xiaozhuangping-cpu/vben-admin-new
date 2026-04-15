<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  DatePicker,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDictItemOptionsApi } from '#/api/mdm/dict';
import {
  getAuthorizedDynamicMasterDataRecordsApi,
  getDynamicMasterDataRecordsApi,
  updateDynamicMasterDataRecordApi,
} from '#/api/mdm/master-data';
import { getCurrentModelDataAuthApi } from '#/api/mdm/model-data-auth';
import {
  getModelDefinitionDetailApi,
  getModelFieldListApi,
} from '#/api/mdm/model-definition';
import { formatDateTime } from '#/utils/date';

import {
  getAccessibleMasterDataItems,
  loadDynamicMasterDataItems,
} from '../shared/master-data';
import {
  buildDynamicColumns,
  buildDynamicFilters,
  getDynamicSearchFields,
  useColumns,
  useSearchSchema,
} from './data';
import DataFormModal from './modules/form.vue';
import DataImportModal from './modules/import-modal.vue';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  history: { color: 'default', label: '历史版本' },
  invalid: { color: 'default', label: '失效' },
  pending_approval: { color: 'warning', label: '待审批' },
  published: { color: 'success', label: '已生效' },
};

const STATUS_SEARCH_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '待审批', value: 'pending_approval' },
  { label: '已生效', value: 'published' },
  { label: '失效', value: 'invalid' },
];

function getStatusMeta(status?: string) {
  if (!status) {
    return { color: 'default', label: '-' };
  }

  return STATUS_MAP[status] ?? { color: 'default', label: status };
}

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();

const ownerRouteName = ref('');
const currentMasterData = ref<any>(null);
const currentDataAuth = ref<any>(null);
const resolvingMasterData = ref(false);
const resolvedRouteKey = ref('');
const currentFields = ref<any[]>([]);
const currentDictOptionsMap = ref<Record<string, any[]>>({});
const relationFieldMetaMap = ref<
  Record<string, { tableName: string; titleFieldCode: string }>
>({});
const searchPanelVisible = ref(false);
const dynamicSearchValues = ref<Record<string, any>>({});
const resolvingSequence = ref(0);
const exportLoading = ref(false);

const readableFields = computed(() => {
  if (!currentMasterData.value?.dynamic) {
    return currentFields.value;
  }

  if (
    !currentDataAuth.value?.hasConfig &&
    !currentDataAuth.value?.isSuperAdmin
  ) {
    return currentFields.value;
  }

  return currentFields.value.filter((field: any) => {
    const permission =
      currentDataAuth.value?.fieldPermissionMap?.[String(field.id)];
    return permission?.canRead;
  });
});

const dynamicSearchFields = computed(() =>
  getDynamicSearchFields(readableFields.value),
);

const readableFieldSignature = computed(() =>
  readableFields.value
    .map((field: any) =>
      [
        String(field.id ?? ''),
        String(field.code ?? ''),
        field.listVisible ? '1' : '0',
        field.status === false ? '0' : '1',
      ].join(':'),
    )
    .join('|'),
);

const canMaintainCurrentData = computed(
  () => !!currentDataAuth.value?.canCreate || !!currentDataAuth.value?.canEdit,
);

const isOwnedRouteActive = computed(() => {
  if (!ownerRouteName.value) {
    return true;
  }

  return String(route.name ?? '') === ownerRouteName.value;
});

const accessibleMasterDataRouteNames = computed(() => {
  const names = new Set<string>();

  const walk = (menus: any[]) => {
    for (const menu of menus) {
      const name = String(menu?.name || '');
      if (name.startsWith('MdmDataDynamic')) {
        names.add(name);
      }
      if (Array.isArray(menu?.children) && menu.children.length > 0) {
        walk(menu.children);
      }
    }
  };

  walk(accessStore.accessMenus || []);
  return names;
});

const accessibleMasterDataSignature = computed(() =>
  [...accessibleMasterDataRouteNames.value].toSorted().join('|'),
);

const pageTitle = computed(() => {
  if (currentMasterData.value?.title) {
    return `${currentMasterData.value.title}主数据`;
  }

  const routeTitle = String(route.meta.title || '').trim();
  return routeTitle ? `${routeTitle}主数据` : '主数据管理';
});

const [Form, formModalApi] = useVbenModal({
  connectedComponent: DataFormModal,
  destroyOnClose: true,
});

const [ImportModal, importModalApi] = useVbenModal({
  connectedComponent: DataImportModal,
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
          currentMasterData.value?.dynamic &&
          currentMasterData.value?.tableName
        ) {
          const definitionId = String(
            currentMasterData.value.definitionId || '',
          );
          syncGridColumns();
          const result = await getAuthorizedDynamicMasterDataRecordsApi(
            definitionId,
            {
              ...buildDynamicFilters(
                readableFields.value,
                dynamicSearchValues.value,
              ),
              page: page.currentPage,
              pageSize: page.pageSize,
            },
          );
          await hydrateRelationDisplayRows(result.items, readableFields.value);
          return result;
        }

        const records = currentMasterData.value?.records || [];
        const start = (page.currentPage - 1) * page.pageSize;
        const end = start + page.pageSize;
        syncGridColumns();
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
    zoom: true,
  },
};

const formOptions = {
  schema: useSearchSchema(),
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

function syncGridColumns() {
  if (currentMasterData.value?.dynamic) {
    gridApi.setGridOptions({
      columns: buildDynamicColumns(
        readableFields.value,
        currentDictOptionsMap.value,
      ),
    });
    return;
  }

  gridApi.setGridOptions({
    columns: useColumns(String(route.name ?? '')),
  });
}

function isInMasterDataRoute() {
  return route.path.startsWith('/mdm/data');
}

function getCurrentRouteCacheKey() {
  return `${String(route.name ?? '')}::${route.path}`;
}

function hasResolvedCurrentRouteState() {
  if (!currentMasterData.value) {
    return false;
  }

  if (currentMasterData.value.path !== route.path) {
    return false;
  }

  if (resolvedRouteKey.value !== getCurrentRouteCacheKey()) {
    return false;
  }

  if (!currentMasterData.value.dynamic) {
    return true;
  }

  return currentFields.value.length > 0;
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

async function ensureRelationFieldMeta(relatedDefinitionId?: string) {
  const definitionId = String(relatedDefinitionId || '');
  if (!definitionId) {
    return null;
  }
  if (relationFieldMetaMap.value[definitionId]) {
    return relationFieldMetaMap.value[definitionId];
  }

  const [definition, fields] = await Promise.all([
    getModelDefinitionDetailApi(definitionId),
    getModelFieldListApi(definitionId),
  ]);
  const sortedFields = [...fields]
    .filter((field: any) => field.status !== false)
    .toSorted((a: any, b: any) => Number(a.sort ?? 10) - Number(b.sort ?? 10));
  const titleField =
    sortedFields.find((field: any) => field.isTitle) ??
    sortedFields.find((field: any) => field.listVisible) ??
    sortedFields[0];

  const meta = {
    tableName: String(definition?.tableName || ''),
    titleFieldCode: String(titleField?.code || '').toLowerCase(),
  };
  relationFieldMetaMap.value = {
    ...relationFieldMetaMap.value,
    [definitionId]: meta,
  };
  return meta;
}

async function hydrateRelationDisplayRows(rows: any[], fields: any[]) {
  const relationFields = fields.filter(
    (field: any) =>
      field.status !== false &&
      field.listVisible === true &&
      field.dataType === 'relation_master' &&
      field.relatedDefinitionId,
  );

  await Promise.all(
    relationFields.map(async (field: any) => {
      const fieldCode = String(field.code || '').toLowerCase();
      const ids = [
        ...new Set(
          rows
            .map((row: any) => String(row?.[fieldCode] || '').trim())
            .filter(Boolean),
        ),
      ];
      if (ids.length === 0) {
        return;
      }

      const meta = await ensureRelationFieldMeta(field.relatedDefinitionId);
      if (!meta?.tableName) {
        return;
      }

      const displayNameMap = new Map<string, string>();
      await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await getDynamicMasterDataRecordsApi(
              meta.tableName,
              {
                id: `eq.${id}`,
                page: 1,
                pageSize: 1,
              },
            );
            const row = response.items[0];
            displayNameMap.set(
              id,
              String(
                row?.[meta.titleFieldCode] ??
                  row?.entityname ??
                  row?.name ??
                  row?.id ??
                  id,
              ),
            );
          } catch (error) {
            console.error('load relation list display failed', error);
            displayNameMap.set(id, id);
          }
        }),
      );

      rows.forEach((row: any) => {
        const id = String(row?.[fieldCode] || '').trim();
        if (!id) {
          return;
        }
        row[`${fieldCode}__display`] = displayNameMap.get(id) ?? id;
      });
    }),
  );

  return rows;
}

function escapeExcelCell(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function downloadExcel(
  filename: string,
  headers: string[],
  rows: Array<unknown[]>,
) {
  const thead = `<tr>${headers.map((header) => `<th>${escapeExcelCell(header)}</th>`).join('')}</tr>`;
  const tbody = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => String.raw`<td style="mso-number-format:'\@';">${escapeExcelCell(cell)}</td>`).join('')}</tr>`,
    )
    .join('');
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body>
  <table border="1">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`;
  const blob = new Blob(['\uFEFF', html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatExportTime() {
  return new Date().toISOString().slice(0, 19).replaceAll(':', '-');
}

function getDictLabel(dictCode?: string, value?: unknown) {
  if (!dictCode) {
    return String(value ?? '');
  }
  return (
    currentDictOptionsMap.value[dictCode]?.find(
      (item: any) => String(item.value) === String(value ?? ''),
    )?.label ?? String(value ?? '')
  );
}

function formatExportCellValue(row: Record<string, any>, field: any) {
  const fieldCode = String(field?.code || '').toLowerCase();
  const rawValue = row?.[fieldCode];
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return '';
  }
  if (fieldCode === 'status') {
    return getStatusMeta(String(rawValue)).label;
  }
  if (field?.dataType === 'dict') {
    return getDictLabel(field?.dictCode, rawValue);
  }
  if (field?.dataType === 'boolean') {
    return String(rawValue) === 'true' || rawValue === true ? '是' : '否';
  }
  if (field?.dataType === 'relation_master') {
    return row?.[`${fieldCode}__display`] ?? String(rawValue);
  }
  if (field?.dataType === 'date' || field?.dataType === 'timestamptz') {
    return formatDateTime(String(rawValue), '');
  }
  return String(rawValue);
}

async function handleExport() {
  if (!currentMasterData.value) {
    return;
  }

  exportLoading.value = true;
  try {
    if (
      currentMasterData.value.dynamic &&
      currentMasterData.value.definitionId
    ) {
      const definitionId = String(currentMasterData.value.definitionId);
      const items: any[] = [];
      let currentPage = 1;
      const batchSize = 500;

      while (true) {
        const result = await getAuthorizedDynamicMasterDataRecordsApi(
          definitionId,
          {
            ...buildDynamicFilters(
              readableFields.value,
              dynamicSearchValues.value,
            ),
            page: currentPage,
            pageSize: batchSize,
          },
        );
        if (result.items.length === 0) {
          break;
        }
        await hydrateRelationDisplayRows(result.items, readableFields.value);
        items.push(...result.items);
        if (result.items.length < batchSize) {
          break;
        }
        currentPage += 1;
      }

      const exportFields = readableFields.value
        .filter(
          (field: any) => field.status !== false && field.listVisible === true,
        )
        .toSorted((a: any, b: any) => Number(a.sort ?? 10) - Number(b.sort ?? 10));
      const headers = [
        ...exportFields.map((field: any) =>
          String(field.name || field.code || ''),
        ),
        '创建时间',
        '更新时间',
      ];
      const rows = items.map((row) => [
        ...exportFields.map((field: any) => formatExportCellValue(row, field)),
        formatDateTime(String(row.created_at || ''), ''),
        formatDateTime(String(row.updated_at || ''), ''),
      ]);

      downloadExcel(
        `${String(currentMasterData.value.title || '主数据')}_${formatExportTime()}.xls`,
        headers,
        rows,
      );
      message.success('导出成功');
      return;
    }

    const items = [...(currentMasterData.value.records || [])];
    const headers = ['主数据编码', '主数据名称', '版本', '状态', '创建时间'];
    const rows = items.map((row: any) => [
      row.entityCode ?? '',
      row.entityName ?? '',
      row.version ?? '',
      getStatusMeta(String(row.status || '')).label,
      formatDateTime(String(row.createTime || ''), ''),
    ]);
    downloadExcel(
      `${String(currentMasterData.value.title || '主数据')}_${formatExportTime()}.xls`,
      headers,
      rows,
    );
    message.success('导出成功');
  } catch (error) {
    console.error('export master data failed', error);
    message.error('导出失败，请稍后重试');
  } finally {
    exportLoading.value = false;
  }
}

async function loadCurrentDefinitionMeta() {
  if (!currentMasterData.value?.definitionId) {
    currentFields.value = [];
    currentDataAuth.value = null;
    currentDictOptionsMap.value = {};
    return;
  }

  const definitionId = String(currentMasterData.value.definitionId);
  const fields = await getModelFieldListApi(definitionId);
  currentFields.value = fields;
  currentDataAuth.value = await getCurrentModelDataAuthApi(
    definitionId,
    fields.map((field: any) => String(field.id)).filter(Boolean),
  );
  currentDictOptionsMap.value = await loadDictOptionsMap(readableFields.value);
}

async function resolveCurrentMasterData(force = false) {
  if (!ownerRouteName.value && route.name) {
    ownerRouteName.value = String(route.name);
  }

  if (!isOwnedRouteActive.value) {
    return;
  }

  if (!isInMasterDataRoute()) {
    currentMasterData.value = null;
    resolvingMasterData.value = false;
    resolvedRouteKey.value = '';
    return;
  }

  if (!force && hasResolvedCurrentRouteState()) {
    return;
  }

  if (resolvingMasterData.value && !force) {
    return;
  }

  const currentSequence = resolvingSequence.value + 1;
  resolvingSequence.value = currentSequence;
  resolvingMasterData.value = true;

  try {
    const resolveFromLoadedItems = () => {
      const accessibleItems = getAccessibleMasterDataItems(
        accessibleMasterDataRouteNames.value,
      );
      const allItems = getAccessibleMasterDataItems();

      currentMasterData.value =
        accessibleItems.find(
          (item) => item.routeName === String(route.name ?? ''),
        ) ||
        accessibleItems.find((item) => item.path === route.path) ||
        allItems.find((item) => item.routeName === String(route.name ?? '')) ||
        allItems.find((item) => item.path === route.path) ||
        null;

      resolvedRouteKey.value = currentMasterData.value
        ? getCurrentRouteCacheKey()
        : '';
    };

    currentDataAuth.value = null;
    currentFields.value = [];
    currentDictOptionsMap.value = {};
    dynamicSearchValues.value = {};
    searchPanelVisible.value = false;

    await loadDynamicMasterDataItems(force);
    resolveFromLoadedItems();

    if (currentSequence !== resolvingSequence.value) {
      return;
    }

    if (!currentMasterData.value) {
      const [firstOption] = getAccessibleMasterDataItems(
        accessibleMasterDataRouteNames.value,
      );
      if (firstOption?.path && route.path !== firstOption.path) {
        await router.replace(firstOption.path);
      }
      return;
    }

    await loadCurrentDefinitionMeta();

    if (currentSequence !== resolvingSequence.value) {
      return;
    }

    syncGridColumns();
    gridApi.reload();
  } finally {
    if (currentSequence === resolvingSequence.value) {
      resolvingMasterData.value = false;
    }
  }
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
      tableName: currentMasterData.value.tableName,
    })
    .open();
}

function handleOpenImport() {
  if (!currentMasterData.value?.tableName) {
    message.warning('请先发布数据模型后再导入主数据。');
    return;
  }

  importModalApi
    .setData({
      definitionId: currentMasterData.value.definitionId,
      fields: currentFields.value,
      masterDataTitle: currentMasterData.value.title,
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
  if (!currentMasterData.value?.definitionId || !row?.id) {
    return;
  }

  router.push({
    name: 'MdmDataHistory',
    params: {
      definitionId: String(currentMasterData.value.definitionId),
      recordId: String(row.id),
    },
  });
}

function refreshGrid() {
  message.success(`${currentMasterData.value.title}更新成功`);
  gridApi.reload();
}

function handleToggleSearch() {
  searchPanelVisible.value = !searchPanelVisible.value;
}

function handleSearch() {
  gridApi.reload();
}

function handleResetSearch() {
  dynamicSearchValues.value = {};
  gridApi.reload();
}

function handleInvalidate(row: any) {
  if (!currentMasterData.value?.tableName || !row?.id) {
    return;
  }

  Modal.confirm({
    title: '确认作废该数据吗？',
    async onOk() {
      await updateDynamicMasterDataRecordApi(
        currentMasterData.value.tableName,
        String(row.id),
        { status: 'invalid' },
      );
      message.success(`${currentMasterData.value.title}已作废`);
      gridApi.reload();
    },
  });
}

watch(
  () => route.path,
  () => {
    if (!isOwnedRouteActive.value) {
      return;
    }
    resolveCurrentMasterData();
  },
  { immediate: true },
);

watch(
  () => accessibleMasterDataSignature.value,
  () => {
    if (!isOwnedRouteActive.value) {
      return;
    }
    resolveCurrentMasterData(true);
  },
);

watch(
  () => [
    resolvingMasterData.value,
    currentMasterData.value?.definitionId ?? '',
    readableFieldSignature.value,
  ],
  async ([isResolving]) => {
    if (isResolving || !currentMasterData.value) {
      return;
    }

    await nextTick();
    syncGridColumns();
  },
  { immediate: true },
);
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    :description="currentMasterData?.description"
    :title="pageTitle"
  >
    <template #extra>
      <Space>
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
    <ImportModal @success="refreshGrid" />

    <div
      v-if="resolvingMasterData"
      class="text-text-secondary flex flex-1 items-center justify-center text-sm"
    >
      正在加载主数据模型...
    </div>

    <div v-else-if="currentMasterData" class="min-h-0 flex-1">
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

      <Card
        v-if="
          currentMasterData.dynamic &&
          searchPanelVisible &&
          dynamicSearchFields.length > 0
        "
        class="mb-4"
        :bordered="false"
      >
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="field in dynamicSearchFields"
            :key="field.code"
            class="flex flex-col gap-2"
          >
            <div class="text-sm font-medium">{{ field.name }}</div>

            <Input
              v-if="
                !['boolean', 'date', 'dict', 'timestamptz'].includes(
                  field.dataType,
                )
              "
              v-model:value="dynamicSearchValues[field.code.toLowerCase()]"
              :placeholder="`请输入${field.name}`"
              allow-clear
            />

            <Select
              v-else-if="field.code.toLowerCase() === 'status'"
              v-model:value="dynamicSearchValues[field.code.toLowerCase()]"
              :options="STATUS_SEARCH_OPTIONS"
              :placeholder="`请选择${field.name}`"
              allow-clear
            />

            <Select
              v-else-if="field.dataType === 'dict'"
              v-model:value="dynamicSearchValues[field.code.toLowerCase()]"
              :options="currentDictOptionsMap[field.dictCode || ''] || []"
              :placeholder="`请选择${field.name}`"
              allow-clear
              show-search
              option-filter-prop="label"
            />

            <Select
              v-else-if="field.dataType === 'boolean'"
              v-model:value="dynamicSearchValues[field.code.toLowerCase()]"
              :options="[
                { label: '是', value: 'true' },
                { label: '否', value: 'false' },
              ]"
              :placeholder="`请选择${field.name}`"
              allow-clear
            />

            <DatePicker.RangePicker
              v-else
              v-model:value="dynamicSearchValues[field.code.toLowerCase()]"
              class="w-full"
              :show-time="field.dataType === 'timestamptz'"
              :value-format="
                field.dataType === 'timestamptz'
                  ? 'YYYY-MM-DD HH:mm:ss'
                  : 'YYYY-MM-DD'
              "
            />
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-3">
          <Button @click="handleResetSearch">重置</Button>
          <Button type="primary" @click="handleSearch">查询</Button>
        </div>
      </Card>

      <Grid
        :form-options="currentMasterData.dynamic ? undefined : formOptions"
        :table-title="`${currentMasterData.title}记录`"
      >
        <template #toolbar-tools>
          <Button
            v-if="currentMasterData.dynamic && dynamicSearchFields.length > 0"
            type="text"
            @click="handleToggleSearch"
          >
            <IconifyIcon icon="lucide:search" class="size-4" />
          </Button>
          <Button :loading="exportLoading" type="text" @click="handleExport">
            <IconifyIcon icon="lucide:download" class="size-4" />
          </Button>
          <Button type="text" @click="handleOpenImport">
            <IconifyIcon icon="lucide:file-up" class="size-4" />
          </Button>
        </template>

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
            <Button
              v-if="row.status === 'pending_approval'"
              size="small"
              type="link"
              @click="handleAudit(row)"
            >
              审核
            </Button>
            <Button
              v-if="row.status === 'published' && canMaintainCurrentData"
              size="small"
              type="link"
              @click="handleInvalidate(row)"
            >
              作废
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
