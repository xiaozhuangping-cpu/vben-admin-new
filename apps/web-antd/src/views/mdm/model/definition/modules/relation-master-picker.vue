<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, ref, watch } from 'vue';

import {
  Button,
  DatePicker,
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import { getDictItemOptionsApi } from '#/api/mdm/dict';
import { getAuthorizedDynamicMasterDataRecordsApi } from '#/api/mdm/master-data';
import {
  getModelDefinitionDetailApi,
  getModelFieldListApi,
} from '#/api/mdm/model-definition';
import { formatDateTime } from '#/utils/date';
import {
  buildDynamicFilters,
  getDynamicSearchFields,
} from '#/views/mdm/data/maintenance/data';

const props = withDefaults(
  defineProps<{
    open: boolean;
    relatedDefinitionId?: string;
  }>(),
  {
    open: false,
    relatedDefinitionId: '',
  },
);

const emit = defineEmits<{
  (e: 'select', payload: { displayName: string; id: string; row: any }): void;
  (e: 'update:open', value: boolean): void;
}>();

const loading = ref(false);
const rows = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const definitionName = ref('');
const fields = ref<any[]>([]);
const dictOptionsMap = ref<
  Record<string, Array<{ label: string; value: string }>>
>({});
const searchValues = ref<Record<string, any>>({});

const searchFields = computed(() => getDynamicSearchFields(fields.value));
const titleField = computed(() => {
  const sortedFields = [...fields.value].toSorted(
    (a: any, b: any) => Number(a.sort ?? 10) - Number(b.sort ?? 10),
  );
  const explicitField = sortedFields.find((field: any) => field.isTitle);
  if (explicitField) {
    return explicitField;
  }
  const fallbackCodes = new Set(['code', 'entityname', 'name', 'title']);
  return (
    sortedFields.find((field: any) =>
      fallbackCodes.has(
        String(field.code || '')
          .replaceAll('_', '')
          .toLowerCase(),
      ),
    ) ??
    sortedFields.find((field: any) => field.listVisible) ??
    sortedFields[0] ??
    null
  );
});

const columns = computed<TableColumnsType>(() => {
  const visibleFields = fields.value
    .filter((field: any) => field.listVisible && field.status !== false)
    .toSorted((a: any, b: any) => Number(a.sort ?? 10) - Number(b.sort ?? 10));

  const dynamicColumns = visibleFields.map((field: any) => ({
    dataIndex: String(field.code || '').toLowerCase(),
    key: String(field.code || '').toLowerCase(),
    title: field.name,
    width: 160,
  }));

  return [
    { dataIndex: 'id', key: 'id', title: '主数据ID', width: 240 },
    ...dynamicColumns,
    {
      dataIndex: 'created_at',
      key: 'created_at',
      title: '创建时间',
      width: 180,
    },
    {
      dataIndex: 'updated_at',
      key: 'updated_at',
      title: '更新时间',
      width: 180,
    },
  ];
});

function getRowValue(row: any, fieldCode?: string) {
  const normalizedCode = String(fieldCode || '').toLowerCase();
  if (!normalizedCode) {
    return '';
  }
  return row?.[normalizedCode] ?? row?.[fieldCode || ''] ?? '';
}

function getTitleDisplayName(row: any) {
  const value = getRowValue(row, titleField.value?.code);
  return String(value || row?.entityname || row?.name || row?.id || '');
}

function getDisplayText(row: any, field: any) {
  const rawValue = getRowValue(row, field?.code);
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
    return String(rawValue) === 'true' || rawValue === true ? '是' : '否';
  }
  if (field?.dataType === 'date' || field?.dataType === 'timestamptz') {
    return formatDateTime(String(rawValue));
  }
  return String(rawValue);
}

async function loadDictOptionsMap(targetFields: any[]) {
  const dictCodes = [
    ...new Set(
      targetFields
        .filter((field: any) => field.dataType === 'dict' && field.dictCode)
        .map((field: any) => String(field.dictCode)),
    ),
  ];

  const entries = await Promise.all(
    dictCodes.map(async (dictCode) => [
      dictCode,
      await getDictItemOptionsApi(dictCode),
    ]),
  );
  dictOptionsMap.value = Object.fromEntries(entries);
}

async function loadMetadata() {
  if (!props.relatedDefinitionId) {
    definitionName.value = '';
    fields.value = [];
    dictOptionsMap.value = {};
    return;
  }

  const [definition, relatedFields] = await Promise.all([
    getModelDefinitionDetailApi(props.relatedDefinitionId),
    getModelFieldListApi(props.relatedDefinitionId),
  ]);

  definitionName.value = String(definition?.name || '');
  fields.value = relatedFields.filter((field: any) => field.status !== false);
  await loadDictOptionsMap(fields.value);
}

async function loadRows() {
  if (!props.relatedDefinitionId) {
    rows.value = [];
    total.value = 0;
    return;
  }

  loading.value = true;
  try {
    const result = await getAuthorizedDynamicMasterDataRecordsApi(
      props.relatedDefinitionId,
      {
        ...buildDynamicFilters(fields.value, searchValues.value),
        page: page.value,
        pageSize: pageSize.value,
      },
    );
    rows.value = result.items;
    total.value = result.total;
  } catch (error) {
    console.error('load relation master rows failed', error);
    message.error('加载关联主数据失败');
  } finally {
    loading.value = false;
  }
}

function handleCancel() {
  emit('update:open', false);
}

function handleSearch() {
  page.value = 1;
  void loadRows();
}

function handleReset() {
  searchValues.value = {};
  page.value = 1;
  void loadRows();
}

function handleSelect(row: any) {
  emit('select', {
    displayName: getTitleDisplayName(row),
    id: String(row?.id || ''),
    row,
  });
  emit('update:open', false);
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      return;
    }
    page.value = 1;
    searchValues.value = {};
    await loadMetadata();
    await loadRows();
  },
);

watch([page, pageSize], async () => {
  if (!props.open) {
    return;
  }
  await loadRows();
});
</script>

<template>
  <Modal
    :footer="null"
    :open="open"
    :title="
      definitionName ? `选择关联主数据：${definitionName}` : '选择关联主数据'
    "
    destroy-on-close
    width="1100px"
    @cancel="handleCancel"
  >
    <div
      v-if="searchFields.length > 0"
      class="mb-4 rounded-lg border bg-gray-50 p-4"
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="field in searchFields"
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
            v-model:value="searchValues[field.code.toLowerCase()]"
            :placeholder="`请输入${field.name}`"
            allow-clear
          />
          <Select
            v-else-if="field.dataType === 'dict'"
            v-model:value="searchValues[field.code.toLowerCase()]"
            :options="dictOptionsMap[field.dictCode || ''] || []"
            :placeholder="`请选择${field.name}`"
            allow-clear
            option-filter-prop="label"
            show-search
          />
          <Select
            v-else-if="field.dataType === 'boolean'"
            v-model:value="searchValues[field.code.toLowerCase()]"
            :options="[
              { label: '是', value: 'true' },
              { label: '否', value: 'false' },
            ]"
            :placeholder="`请选择${field.name}`"
            allow-clear
          />
          <DatePicker.RangePicker
            v-else
            v-model:value="searchValues[field.code.toLowerCase()]"
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
        <Button @click="handleReset">重置</Button>
        <Button type="primary" @click="handleSearch">查询</Button>
      </div>
    </div>

    <Table
      bordered
      :columns="columns"
      :custom-row="
        (record: any) => ({
          onDblclick: () => handleSelect(record),
        })
      "
      :data-source="rows"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
      :scroll="{ x: 960 }"
    >
      <template #bodyCell="{ column, record }">
        <template
          v-if="column.key === 'created_at' || column.key === 'updated_at'"
        >
          {{ formatDateTime(record[String(column.dataIndex)]) }}
        </template>
        <template v-else-if="column.key === 'id'">
          <div class="font-mono text-xs">{{ record.id }}</div>
        </template>
        <template v-else>
          {{
            getDisplayText(
              record,
              fields.find(
                (field: any) =>
                  String(field.code || '').toLowerCase() ===
                  String(column.key || ''),
              ),
            )
          }}
          <Tag
            v-if="
              titleField &&
              String(titleField.code || '').toLowerCase() ===
                String(column.key || '')
            "
            class="ml-2"
            color="blue"
          >
            标题
          </Tag>
        </template>
      </template>
    </Table>

    <Empty v-if="!loading && rows.length === 0" class="mt-6" />

    <div class="mt-4 flex items-center justify-between">
      <div class="text-xs text-gray-500">双击列表行可选中并回填主数据。</div>
      <Pagination
        v-model:current="page"
        v-model:page-size="pageSize"
        :page-size-options="['10', '20', '50', '100']"
        :show-size-changer="true"
        :total="total"
      />
    </div>
  </Modal>
</template>
