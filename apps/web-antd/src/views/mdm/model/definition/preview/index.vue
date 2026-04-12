<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Drawer,
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
} from 'ant-design-vue';

import { getDictItemOptionsApi } from '#/api/mdm/dict';
import { getModelFieldListApi } from '#/api/mdm/model-definition';
import { getModelRelationshipListApi } from '#/api/mdm/model-relationship';

import { getDisplayDraftStorageKey, getDisplayStorageKey, getSectionFields, normalizeDesignerSchema } from '../form-designer';
import type { CompositeModelMeta, FormDesignerSummaryColumn } from '../form-designer';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const fields = ref<any[]>([]);
const relationships = ref<any[]>([]);
const schema = ref<any>({ sections: [], version: 1 });
const compositeSchemaMap = ref<Record<string, any>>({});
const compositeTableRows = ref<Record<string, Record<string, any>[]>>({});
const compositeDrawerOpen = ref(false);
const compositeDrawerTitle = ref('');
const compositeDrawerDefinitionId = ref('');
const compositeDrawerEditIndex = ref<null | number>(null);
const compositeDrawerValues = ref<Record<string, any>>({});
const dictItemOptionsMap = ref<
  Record<string, Array<{ label: string; value: string }>>
>({});
const formValues = ref<Record<string, any>>({});

const modelId = computed(() => String(route.params.id || ''));

const compositePaletteModels = computed<CompositeModelMeta[]>(() =>
  relationships.value
    .filter(
      (item: any) =>
        item.sourceDefinitionId === modelId.value &&
        item.targetDefinitionId &&
        item.targetModelType === 'composite' &&
        item.status !== 'obsolete' &&
        ['1:1', '1:N'].includes(item.relationType),
    )
    .map((item: any) => ({
      definitionId: String(item.targetDefinitionId),
      label: item.targetModelName || item.targetModelCode || '组合模型',
      relationType: item.relationType,
    })),
);

const visibleSections = computed(() =>
  schema.value.sections.map((section: any) =>
    section.layout === 'tabs'
      ? {
          ...section,
          tabs: section.tabs.map((tab: any) => ({
            ...tab,
            items: tab.items.filter((item: any) => item.visible),
          })),
        }
      : {
          ...section,
          items: section.items.filter((item: any) => item.visible),
        },
  ),
);

const compositeDrawerSections = computed(() =>
  getCompositeSections(compositeDrawerDefinitionId.value),
);

function loadLocalSchema() {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const draftRaw = window.sessionStorage.getItem(
      getDisplayDraftStorageKey(modelId.value),
    );
    const raw =
      draftRaw ||
      window.localStorage.getItem(getDisplayStorageKey(modelId.value));
    const stored = raw ? JSON.parse(raw) : null;
    schema.value = normalizeDesignerSchema(
      fields.value,
      stored,
      compositePaletteModels.value,
    );
  } catch {
    schema.value = normalizeDesignerSchema(
      fields.value,
      null,
      compositePaletteModels.value,
    );
  }
}

function buildInitialValues() {
  formValues.value = Object.fromEntries(
    visibleSections.value
      .flatMap((section: any) => getSectionFields(section))
      .filter((item: any) => item.component !== 'CompositeModel')
      .map((item: any) => [
        item.fieldCode.toLowerCase(),
        item.defaultValue ?? undefined,
      ]),
  );
}

function getDictOptionsByCode(dictCode?: string) {
  if (!dictCode) {
    return [];
  }
  return dictItemOptionsMap.value[dictCode] ?? [];
}

async function ensureDictOptions(dictCode?: string) {
  if (!dictCode || dictItemOptionsMap.value[dictCode]) {
    return;
  }
  const options = await getDictItemOptionsApi(dictCode);
  dictItemOptionsMap.value = {
    ...dictItemOptionsMap.value,
    [dictCode]: options,
  };
}

async function preloadSchemaDictOptions() {
  const dictCodes: string[] = [
    ...new Set<string>(
      schema.value.sections.flatMap((section: any) =>
        getSectionFields(section)
          .filter((item: any) => item.component === 'Dict' && item.dictCode)
          .map((item: any) => String(item.dictCode)),
      ),
    ),
  ];
  await Promise.all(dictCodes.map((dictCode) => ensureDictOptions(dictCode)));
}

async function loadPage() {
  if (!modelId.value) {
    return;
  }
  loading.value = true;
  try {
    const [modelFields, relationshipResponse] = await Promise.all([
      getModelFieldListApi(modelId.value),
      getModelRelationshipListApi({ pageSize: 1000 }),
    ]);
    fields.value = modelFields.filter((item: any) => item.status !== false);
    relationships.value = relationshipResponse.items;
    loadLocalSchema();
    await preloadSchemaDictOptions();
    await loadCompositeSchemas();
    buildInitialValues();
  } finally {
    loading.value = false;
  }
}

function handleSubmit() {
  message.success('预览页仅用于展示维护表单，不执行真实保存。');
}

function handleReset() {
  buildInitialValues();
  compositeTableRows.value = {};
  compositeDrawerOpen.value = false;
  compositeDrawerValues.value = {};
  message.success('表单已重置');
}

function renderPlaceholder(item: any) {
  return item.placeholder || `请输入${item.label}`;
}

function getAttachmentButtonText(item: any) {
  return item.attachmentMode === 'multiple' ? '上传多个附件' : '上传附件';
}

function isAttachmentMultiple(item: any) {
  return item.attachmentMode === 'multiple';
}

function getCompositeDisplayModeLabel(displayMode?: string) {
  switch (displayMode) {
    case 'tab': {
      return '页签';
    }
    case 'table': {
      return '明细表';
    }
    default: {
      return '面板';
    }
  }
}

function getStoredSchemaByModelId(targetModelId: string) {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const draftRaw = window.sessionStorage.getItem(
      getDisplayDraftStorageKey(targetModelId),
    );
    const raw =
      draftRaw ||
      window.localStorage.getItem(getDisplayStorageKey(targetModelId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function loadCompositeSchemas() {
  const compositeIds: string[] = [
    ...new Set<string>(
      schema.value.sections.flatMap((section: any) =>
        getSectionFields(section)
          .filter(
            (item: any) =>
              item.component === 'CompositeModel' && item.relatedDefinitionId,
          )
          .map((item: any) => String(item.relatedDefinitionId)),
      ),
    ),
  ];

  const entries = await Promise.all(
    compositeIds.map(async (definitionId) => {
      const compositeFields = await getModelFieldListApi(definitionId);
      const normalized = normalizeDesignerSchema(
        compositeFields.filter((item: any) => item.status !== false),
        getStoredSchemaByModelId(definitionId),
      );
      return [definitionId, normalized] as const;
    }),
  );

  compositeSchemaMap.value = Object.fromEntries(entries);
  const compositeDictCodes = [
    ...new Set<string>(
      entries.flatMap(([, compositeSchema]) =>
        compositeSchema.sections.flatMap((section: any) =>
          getSectionFields(section)
            .filter((item: any) => item.component === 'Dict' && item.dictCode)
            .map((item: any) => String(item.dictCode)),
        ),
      ),
    ),
  ];
  await Promise.all(
    compositeDictCodes.map((dictCode) => ensureDictOptions(dictCode)),
  );
}

function getCompositeSections(relatedDefinitionId?: string) {
  if (!relatedDefinitionId) {
    return [];
  }
  const schemaValue = compositeSchemaMap.value[relatedDefinitionId];
  if (!schemaValue?.sections) {
    return [];
  }
  return schemaValue.sections.map((section: any) =>
    section.layout === 'tabs'
      ? {
          ...section,
          tabs: section.tabs.map((tab: any) => ({
            ...tab,
            items: tab.items.filter((item: any) => item.visible),
          })),
        }
      : {
          ...section,
          items: section.items.filter((item: any) => item.visible),
        },
  );
}

function getCompositeFieldLabels(relatedDefinitionId?: string) {
  return getCompositeSections(relatedDefinitionId).flatMap((section: any) =>
    getSectionFields(section).map((item: any) => item.label),
  );
}

function getCompositeLeafFields(relatedDefinitionId?: string) {
  return getCompositeSections(relatedDefinitionId).flatMap((section: any) =>
    getSectionFields(section).filter(
      (item: any) => item.component !== 'CompositeModel',
    ),
  );
}

function getCompositeTableSummaryFields(item: any) {
  const relatedDefinitionId = item?.relatedDefinitionId;
  const allFields = getCompositeLeafFields(relatedDefinitionId);
  const summaryColumns = Array.isArray(item?.summaryColumns)
    ? item.summaryColumns.filter((column: any) => column?.fieldCode)
    : [];
  let summaryFieldCodes: string[] = [];
  if (summaryColumns.length > 0) {
    summaryFieldCodes = summaryColumns.map((column: any) => column.fieldCode);
  } else if (Array.isArray(item?.summaryFieldCodes)) {
    summaryFieldCodes = item.summaryFieldCodes;
  }

  if (summaryFieldCodes.length === 0) {
    return allFields.slice(0, 5);
  }

  const fieldMap = new Map(
    allFields.map((field: any) => [field.fieldCode, field]),
  );
  return summaryFieldCodes
    .map((fieldCode: string) => fieldMap.get(fieldCode))
    .filter(Boolean);
}

function getCompositeTableSummaryColumns(item: any) {
  const summaryFields = getCompositeTableSummaryFields(item);
  const configuredColumns = Array.isArray(item?.summaryColumns)
    ? item.summaryColumns.filter((column: any) => column?.fieldCode)
    : [];
  const configuredMap = new Map<string, FormDesignerSummaryColumn>(
    configuredColumns.map((column: FormDesignerSummaryColumn) => [
      column.fieldCode,
      column,
    ]),
  );

  return summaryFields.map((field: any) => ({
    field,
    fieldCode: field.fieldCode,
    width: configuredMap.get(field.fieldCode)?.width,
    wrap: configuredMap.get(field.fieldCode)?.wrap ?? false,
  }));
}

function getCompositeRows(relatedDefinitionId?: string) {
  if (!relatedDefinitionId) {
    return [];
  }
  return compositeTableRows.value[relatedDefinitionId] ?? [];
}

function getCompositeDisplayValue(value: any, field?: any) {
  if (field?.component === 'Attachment') {
    if (!value) {
      return '-';
    }
    if (Array.isArray(value)) {
      return `${value.length} 个附件`;
    }
    return '1 个附件';
  }
  if (field?.component === 'Switch') {
    return value ? '是' : '否';
  }
  if (field?.component === 'Dict' && field?.dictCode) {
    const options = getDictOptionsByCode(field.dictCode);
    const matched = options.find((item) => item.value === value);
    return matched?.label ?? value ?? '-';
  }
  if (Array.isArray(value)) {
    return value.join('、') || '-';
  }
  return value ?? '-';
}

function getCompositeTableColumns(item: any) {
  const summaryColumns = getCompositeTableSummaryColumns(item);
  return [
    { dataIndex: '__seq', key: '__seq', title: '序号', width: 72 },
    ...summaryColumns.map((column: any) => ({
      customCell: () =>
        column.wrap
          ? {
              style: {
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              },
            }
          : {},
      dataIndex: column.fieldCode.toLowerCase(),
      ellipsis: column.wrap ? false : true,
      key: column.fieldCode,
      title: column.field.label,
      width: column.width,
    })),
    { dataIndex: '__action', key: '__action', title: '操作', width: 160 },
  ];
}

function getCompositeSummaryFieldByDataIndex(item: any, dataIndex: unknown) {
  const normalizedDataIndex = String(dataIndex || '');
  return getCompositeTableSummaryColumns(item).find(
    (column: any) => column.fieldCode.toLowerCase() === normalizedDataIndex,
  )?.field;
}

function getCompositeInitialValues(relatedDefinitionId?: string) {
  return Object.fromEntries(
    getCompositeLeafFields(relatedDefinitionId).map((item: any) => [
      item.fieldCode.toLowerCase(),
      item.defaultValue ?? undefined,
    ]),
  );
}

function openCompositeDrawer(item: any, editIndex?: number) {
  const relatedDefinitionId = String(item.relatedDefinitionId || '');
  compositeDrawerDefinitionId.value = relatedDefinitionId;
  compositeDrawerEditIndex.value = editIndex === undefined ? null : editIndex;
  compositeDrawerTitle.value =
    editIndex === undefined ? `新增${item.label}` : `编辑${item.label}`;
  compositeDrawerValues.value =
    editIndex === undefined
      ? getCompositeInitialValues(relatedDefinitionId)
      : { ...getCompositeRows(relatedDefinitionId)[editIndex]! };
  compositeDrawerOpen.value = true;
}

function closeCompositeDrawer() {
  compositeDrawerOpen.value = false;
  compositeDrawerDefinitionId.value = '';
  compositeDrawerEditIndex.value = null;
  compositeDrawerTitle.value = '';
  compositeDrawerValues.value = {};
}

function saveCompositeDrawer() {
  const definitionId = compositeDrawerDefinitionId.value;
  if (!definitionId) {
    return;
  }
  const currentRows = [...getCompositeRows(definitionId)];
  if (compositeDrawerEditIndex.value === null) {
    currentRows.push({
      ...compositeDrawerValues.value,
      id: `${definitionId}-${Date.now()}`,
    });
  } else {
    currentRows.splice(compositeDrawerEditIndex.value, 1, {
      ...currentRows[compositeDrawerEditIndex.value],
      ...compositeDrawerValues.value,
    });
  }
  compositeTableRows.value = {
    ...compositeTableRows.value,
    [definitionId]: currentRows,
  };
  closeCompositeDrawer();
  message.success('明细已更新');
}

function removeCompositeRow(relatedDefinitionId: string, rowIndex: number) {
  const currentRows = [...getCompositeRows(relatedDefinitionId)];
  currentRows.splice(rowIndex, 1);
  compositeTableRows.value = {
    ...compositeTableRows.value,
    [relatedDefinitionId]: currentRows,
  };
  message.success('明细已删除');
}

onMounted(async () => {
  await loadPage();
});
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="基于当前模型字段和显示配置生成的真实维护表单预览页。"
    title="预览"
  >
    <template #extra>
      <Space>
        <Button
          @click="
            router.push({
              name: 'MdmModelDefinitionManage',
              params: { id: modelId },
              query: { tab: 'display' },
            })
          "
        >
          返回设计
        </Button>
        <Button @click="handleReset">重置</Button>
        <Button type="primary" @click="handleSubmit">保存</Button>
      </Space>
    </template>

    <Spin :spinning="loading" class="min-h-0 flex-1">
      <Card class="h-full min-h-0" title="维护表单">
        <template v-if="visibleSections.length > 0">
          <div class="grid grid-cols-24 gap-4">
            <div
              v-for="section in visibleSections"
              :key="section.id"
              class="rounded-xl border border-gray-200 bg-white"
              :style="{
                gridColumn: `span ${Math.min(section.span || 24, 24)} / span ${Math.min(section.span || 24, 24)}`,
              }"
            >
              <Collapse
                v-if="section.layout !== 'tabs' && section.collapsible"
                :active-key="section.defaultExpanded ? [section.id] : []"
                ghost
              >
                <Collapse.Panel :key="section.id" :header="section.title">
                  <div class="grid grid-cols-24 gap-4">
                    <div
                      v-for="item in section.items"
                      :key="item.id"
                      :style="{
                        gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                      }"
                    >
                      <div
                        class="p-3"
                        :class="
                          item.labelLayout === 'horizontal'
                            ? 'grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3'
                            : 'space-y-2'
                        "
                      >
                        <div
                          class="text-sm font-medium text-gray-700"
                          :class="
                            item.labelLayout === 'horizontal'
                              ? 'text-right'
                              : ''
                          "
                        >
                          {{ item.label }}
                          <span v-if="item.required" class="ml-1 text-red-500"
                            >*</span
                          >
                        </div>
                        <div class="space-y-2 text-left">
                          <div
                            v-if="item.component === 'CompositeModel'"
                            class="rounded-lg border border-amber-200 bg-amber-50/70 p-3"
                          >
                            <template v-if="item.displayMode === 'table'">
                              <div
                                class="flex items-center justify-between gap-2"
                              >
                                <div>
                                  <div class="font-medium text-amber-900">
                                    {{ item.label }}
                                  </div>
                                  <div class="mt-1 text-xs text-gray-500">
                                    明细表仅展示摘要列，新增和编辑通过抽屉完成。
                                  </div>
                                </div>
                                <Space>
                                  <Tag color="gold">
                                    {{ item.relationType || '组合模型' }}
                                  </Tag>
                                  <Button
                                    size="small"
                                    type="primary"
                                    @click="openCompositeDrawer(item)"
                                  >
                                    新增明细
                                  </Button>
                                </Space>
                              </div>
                              <Table
                                class="mt-3"
                                :columns="getCompositeTableColumns(item)"
                                :data-source="
                                  getCompositeRows(item.relatedDefinitionId)
                                "
                                :pagination="false"
                                row-key="id"
                                size="small"
                              >
                                <template #bodyCell="{ column, record, index }">
                                  <template v-if="column.key === '__seq'">
                                    {{ Number(index) + 1 }}
                                  </template>
                                  <template
                                    v-else-if="column.key === '__action'"
                                  >
                                    <Space size="small">
                                      <Button
                                        size="small"
                                        type="link"
                                        @click="
                                          openCompositeDrawer(
                                            item,
                                            Number(index),
                                          )
                                        "
                                      >
                                        编辑
                                      </Button>
                                      <Button
                                        danger
                                        size="small"
                                        type="link"
                                        @click="
                                          removeCompositeRow(
                                            String(item.relatedDefinitionId),
                                            Number(index),
                                          )
                                        "
                                      >
                                        删除
                                      </Button>
                                    </Space>
                                  </template>
                                  <template v-else>
                                    {{
                                      getCompositeDisplayValue(
                                        record[String(column.dataIndex)],
                                        getCompositeSummaryFieldByDataIndex(
                                          item,
                                          column.dataIndex,
                                        ),
                                      )
                                    }}
                                  </template>
                                </template>
                              </Table>
                            </template>
                            <template v-else>
                              <div
                                class="flex items-center justify-between gap-2"
                              >
                                <div class="font-medium text-amber-900">
                                  {{ item.label }}
                                </div>
                                <Tag color="gold">
                                  {{ item.relationType || '组合模型' }}
                                </Tag>
                              </div>
                              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                                <Tag>{{
                                  getCompositeDisplayModeLabel(item.displayMode)
                                }}</Tag>
                                <Tag color="blue"> 已纳入子模型设计 </Tag>
                              </div>
                              <div
                                v-if="
                                  getCompositeFieldLabels(
                                    item.relatedDefinitionId,
                                  ).length > 0
                                "
                                class="mt-3 flex flex-wrap gap-2"
                              >
                                <Tag
                                  v-for="label in getCompositeFieldLabels(
                                    item.relatedDefinitionId,
                                  )"
                                  :key="`${item.id}-${label}`"
                                >
                                  {{ label }}
                                </Tag>
                              </div>
                              <div v-else class="mt-3 text-xs text-gray-500">
                                当前组合模型尚未完成字段布局设计。
                              </div>
                            </template>
                          </div>
                          <Input
                            v-else-if="item.component === 'Input'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :placeholder="renderPlaceholder(item)"
                            :readonly="item.readonly"
                          />
                          <Input.TextArea
                            v-else-if="item.component === 'Textarea'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :placeholder="renderPlaceholder(item)"
                            :readonly="item.readonly"
                            :rows="4"
                          />
                          <InputNumber
                            v-else-if="item.component === 'InputNumber'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :disabled="item.readonly"
                            class="w-full"
                            :placeholder="renderPlaceholder(item)"
                          />
                          <DatePicker
                            v-else-if="item.component === 'DatePicker'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :disabled="item.readonly"
                            class="w-full"
                          />
                          <Select
                            v-else-if="item.component === 'Dict'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :disabled="item.readonly"
                            class="w-full"
                            :options="getDictOptionsByCode(item.dictCode)"
                            :placeholder="renderPlaceholder(item)"
                          />
                          <Switch
                            v-else-if="item.component === 'Switch'"
                            v-model:checked="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :disabled="item.readonly"
                          />
                          <Upload
                            v-else-if="item.component === 'Attachment'"
                            :max-count="isAttachmentMultiple(item) ? 9 : 1"
                            :multiple="isAttachmentMultiple(item)"
                            :disabled="item.readonly"
                          >
                            <Button>{{ getAttachmentButtonText(item) }}</Button>
                          </Upload>
                          <Input
                            v-else
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :placeholder="renderPlaceholder(item)"
                            :readonly="item.readonly"
                          />
                          <div v-if="item.help" class="text-xs text-gray-400">
                            {{ item.help }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Collapse.Panel>
              </Collapse>

              <div v-else-if="section.layout !== 'tabs'" class="p-4">
                <div class="mb-4 text-base font-medium">
                  {{ section.title }}
                </div>
                <div class="grid grid-cols-24 gap-4">
                  <div
                    v-for="item in section.items"
                    :key="item.id"
                    :style="{
                      gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                    }"
                  >
                    <div
                      class="p-3"
                      :class="
                        item.labelLayout === 'horizontal'
                          ? 'grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3'
                          : 'space-y-2'
                      "
                    >
                      <div
                        class="text-sm font-medium text-gray-700"
                        :class="
                          item.labelLayout === 'horizontal' ? 'text-right' : ''
                        "
                      >
                        {{ item.label }}
                        <span v-if="item.required" class="ml-1 text-red-500"
                          >*</span
                        >
                      </div>
                      <div class="space-y-2 text-left">
                        <div
                          v-if="item.component === 'CompositeModel'"
                          class="rounded-lg border border-amber-200 bg-amber-50/70 p-3"
                        >
                          <template v-if="item.displayMode === 'table'">
                            <div
                              class="flex items-center justify-between gap-2"
                            >
                              <div>
                                <div class="font-medium text-amber-900">
                                  {{ item.label }}
                                </div>
                                <div class="mt-1 text-xs text-gray-500">
                                  明细表仅展示摘要列，新增和编辑通过抽屉完成。
                                </div>
                              </div>
                              <Space>
                                <Tag color="gold">
                                  {{ item.relationType || '组合模型' }}
                                </Tag>
                                <Button
                                  size="small"
                                  type="primary"
                                  @click="openCompositeDrawer(item)"
                                >
                                  新增明细
                                </Button>
                              </Space>
                            </div>
                            <Table
                              class="mt-3"
                              :columns="getCompositeTableColumns(item)"
                              :data-source="
                                getCompositeRows(item.relatedDefinitionId)
                              "
                              :pagination="false"
                              row-key="id"
                              size="small"
                            >
                              <template #bodyCell="{ column, record, index }">
                                <template v-if="column.key === '__seq'">
                                  {{ Number(index) + 1 }}
                                </template>
                                <template v-else-if="column.key === '__action'">
                                  <Space size="small">
                                    <Button
                                      size="small"
                                      type="link"
                                      @click="
                                        openCompositeDrawer(item, Number(index))
                                      "
                                    >
                                      编辑
                                    </Button>
                                    <Button
                                      danger
                                      size="small"
                                      type="link"
                                      @click="
                                        removeCompositeRow(
                                          String(item.relatedDefinitionId),
                                          Number(index),
                                        )
                                      "
                                    >
                                      删除
                                    </Button>
                                  </Space>
                                </template>
                                <template v-else>
                                  {{
                                    getCompositeDisplayValue(
                                      record[String(column.dataIndex)],
                                      getCompositeSummaryFieldByDataIndex(
                                        item,
                                        column.dataIndex,
                                      ),
                                    )
                                  }}
                                </template>
                              </template>
                            </Table>
                          </template>
                          <template v-else>
                            <div
                              class="flex items-center justify-between gap-2"
                            >
                              <div class="font-medium text-amber-900">
                                {{ item.label }}
                              </div>
                              <Tag color="gold">
                                {{ item.relationType || '组合模型' }}
                              </Tag>
                            </div>
                            <div class="mt-2 flex flex-wrap gap-2 text-xs">
                              <Tag>{{
                                getCompositeDisplayModeLabel(item.displayMode)
                              }}</Tag>
                              <Tag color="blue">已纳入子模型设计</Tag>
                            </div>
                            <div
                              v-if="
                                getCompositeFieldLabels(
                                  item.relatedDefinitionId,
                                ).length > 0
                              "
                              class="mt-3 flex flex-wrap gap-2"
                            >
                              <Tag
                                v-for="label in getCompositeFieldLabels(
                                  item.relatedDefinitionId,
                                )"
                                :key="`${item.id}-${label}`"
                              >
                                {{ label }}
                              </Tag>
                            </div>
                            <div v-else class="mt-3 text-xs text-gray-500">
                              当前组合模型尚未完成字段布局设计。
                            </div>
                          </template>
                        </div>
                        <Input
                          v-else-if="item.component === 'Input'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                        />
                        <Input.TextArea
                          v-else-if="item.component === 'Textarea'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                          :rows="4"
                        />
                        <InputNumber
                          v-else-if="item.component === 'InputNumber'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                          :placeholder="renderPlaceholder(item)"
                        />
                        <DatePicker
                          v-else-if="item.component === 'DatePicker'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                        />
                        <Select
                          v-else-if="item.component === 'Dict'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                          :options="getDictOptionsByCode(item.dictCode)"
                          :placeholder="renderPlaceholder(item)"
                        />
                        <Switch
                          v-else-if="item.component === 'Switch'"
                          v-model:checked="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                        />
                        <Upload
                          v-else-if="item.component === 'Attachment'"
                          :max-count="isAttachmentMultiple(item) ? 9 : 1"
                          :multiple="isAttachmentMultiple(item)"
                          :disabled="item.readonly"
                        >
                          <Button>{{ getAttachmentButtonText(item) }}</Button>
                        </Upload>
                        <Input
                          v-else
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                        />
                        <div v-if="item.help" class="text-xs text-gray-400">
                          {{ item.help }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="p-4">
                <div class="mb-4 text-base font-medium">
                  {{ section.title }}
                </div>
                <Tabs
                  :active-key="
                    section.defaultActiveTabId || section.tabs[0]?.id
                  "
                >
                  <Tabs.TabPane
                    v-for="tab in section.tabs"
                    :key="tab.id"
                    :tab="tab.title"
                  >
                    <div class="grid grid-cols-24 gap-4">
                      <div
                        v-for="item in tab.items"
                        :key="item.id"
                        :style="{
                          gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                        }"
                      >
                        <div
                          class="p-3"
                          :class="
                            item.labelLayout === 'horizontal'
                              ? 'grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3'
                              : 'space-y-2'
                          "
                        >
                          <div
                            class="text-sm font-medium text-gray-700"
                            :class="
                              item.labelLayout === 'horizontal'
                                ? 'text-right'
                                : ''
                            "
                          >
                            {{ item.label }}
                            <span v-if="item.required" class="ml-1 text-red-500"
                              >*</span
                            >
                          </div>
                          <div class="space-y-2 text-left">
                            <div
                              v-if="item.component === 'CompositeModel'"
                              class="rounded-lg border border-amber-200 bg-amber-50/70 p-3"
                            >
                              <template v-if="item.displayMode === 'table'">
                                <div
                                  class="flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div class="font-medium text-amber-900">
                                      {{ item.label }}
                                    </div>
                                    <div class="mt-1 text-xs text-gray-500">
                                      明细表仅展示摘要列，新增和编辑通过抽屉完成。
                                    </div>
                                  </div>
                                  <Space>
                                    <Tag color="gold">
                                      {{ item.relationType || '组合模型' }}
                                    </Tag>
                                    <Button
                                      size="small"
                                      type="primary"
                                      @click="openCompositeDrawer(item)"
                                    >
                                      新增明细
                                    </Button>
                                  </Space>
                                </div>
                                <Table
                                  class="mt-3"
                                  :columns="getCompositeTableColumns(item)"
                                  :data-source="
                                    getCompositeRows(item.relatedDefinitionId)
                                  "
                                  :pagination="false"
                                  row-key="id"
                                  size="small"
                                >
                                  <template
                                    #bodyCell="{ column, record, index }"
                                  >
                                    <template v-if="column.key === '__seq'">
                                      {{ Number(index) + 1 }}
                                    </template>
                                    <template
                                      v-else-if="column.key === '__action'"
                                    >
                                      <Space size="small">
                                        <Button
                                          size="small"
                                          type="link"
                                          @click="
                                            openCompositeDrawer(
                                              item,
                                              Number(index),
                                            )
                                          "
                                        >
                                          编辑
                                        </Button>
                                        <Button
                                          danger
                                          size="small"
                                          type="link"
                                          @click="
                                            removeCompositeRow(
                                              String(item.relatedDefinitionId),
                                              Number(index),
                                            )
                                          "
                                        >
                                          删除
                                        </Button>
                                      </Space>
                                    </template>
                                    <template v-else>
                                      {{
                                        getCompositeDisplayValue(
                                          record[String(column.dataIndex)],
                                          getCompositeSummaryFieldByDataIndex(
                                            item,
                                            column.dataIndex,
                                          ),
                                        )
                                      }}
                                    </template>
                                  </template>
                                </Table>
                              </template>
                              <template v-else>
                                <div
                                  class="flex items-center justify-between gap-2"
                                >
                                  <div class="font-medium text-amber-900">
                                    {{ item.label }}
                                  </div>
                                  <Tag color="gold">
                                    {{ item.relationType || '组合模型' }}
                                  </Tag>
                                </div>
                                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                                  <Tag>{{
                                    getCompositeDisplayModeLabel(
                                      item.displayMode,
                                    )
                                  }}</Tag>
                                  <Tag color="blue">已纳入子模型设计</Tag>
                                </div>
                                <div
                                  v-if="
                                    getCompositeFieldLabels(
                                      item.relatedDefinitionId,
                                    ).length > 0
                                  "
                                  class="mt-3 flex flex-wrap gap-2"
                                >
                                  <Tag
                                    v-for="label in getCompositeFieldLabels(
                                      item.relatedDefinitionId,
                                    )"
                                    :key="`${item.id}-${label}`"
                                  >
                                    {{ label }}
                                  </Tag>
                                </div>
                                <div v-else class="mt-3 text-xs text-gray-500">
                                  当前组合模型尚未完成字段布局设计。
                                </div>
                              </template>
                            </div>
                            <Input
                              v-else-if="item.component === 'Input'"
                              v-model:value="
                                formValues[item.fieldCode.toLowerCase()]
                              "
                              :placeholder="renderPlaceholder(item)"
                              :readonly="item.readonly"
                            />
                            <Input.TextArea
                              v-else-if="item.component === 'Textarea'"
                              v-model:value="
                                formValues[item.fieldCode.toLowerCase()]
                              "
                              :placeholder="renderPlaceholder(item)"
                              :readonly="item.readonly"
                              :rows="4"
                            />
                            <InputNumber
                              v-else-if="item.component === 'InputNumber'"
                              v-model:value="
                                formValues[item.fieldCode.toLowerCase()]
                              "
                              :disabled="item.readonly"
                              class="w-full"
                              :placeholder="renderPlaceholder(item)"
                            />
                            <DatePicker
                              v-else-if="item.component === 'DatePicker'"
                              v-model:value="
                                formValues[item.fieldCode.toLowerCase()]
                              "
                              :disabled="item.readonly"
                              class="w-full"
                            />
                            <Select
                              v-else-if="item.component === 'Dict'"
                              v-model:value="
                                formValues[item.fieldCode.toLowerCase()]
                              "
                              :disabled="item.readonly"
                              class="w-full"
                              :options="getDictOptionsByCode(item.dictCode)"
                              :placeholder="renderPlaceholder(item)"
                            />
                            <Switch
                              v-else-if="item.component === 'Switch'"
                              v-model:checked="
                                formValues[item.fieldCode.toLowerCase()]
                              "
                              :disabled="item.readonly"
                            />
                            <Upload
                              v-else-if="item.component === 'Attachment'"
                              :max-count="isAttachmentMultiple(item) ? 9 : 1"
                              :multiple="isAttachmentMultiple(item)"
                              :disabled="item.readonly"
                            >
                              <Button>{{
                                getAttachmentButtonText(item)
                              }}</Button>
                            </Upload>
                            <Input
                              v-else
                              v-model:value="
                                formValues[item.fieldCode.toLowerCase()]
                              "
                              :placeholder="renderPlaceholder(item)"
                              :readonly="item.readonly"
                            />
                            <div v-if="item.help" class="text-xs text-gray-400">
                              {{ item.help }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Tabs.TabPane>
                </Tabs>
              </div>
            </div>
          </div>
        </template>

        <Empty v-else description="当前模型还没有可预览的表单设计" />
      </Card>

      <Drawer
        :open="compositeDrawerOpen"
        :title="compositeDrawerTitle"
        width="720"
        @close="closeCompositeDrawer"
      >
        <div class="space-y-6">
          <template
            v-for="section in compositeDrawerSections"
            :key="section.id"
          >
            <div class="rounded-xl border border-gray-200 bg-white p-4">
              <div class="mb-4 text-base font-medium">{{ section.title }}</div>

              <div
                v-if="section.layout !== 'tabs'"
                class="grid grid-cols-24 gap-4"
              >
                <div
                  v-for="item in section.items"
                  :key="item.id"
                  :style="{
                    gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                  }"
                >
                  <div class="space-y-2">
                    <div class="text-sm font-medium text-gray-700">
                      {{ item.label }}
                    </div>
                    <Input
                      v-if="item.component === 'Input'"
                      v-model:value="
                        compositeDrawerValues[item.fieldCode.toLowerCase()]
                      "
                      :placeholder="renderPlaceholder(item)"
                      :readonly="item.readonly"
                    />
                    <Input.TextArea
                      v-else-if="item.component === 'Textarea'"
                      v-model:value="
                        compositeDrawerValues[item.fieldCode.toLowerCase()]
                      "
                      :placeholder="renderPlaceholder(item)"
                      :readonly="item.readonly"
                      :rows="4"
                    />
                    <InputNumber
                      v-else-if="item.component === 'InputNumber'"
                      v-model:value="
                        compositeDrawerValues[item.fieldCode.toLowerCase()]
                      "
                      :disabled="item.readonly"
                      class="w-full"
                      :placeholder="renderPlaceholder(item)"
                    />
                    <DatePicker
                      v-else-if="item.component === 'DatePicker'"
                      v-model:value="
                        compositeDrawerValues[item.fieldCode.toLowerCase()]
                      "
                      :disabled="item.readonly"
                      class="w-full"
                    />
                    <Select
                      v-else-if="item.component === 'Dict'"
                      v-model:value="
                        compositeDrawerValues[item.fieldCode.toLowerCase()]
                      "
                      :disabled="item.readonly"
                      class="w-full"
                      :options="getDictOptionsByCode(item.dictCode)"
                      :placeholder="renderPlaceholder(item)"
                    />
                    <Switch
                      v-else-if="item.component === 'Switch'"
                      v-model:checked="
                        compositeDrawerValues[item.fieldCode.toLowerCase()]
                      "
                      :disabled="item.readonly"
                    />
                    <Upload
                      v-else-if="item.component === 'Attachment'"
                      :max-count="isAttachmentMultiple(item) ? 9 : 1"
                      :multiple="isAttachmentMultiple(item)"
                      :disabled="item.readonly"
                    >
                      <Button>{{ getAttachmentButtonText(item) }}</Button>
                    </Upload>
                    <Input
                      v-else
                      v-model:value="
                        compositeDrawerValues[item.fieldCode.toLowerCase()]
                      "
                      :placeholder="renderPlaceholder(item)"
                      :readonly="item.readonly"
                    />
                  </div>
                </div>
              </div>

              <Tabs
                v-else
                :active-key="section.defaultActiveTabId || section.tabs[0]?.id"
              >
                <Tabs.TabPane
                  v-for="tab in section.tabs"
                  :key="tab.id"
                  :tab="tab.title"
                >
                  <div class="grid grid-cols-24 gap-4">
                    <div
                      v-for="item in tab.items"
                      :key="item.id"
                      :style="{
                        gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                      }"
                    >
                      <div class="space-y-2">
                        <div class="text-sm font-medium text-gray-700">
                          {{ item.label }}
                        </div>
                        <Input
                          v-if="item.component === 'Input'"
                          v-model:value="
                            compositeDrawerValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                        />
                        <Input.TextArea
                          v-else-if="item.component === 'Textarea'"
                          v-model:value="
                            compositeDrawerValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                          :rows="4"
                        />
                        <InputNumber
                          v-else-if="item.component === 'InputNumber'"
                          v-model:value="
                            compositeDrawerValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                          :placeholder="renderPlaceholder(item)"
                        />
                        <DatePicker
                          v-else-if="item.component === 'DatePicker'"
                          v-model:value="
                            compositeDrawerValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                        />
                        <Select
                          v-else-if="item.component === 'Dict'"
                          v-model:value="
                            compositeDrawerValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                          :options="getDictOptionsByCode(item.dictCode)"
                          :placeholder="renderPlaceholder(item)"
                        />
                        <Switch
                          v-else-if="item.component === 'Switch'"
                          v-model:checked="
                            compositeDrawerValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                        />
                        <Upload
                          v-else-if="item.component === 'Attachment'"
                          :max-count="isAttachmentMultiple(item) ? 9 : 1"
                          :multiple="isAttachmentMultiple(item)"
                          :disabled="item.readonly"
                        >
                          <Button>{{ getAttachmentButtonText(item) }}</Button>
                        </Upload>
                        <Input
                          v-else
                          v-model:value="
                            compositeDrawerValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                        />
                      </div>
                    </div>
                  </div>
                </Tabs.TabPane>
              </Tabs>
            </div>
          </template>

          <div class="flex justify-end gap-2 border-t border-gray-200 pt-4">
            <Button @click="closeCompositeDrawer">取消</Button>
            <Button type="primary" @click="saveCompositeDrawer"
              >保存明细</Button
            >
          </div>
        </div>
      </Drawer>
    </Spin>
  </Page>
</template>
