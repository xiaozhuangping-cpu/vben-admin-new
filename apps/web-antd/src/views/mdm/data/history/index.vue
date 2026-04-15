<script lang="ts" setup>
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  message,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  getMasterDataHistoryDetailApi,
  getMasterDataHistoryListApi,
} from '#/api/mdm/data-history';
import { getDictItemOptionsApi } from '#/api/mdm/dict';
import { getDynamicMasterDataRecordsApi } from '#/api/mdm/master-data';
import {
  getModelDefinitionDetailApi,
  getModelFieldListApi,
} from '#/api/mdm/model-definition';
import { normalizeAttachmentValue } from '#/api/mdm/storage';
import { formatDateTime } from '#/utils/date';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '\u8349\u7A3F' },
  history: { color: 'default', label: '\u5386\u53F2\u7248\u672C' },
  invalid: { color: 'default', label: '\u5931\u6548' },
  pending_approval: { color: 'warning', label: '\u5F85\u5BA1\u6838' },
  published: { color: 'success', label: '\u5DF2\u751F\u6548' },
};

const HIDDEN_DETAIL_FIELD_CODES = new Set(['created_by', 'updated_by']);

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const detailLoading = ref(false);
const definition = ref<any>(null);
const fields = ref<any[]>([]);
const rows = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dictOptionsMap = ref<
  Record<string, Array<{ label: string; value: string }>>
>({});
const relationDefinitionMetaMap = ref<
  Record<string, { tableName: string; titleFieldCode: string }>
>({});
const relationDisplayCache = ref<Record<string, string>>({});
const detailOpen = ref(false);
const currentDetail = ref<any>(null);
const detailItems = ref<
  Array<{ key: string; label: string; span: number; value: string }>
>([]);

const definitionId = computed(() => String(route.params.definitionId || ''));
const recordId = computed(() => String(route.params.recordId || ''));

const sortedFields = computed(() =>
  [...fields.value].toSorted(
    (a: any, b: any) => Number(a.sort ?? 10) - Number(b.sort ?? 10),
  ),
);

const pageTitle = computed(() =>
  definition.value?.name
    ? `${definition.value.name}\u5386\u53F2\u7248\u672C`
    : '\u4E3B\u6570\u636E\u5386\u53F2\u7248\u672C',
);

const historyColumns = computed<TableColumnsType<any>>(() => [
  {
    dataIndex: 'versionNo',
    key: 'versionNo',
    title: '\u7248\u672C\u53F7',
    width: 100,
  },
  {
    dataIndex: 'effectiveAt',
    key: 'effectiveAt',
    title: '\u751F\u6548\u65F6\u95F4',
    width: 180,
  },
  {
    dataIndex: 'submittedByName',
    key: 'submittedByName',
    title: '\u63D0\u4EA4\u4EBA',
    width: 140,
  },
  {
    dataIndex: 'status',
    key: 'status',
    title: '\u72B6\u6001',
    width: 120,
  },
  {
    dataIndex: 'createdAt',
    key: 'createdAt',
    title: '\u521B\u5EFA\u65F6\u95F4',
    width: 180,
  },
  {
    key: 'action',
    title: '\u64CD\u4F5C',
    width: 100,
    fixed: 'right',
  },
]);

const pagination = computed<TablePaginationConfig>(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count) => `\u5171 ${count} \u6761`,
  onChange: (nextPage, nextPageSize) => {
    page.value = nextPage;
    pageSize.value = nextPageSize || pageSize.value;
  },
}));

function normalizeFieldCode(code?: string) {
  return String(code || '')
    .trim()
    .toLowerCase();
}

function getStatusMeta(status?: string) {
  if (!status) {
    return { color: 'default', label: '-' };
  }
  return STATUS_MAP[status] ?? { color: 'default', label: String(status) };
}

function getSnapshotValue(snapshot: Record<string, any>, field: any) {
  const fieldCode = String(field?.code || '');
  const normalizedCode = normalizeFieldCode(fieldCode);
  return snapshot?.[normalizedCode] ?? snapshot?.[fieldCode] ?? '';
}

async function loadDictOptionsMap(targetFields: any[]) {
  const dictCodes = [
    ...new Set(
      targetFields
        .filter((field: any) => field.dataType === 'dict' && field.dictCode)
        .map((field: any) => String(field.dictCode)),
    ),
  ];

  if (dictCodes.length === 0) {
    dictOptionsMap.value = {};
    return;
  }

  const entries = await Promise.all(
    dictCodes.map(async (dictCode) => [
      dictCode,
      await getDictItemOptionsApi(dictCode),
    ]),
  );
  dictOptionsMap.value = Object.fromEntries(entries);
}

async function ensureRelationDefinitionMeta(relatedDefinitionId?: string) {
  const targetDefinitionId = String(relatedDefinitionId || '');
  if (!targetDefinitionId) {
    return null;
  }

  if (relationDefinitionMetaMap.value[targetDefinitionId]) {
    return relationDefinitionMetaMap.value[targetDefinitionId];
  }

  const [relatedDefinition, relatedFields] = await Promise.all([
    getModelDefinitionDetailApi(targetDefinitionId),
    getModelFieldListApi(targetDefinitionId),
  ]);

  const activeFields = [...relatedFields]
    .filter((field: any) => field.status !== false)
    .toSorted((a: any, b: any) => Number(a.sort ?? 10) - Number(b.sort ?? 10));
  const titleField =
    activeFields.find((field: any) => field.isTitle) ??
    activeFields.find((field: any) => field.listVisible) ??
    activeFields[0];

  const meta = {
    tableName: String(relatedDefinition?.tableName || ''),
    titleFieldCode: normalizeFieldCode(titleField?.code),
  };

  relationDefinitionMetaMap.value = {
    ...relationDefinitionMetaMap.value,
    [targetDefinitionId]: meta,
  };

  return meta;
}

async function resolveRelationDisplayName(
  relatedDefinitionId?: string,
  value?: any,
) {
  const relationId = String(value || '').trim();
  const targetDefinitionId = String(relatedDefinitionId || '');
  if (!targetDefinitionId || !relationId) {
    return '';
  }

  const cacheKey = `${targetDefinitionId}:${relationId}`;
  if (relationDisplayCache.value[cacheKey]) {
    return relationDisplayCache.value[cacheKey];
  }

  try {
    const meta = await ensureRelationDefinitionMeta(targetDefinitionId);
    if (!meta?.tableName) {
      return relationId;
    }

    const response = await getDynamicMasterDataRecordsApi(meta.tableName, {
      id: `eq.${relationId}`,
      page: 1,
      pageSize: 1,
    });
    const row = response.items[0];
    const displayName = String(
      row?.[meta.titleFieldCode] ??
        row?.entityname ??
        row?.name ??
        row?.id ??
        relationId,
    );

    relationDisplayCache.value = {
      ...relationDisplayCache.value,
      [cacheKey]: displayName,
    };

    return displayName;
  } catch (error) {
    console.error('resolve relation display name failed', error);
    return relationId;
  }
}

function formatAttachmentValue(value: any) {
  const list = normalizeAttachmentValue(value, true);
  if (list.length === 0) {
    return '-';
  }
  return list.map((item) => item.name || item.url || '-').join(', ');
}

async function formatFieldValue(field: any, rawValue: any) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return '-';
  }

  if (field?.dataType === 'dict' && field?.dictCode) {
    return (
      dictOptionsMap.value[field.dictCode]?.find(
        (item) => item.value === String(rawValue),
      )?.label ?? String(rawValue)
    );
  }

  if (field?.dataType === 'boolean') {
    return String(rawValue) === 'true' || rawValue === true
      ? '\u662F'
      : '\u5426';
  }

  if (field?.dataType === 'date' || field?.dataType === 'timestamptz') {
    return formatDateTime(String(rawValue));
  }

  if (field?.dataType === 'attachment') {
    return formatAttachmentValue(rawValue);
  }

  if (field?.dataType === 'relation_master') {
    return (
      (await resolveRelationDisplayName(field.relatedDefinitionId, rawValue)) ||
      '-'
    );
  }

  if (Array.isArray(rawValue)) {
    return rawValue.join(', ') || '-';
  }

  if (typeof rawValue === 'object') {
    return JSON.stringify(rawValue);
  }

  return String(rawValue);
}

async function buildDetailItems(snapshotObject: Record<string, any>) {
  const items = await Promise.all(
    sortedFields.value
      .filter(
        (field: any) =>
          field.status !== false &&
          !HIDDEN_DETAIL_FIELD_CODES.has(normalizeFieldCode(field.code)),
      )
      .map(async (field: any) => {
        const value = await formatFieldValue(
          field,
          getSnapshotValue(snapshotObject, field),
        );

        return {
          key: normalizeFieldCode(field.code),
          label: String(field.name || field.code || ''),
          span: String(value).length > 40 ? 2 : 1,
          value,
        };
      }),
  );

  detailItems.value = items;
}

async function loadMetadata() {
  if (!definitionId.value) {
    definition.value = null;
    fields.value = [];
    dictOptionsMap.value = {};
    return;
  }

  const [definitionDetail, fieldList] = await Promise.all([
    getModelDefinitionDetailApi(definitionId.value),
    getModelFieldListApi(definitionId.value),
  ]);

  definition.value = definitionDetail;
  fields.value = fieldList;
  await loadDictOptionsMap(fieldList);
}

async function loadList() {
  if (!definitionId.value || !recordId.value) {
    rows.value = [];
    total.value = 0;
    return;
  }

  loading.value = true;
  try {
    const result = await getMasterDataHistoryListApi(
      definitionId.value,
      recordId.value,
      {
        page: page.value,
        pageSize: pageSize.value,
      },
    );
    rows.value = result.items;
    total.value = result.total;
  } catch (error) {
    console.error('load master data history list failed', error);
    message.error(
      '\u52A0\u8F7D\u4E3B\u6570\u636E\u5386\u53F2\u7248\u672C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5',
    );
  } finally {
    loading.value = false;
  }
}

async function handleOpenDetail(record: any) {
  if (!record?.id) {
    return;
  }

  detailOpen.value = true;
  detailLoading.value = true;
  currentDetail.value = null;
  detailItems.value = [];

  try {
    const detail = await getMasterDataHistoryDetailApi(String(record.id));
    currentDetail.value = detail;
    await buildDetailItems(detail?.snapshotObject ?? {});
  } catch (error) {
    console.error('load master data history detail failed', error);
    message.error(
      '\u52A0\u8F7D\u5386\u53F2\u7248\u672C\u8BE6\u60C5\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5',
    );
  } finally {
    detailLoading.value = false;
  }
}

function handleRefresh() {
  void loadList();
}

function handleBack() {
  router.back();
}

watch(
  () => [definitionId.value, recordId.value],
  async ([nextDefinitionId, nextRecordId]) => {
    if (!nextDefinitionId || !nextRecordId) {
      rows.value = [];
      total.value = 0;
      return;
    }

    page.value = 1;
    currentDetail.value = null;
    detailOpen.value = false;
    await loadMetadata();
    await loadList();
  },
  { immediate: true },
);

watch([page, pageSize], async () => {
  if (!definitionId.value || !recordId.value) {
    return;
  }
  await loadList();
});
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col gap-4"
    :description="definition?.description || `主数据ID：${recordId || '-'}`"
    :title="pageTitle"
  >
    <template #extra>
      <Space>
        <Button @click="handleBack">返回</Button>
        <Button type="primary" @click="handleRefresh">刷新</Button>
      </Space>
    </template>

    <Card>
      <Descriptions :column="3" bordered size="small">
        <Descriptions.Item label="模型名称">
          {{ definition?.name || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="模型编码">
          {{ definition?.code || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="主数据ID">
          {{ recordId || '-' }}
        </Descriptions.Item>
      </Descriptions>
    </Card>

    <Card class="min-h-0 flex-1">
      <Table
        :columns="historyColumns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        :scroll="{ x: 860 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'effectiveAt'">
            {{ formatDateTime(record.effectiveAt) }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="getStatusMeta(record.status).color">
              {{ getStatusMeta(record.status).label }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'submittedByName'">
            {{ record.submittedByName || '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Button size="small" type="link" @click="handleOpenDetail(record)">
              详情
            </Button>
          </template>
        </template>
        <template #emptyText>
          <Empty
            :description="'\u6682\u65e0\u5386\u53f2\u7248\u672c\u6570\u636e'"
          />
        </template>
      </Table>
    </Card>

    <Drawer
      :open="detailOpen"
      :title="'\u5386\u53f2\u7248\u672c\u8be6\u60c5'"
      width="960"
      @close="detailOpen = false"
    >
      <div v-if="currentDetail">
        <Descriptions :column="2" bordered size="small">
          <Descriptions.Item :label="'\u7248\u672c\u53f7'">
            {{ currentDetail.versionNo ?? '-' }}
          </Descriptions.Item>
          <Descriptions.Item :label="'\u72b6\u6001'">
            <Tag :color="getStatusMeta(currentDetail.status).color">
              {{ getStatusMeta(currentDetail.status).label }}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item :label="'\u751f\u6548\u65f6\u95f4'">
            {{ formatDateTime(currentDetail.effectiveAt) }}
          </Descriptions.Item>
          <Descriptions.Item :label="'\u63d0\u4ea4\u4eba'">
            {{ currentDetail.submittedByName || '-' }}
          </Descriptions.Item>
          <Descriptions.Item :label="'\u521b\u5efa\u65f6\u95f4'">
            {{ formatDateTime(currentDetail.createdAt) }}
          </Descriptions.Item>
          <Descriptions.Item :label="'\u4e3b\u6570\u636eID'">
            {{ currentDetail.recordId || '-' }}
          </Descriptions.Item>
        </Descriptions>

        <Card
          class="mt-4"
          size="small"
          :title="'\u4e3b\u6570\u636e\u5feb\u7167'"
        >
          <Descriptions
            v-if="detailItems.length > 0"
            :column="2"
            bordered
            size="small"
          >
            <Descriptions.Item
              v-for="item in detailItems"
              :key="item.key"
              :label="item.label"
              :span="item.span"
            >
              {{ item.value }}
            </Descriptions.Item>
          </Descriptions>
          <Empty
            v-else-if="!detailLoading"
            :description="'\u6682\u65e0\u5feb\u7167\u8be6\u60c5'"
          />
        </Card>
      </div>
      <div v-else-if="!detailLoading" class="py-8">
        <Empty :description="'\u6682\u65e0\u8be6\u60c5\u6570\u636e'" />
      </div>
    </Drawer>
  </Page>
</template>
