<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';

import type { CompositeModelMeta } from '#/views/mdm/model/definition/form-designer';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Upload,
} from 'ant-design-vue';

import { getDictItemOptionsApi } from '#/api/mdm/dict';
import {
  createDynamicMasterDataRecordApi,
  deleteDynamicMasterDataRecordApi,
  getDynamicMasterDataRecordsApi,
  updateDynamicMasterDataRecordApi,
} from '#/api/mdm/master-data';
import {
  getModelDefinitionDetailApi,
  getModelFieldListApi,
} from '#/api/mdm/model-definition';
import { getModelRelationshipListApi } from '#/api/mdm/model-relationship';
import {
  normalizeAttachmentValue,
  serializeAttachmentValue,
  uploadFileToSupabaseStorage,
} from '#/api/mdm/storage';
import {
  getDisplayDraftStorageKey,
  getDisplayStorageKey,
  getSectionFields,
  normalizeDesignerSchema,
} from '#/views/mdm/model/definition/form-designer';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);
const loading = ref(false);
const schema = ref<any>({ sections: [], version: 1 });
const relationships = ref<any[]>([]);
const formValues = ref<Record<string, any>>({});
const dictItemOptionsMap = ref<
  Record<string, Array<{ label: string; value: string }>>
>({});
const compositeSchemaMap = ref<Record<string, any>>({});
const compositeDefinitionMap = ref<Record<string, any>>({});
const compositeTableRows = ref<Record<string, Record<string, any>[]>>({});
const compositeSingleValues = ref<Record<string, Record<string, any>>>({});
const removedCompositeRowIdsMap = ref<Record<string, string[]>>({});
const compositeDrawerOpen = ref(false);
const compositeDrawerDefinitionId = ref('');
const compositeDrawerTitle = ref('');
const compositeDrawerEditIndex = ref<null | number>(null);
const compositeDrawerValues = ref<Record<string, any>>({});
const submitting = ref(false);

const modelId = computed(() => String(currentData.value?.definitionId || ''));
const getTitle = computed(() => {
  const title = currentData.value?.masterDataTitle || '主数据';
  return currentData.value?.id ? `编辑${title}` : `新增${title}`;
});
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
const compositeDrawerFields = computed(() =>
  getCompositeLeafFields(compositeDrawerDefinitionId.value),
);
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

function normalizeKey(value?: string) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_]+/g, '_');
  return normalized && /^[0-9]/.test(normalized)
    ? `f_${normalized}`
    : normalized;
}

function getStoredSchemaByModelId(targetModelId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const draft = window.sessionStorage.getItem(
      getDisplayDraftStorageKey(targetModelId),
    );
    const raw =
      draft || window.localStorage.getItem(getDisplayStorageKey(targetModelId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function renderPlaceholder(item: any) {
  return item.placeholder || `请输入${item.label}`;
}

function isAttachmentMultiple(item: any) {
  return item.attachmentMode === 'multiple';
}

function getAttachmentButtonText(item: any) {
  return isAttachmentMultiple(item) ? '上传多个附件' : '上传附件';
}

function getDictSelectRenderKey(scope: string, item: any, ownerId = '') {
  return [
    scope,
    ownerId,
    item.id || '',
    item.dictCode || '',
    item.fieldCode || '',
  ].join(':');
}

function getDictOptionsByCode(dictCode?: string) {
  return dictCode ? (dictItemOptionsMap.value[dictCode] ?? []) : [];
}

async function ensureDictOptions(dictCode?: string) {
  if (!dictCode || dictItemOptionsMap.value[dictCode]) return;
  dictItemOptionsMap.value = {
    ...dictItemOptionsMap.value,
    [dictCode]: await getDictItemOptionsApi(dictCode),
  };
}

async function ensureRootDictOptionsForItem(item: any) {
  await ensureDictOptions(resolveRootDictCode(item));
}

async function ensureCompositeDictOptionsForItem(
  definitionId: string,
  item: any,
) {
  await ensureDictOptions(resolveCompositeDictCode(definitionId, item));
}

async function preloadDictOptions() {
  const codes = [
    ...new Set<string>(
      [
        ...schema.value.sections.flatMap((section: any) =>
          getSectionFields(section)
            .filter((item: any) => item.component === 'Dict')
            .map((item: any) => resolveRootDictCode(item))
            .filter(Boolean),
        ),
        ...Object.entries(compositeSchemaMap.value).flatMap(
          ([definitionId, schemaValue]: [string, any]) =>
            schemaValue.sections.flatMap((section: any) =>
              getSectionFields(section)
                .filter((field: any) => field.component === 'Dict')
                .map((field: any) =>
                  resolveCompositeDictCode(definitionId, field),
                )
                .filter(Boolean),
            ),
        ),
      ].filter(Boolean),
    ),
  ];
  await Promise.all(codes.map((code) => ensureDictOptions(code)));
}

function getRootFieldMeta(key: string) {
  return (currentData.value?.fields || []).find(
    (field: any) => normalizeKey(field.code) === key,
  );
}

function getRootFieldMetaByFieldCode(fieldCode?: string) {
  return getRootFieldMeta(normalizeKey(fieldCode));
}

function getCompositeFieldMeta(definitionId: string, key: string) {
  return (compositeDefinitionMap.value[definitionId]?.fields || []).find(
    (field: any) => normalizeKey(field.code) === key,
  );
}

function getCompositeFieldMetaByFieldCode(
  definitionId: string,
  fieldCode?: string,
) {
  return getCompositeFieldMeta(definitionId, normalizeKey(fieldCode));
}

function resolveRootDictCode(item: any) {
  return (
    (typeof item?.dictCode === 'string' && item.dictCode.trim()) ||
    getRootFieldMetaByFieldCode(item?.fieldCode)?.dictCode ||
    ''
  );
}

function resolveCompositeDictCode(definitionId: string, item: any) {
  return (
    (typeof item?.dictCode === 'string' && item.dictCode.trim()) ||
    getCompositeFieldMetaByFieldCode(definitionId, item?.fieldCode)?.dictCode ||
    ''
  );
}

function buildInitialValues(fields: any[], source?: Record<string, any>) {
  return {
    ...(source?.id ? { id: source.id } : {}),
    ...Object.fromEntries(
      fields.map((item: any) => {
        const key = normalizeKey(item.fieldCode || item.code);
        const value = source?.[key];
        const isMultiple =
          item.attachmentMode === 'multiple' || !!item.isMultiple;
        if (item.component === 'Attachment' || item.dataType === 'attachment') {
          return [key, normalizeAttachmentValue(value, isMultiple)];
        }
        return [key, value ?? item.defaultValue ?? undefined];
      }),
    ),
  };
}

function getCompositeRelation(relatedDefinitionId?: string) {
  return relationships.value.find(
    (item: any) =>
      item.sourceDefinitionId === modelId.value &&
      item.targetDefinitionId === relatedDefinitionId &&
      item.status !== 'obsolete',
  );
}

function getCompositeLeafFields(relatedDefinitionId?: string) {
  const sections =
    compositeSchemaMap.value[relatedDefinitionId || '']?.sections || [];
  return sections.flatMap((section: any) =>
    getSectionFields(section).filter(
      (item: any) => item.component !== 'CompositeModel',
    ),
  );
}

function getCompositeRows(relatedDefinitionId?: string) {
  return compositeTableRows.value[relatedDefinitionId || ''] ?? [];
}

function getCompositeSingleValue(relatedDefinitionId?: string) {
  return compositeSingleValues.value[relatedDefinitionId || ''] ?? {};
}

function setCompositeSingleFieldValue(
  relatedDefinitionId: string,
  fieldCode: string,
  value: any,
) {
  compositeSingleValues.value = {
    ...compositeSingleValues.value,
    [relatedDefinitionId]: {
      ...getCompositeSingleValue(relatedDefinitionId),
      [normalizeKey(fieldCode)]: value,
    },
  };
}

function getCompositeTableColumns(item: any) {
  const fields = getCompositeLeafFields(item.relatedDefinitionId).slice(0, 5);
  return [
    { dataIndex: '__seq', key: '__seq', title: '序号', width: 72 },
    ...fields.map((field: any) => ({
      dataIndex: normalizeKey(field.fieldCode),
      key: field.fieldCode,
      title: field.label,
    })),
    { dataIndex: '__action', key: '__action', title: '操作', width: 160 },
  ];
}

function getDisplayValue(value: any, field: any) {
  if (field?.component === 'Attachment') {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return list.length > 0 ? `${list.length} 个附件` : '-';
  }
  if (field?.component === 'Switch') return value ? '是' : '否';
  if (field?.component === 'Dict') {
    return (
      getDictOptionsByCode(field.dictCode).find((item) => item.value === value)
        ?.label ??
      value ??
      '-'
    );
  }
  return value ?? '-';
}

function validateFields(
  items: any[],
  values: Record<string, any>,
  prefix = '',
) {
  for (const item of items) {
    if (!item.required || item.readonly || item.visible === false) continue;
    const value = values[normalizeKey(item.fieldCode)];
    const empty =
      item.component === 'Attachment'
        ? !Array.isArray(value) || value.length === 0
        : item.component === 'Switch'
          ? false
          : value === undefined || value === null || value === '';
    if (empty) {
      message.warning(`${prefix}${item.label}不能为空`);
      return false;
    }
  }
  return true;
}

function serializePayload(
  values: Record<string, any>,
  resolveField: (key: string) => any,
) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([key, value]) => key !== 'id' && value !== undefined)
      .map(([key, value]) => {
        const field = resolveField(key);
        if (
          (field?.dataType === 'date' || field?.dataType === 'timestamptz') &&
          value === ''
        ) {
          return [key, null];
        }
        if (
          field?.dataType === 'attachment' ||
          field?.component === 'Attachment'
        ) {
          return [
            key,
            serializeAttachmentValue(
              value,
              field.attachmentMode === 'multiple' || !!field.isMultiple,
            ),
          ];
        }
        return [key, value];
      }),
  );
}

function hasMeaningfulValues(values: Record<string, any>, fields: any[]) {
  return fields.some((item: any) => {
    const value = values[normalizeKey(item.fieldCode)];
    if (item.component === 'Attachment')
      return Array.isArray(value) && value.length > 0;
    if (item.component === 'Switch') return value === true;
    return value !== undefined && value !== null && value !== '';
  });
}

async function handleUploadRequest(
  uploadOptions: any,
  item: any,
  tableName?: string,
) {
  try {
    uploadOptions.onSuccess?.(
      await uploadFileToSupabaseStorage(uploadOptions.file as File, {
        fieldCode: normalizeKey(item.fieldCode),
        tableName: tableName || currentData.value?.tableName || 'mdm_data',
      }),
    );
  } catch (error: any) {
    message.error(error?.message || '上传附件失败');
    uploadOptions.onError?.(error);
  }
}

function normalizeUploadList(fileList: UploadFile[]) {
  return (fileList || []).map((item: any, index: number) => ({
    ...item,
    uid: item.uid || `${index}-${item.url || item.name}`,
    url: item.url || item.response?.url,
  }));
}

function updateRootAttachment(fieldCode: string, fileList: UploadFile[]) {
  formValues.value = {
    ...formValues.value,
    [normalizeKey(fieldCode)]: normalizeUploadList(fileList),
  };
}

function updateCompositeSingleAttachment(
  definitionId: string,
  fieldCode: string,
  fileList: UploadFile[],
) {
  setCompositeSingleFieldValue(
    definitionId,
    fieldCode,
    normalizeUploadList(fileList),
  );
}

function updateCompositeDrawerAttachment(
  fieldCode: string,
  fileList: UploadFile[],
) {
  compositeDrawerValues.value = {
    ...compositeDrawerValues.value,
    [normalizeKey(fieldCode)]: normalizeUploadList(fileList),
  };
}

function openCompositeDrawer(item: any, editIndex?: number) {
  const definitionId = String(item.relatedDefinitionId || '');
  compositeDrawerDefinitionId.value = definitionId;
  compositeDrawerEditIndex.value = editIndex ?? null;
  compositeDrawerTitle.value =
    editIndex === undefined ? `新增${item.label}` : `编辑${item.label}`;
  compositeDrawerValues.value =
    editIndex === undefined
      ? buildInitialValues(getCompositeLeafFields(definitionId))
      : { ...getCompositeRows(definitionId)[editIndex] };
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
  if (
    !validateFields(
      compositeDrawerFields.value,
      compositeDrawerValues.value,
      `${compositeDrawerTitle.value}：`,
    )
  )
    return;
  const definitionId = compositeDrawerDefinitionId.value;
  const rows = [...getCompositeRows(definitionId)];
  if (compositeDrawerEditIndex.value === null) {
    rows.push({ ...compositeDrawerValues.value, id: `temp-${Date.now()}` });
  } else {
    rows.splice(compositeDrawerEditIndex.value, 1, {
      ...rows[compositeDrawerEditIndex.value],
      ...compositeDrawerValues.value,
    });
  }
  compositeTableRows.value = {
    ...compositeTableRows.value,
    [definitionId]: rows,
  };
  closeCompositeDrawer();
}

function removeCompositeRow(definitionId: string, index: number) {
  const rows = [...getCompositeRows(definitionId)];
  const [removed] = rows.splice(index, 1);
  if (removed?.id && !String(removed.id).startsWith('temp-')) {
    removedCompositeRowIdsMap.value = {
      ...removedCompositeRowIdsMap.value,
      [definitionId]: [
        ...(removedCompositeRowIdsMap.value[definitionId] || []),
        String(removed.id),
      ],
    };
  }
  compositeTableRows.value = {
    ...compositeTableRows.value,
    [definitionId]: rows,
  };
}

async function loadCompositeSchemas() {
  const ids = [
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
    ids.map(async (definitionId) => {
      const [detail, fields] = await Promise.all([
        getModelDefinitionDetailApi(definitionId),
        getModelFieldListApi(definitionId),
      ]);
      return [
        definitionId,
        {
          fields,
          tableName: detail?.tableName,
          schema: normalizeDesignerSchema(
            fields.filter((item: any) => item.status !== false),
            getStoredSchemaByModelId(definitionId),
          ),
        },
      ] as const;
    }),
  );
  compositeDefinitionMap.value = Object.fromEntries(entries);
  compositeSchemaMap.value = Object.fromEntries(
    entries.map(([id, item]) => [id, item.schema]),
  );
}

async function loadExistingCompositeData(parentRow: Record<string, any>) {
  compositeTableRows.value = {};
  compositeSingleValues.value = {};
  removedCompositeRowIdsMap.value = {};
  const items = visibleSections.value
    .flatMap((section: any) => getSectionFields(section))
    .filter((item: any) => item.component === 'CompositeModel');
  for (const item of items) {
    const definitionId = String(item.relatedDefinitionId || '');
    const relation = getCompositeRelation(definitionId);
    const tableName = compositeDefinitionMap.value[definitionId]?.tableName;
    if (!relation || !tableName) continue;
    const sourceValue =
      parentRow[normalizeKey(relation.sourceField)] ?? parentRow.id;
    const targetKey = normalizeKey(relation.targetField);
    if (!sourceValue || !targetKey) continue;
    const response = await getDynamicMasterDataRecordsApi(tableName, {
      [targetKey]: `eq.${sourceValue}`,
      order: 'created_at.asc',
      page: 1,
      pageSize: 1000,
    });
    const rows = response.items.map((row: any) =>
      buildInitialValues(getCompositeLeafFields(definitionId), row),
    );
    if (relation.relationType === '1:1') {
      compositeSingleValues.value = {
        ...compositeSingleValues.value,
        [definitionId]:
          rows[0] || buildInitialValues(getCompositeLeafFields(definitionId)),
      };
    } else {
      compositeTableRows.value = {
        ...compositeTableRows.value,
        [definitionId]: rows,
      };
    }
  }
}

async function loadDesignForm() {
  if (!modelId.value) return;
  loading.value = true;
  try {
    const relationshipResponse = await getModelRelationshipListApi({
      pageSize: 1000,
    });
    relationships.value = relationshipResponse.items;
    schema.value = normalizeDesignerSchema(
      currentData.value?.fields || [],
      getStoredSchemaByModelId(modelId.value),
      compositePaletteModels.value,
    );
    await loadCompositeSchemas();
    await preloadDictOptions();
    formValues.value = buildInitialValues(
      visibleSections.value
        .flatMap((section: any) => getSectionFields(section))
        .filter((item: any) => item.component !== 'CompositeModel'),
      currentData.value,
    );
    if (currentData.value?.id) {
      await loadExistingCompositeData(currentData.value);
    } else {
      compositeSingleValues.value = Object.fromEntries(
        compositePaletteModels.value
          .filter((item) => item.relationType === '1:1')
          .map((item) => [
            item.definitionId,
            buildInitialValues(getCompositeLeafFields(item.definitionId)),
          ]),
      );
      compositeTableRows.value = {};
      removedCompositeRowIdsMap.value = {};
    }
  } finally {
    loading.value = false;
  }
}

async function saveCompositeData(savedRecord: Record<string, any>) {
  const items = visibleSections.value
    .flatMap((section: any) => getSectionFields(section))
    .filter((item: any) => item.component === 'CompositeModel');
  for (const item of items) {
    const definitionId = String(item.relatedDefinitionId || '');
    const relation = getCompositeRelation(definitionId);
    const tableName = compositeDefinitionMap.value[definitionId]?.tableName;
    if (!relation || !tableName) continue;
    const sourceValue =
      savedRecord[normalizeKey(relation.sourceField)] ?? savedRecord.id;
    const targetKey = normalizeKey(relation.targetField);
    if (!sourceValue || !targetKey) continue;
    await Promise.all(
      (removedCompositeRowIdsMap.value[definitionId] || []).map((id) =>
        deleteDynamicMasterDataRecordApi(tableName, id),
      ),
    );
    if (relation.relationType === '1:1') {
      const values = getCompositeSingleValue(definitionId);
      const fields = getCompositeLeafFields(definitionId);
      if (!hasMeaningfulValues(values, fields)) continue;
      const payload = {
        ...serializePayload(values, (key) =>
          getCompositeFieldMeta(definitionId, key),
        ),
        [targetKey]: sourceValue,
      };
      await (values.id && !String(values.id).startsWith('temp-')
        ? updateDynamicMasterDataRecordApi(
            tableName,
            String(values.id),
            payload,
          )
        : createDynamicMasterDataRecordApi(tableName, payload));
      continue;
    }
    for (const row of getCompositeRows(definitionId)) {
      const payload = {
        ...serializePayload(row, (key) =>
          getCompositeFieldMeta(definitionId, key),
        ),
        [targetKey]: sourceValue,
      };
      await (row.id && !String(row.id).startsWith('temp-')
        ? updateDynamicMasterDataRecordApi(tableName, String(row.id), payload)
        : createDynamicMasterDataRecordApi(tableName, payload));
    }
  }
}

function resolveSubmitStatus(mode: 'save' | 'submit') {
  if (mode === 'save') {
    return 'draft';
  }
  return currentData.value?.needAudit ? 'pending' : 'published';
}

async function handleSubmit(mode: 'save' | 'submit') {
  const rootFields = visibleSections.value
    .flatMap((section: any) => getSectionFields(section))
    .filter((item: any) => item.component !== 'CompositeModel');
  if (!validateFields(rootFields, formValues.value)) return;
  for (const composite of compositePaletteModels.value.filter(
    (item) => item.relationType === '1:1',
  )) {
    const fields = getCompositeLeafFields(composite.definitionId);
    const values = getCompositeSingleValue(composite.definitionId);
    if (
      hasMeaningfulValues(values, fields) &&
      !validateFields(fields, values, `${composite.label}：`)
    )
      return;
  }
  submitting.value = true;
  modalApi.lock();
  try {
    const payload = {
      ...serializePayload(formValues.value, (key) => getRootFieldMeta(key)),
      status: resolveSubmitStatus(mode),
    };
    const saved = await (currentData.value?.id
      ? updateDynamicMasterDataRecordApi(
          currentData.value.tableName,
          currentData.value.id,
          payload,
        )
      : createDynamicMasterDataRecordApi(currentData.value.tableName, payload));
    await saveCompositeData(saved);
    currentData.value?.onSuccess?.();
    emit('success');
    modalApi.close();
  } finally {
    submitting.value = false;
    modalApi.lock(false);
  }
}

const [Modal, modalApi] = useVbenModal({
  class: 'w-[1100px] max-w-[96vw]',
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    currentData.value = modalApi.getData<any>();
    await loadDesignForm();
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <div class="p-4">
      <Alert
        class="mb-4"
        message="已发布模型会按表单设计渲染新增界面，保存时直接写入业务表。"
        show-icon
        type="info"
      />
      <div v-if="loading" class="py-16 text-center text-sm text-gray-500">
        正在加载模型设计...
      </div>
      <Empty
        v-else-if="visibleSections.length === 0"
        description="当前模型还没有可用的表单设计"
      />
      <div v-else class="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div
          v-for="section in visibleSections"
          :key="section.id"
          class="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div class="mb-4 text-base font-medium">{{ section.title }}</div>
          <Tabs
            v-if="section.layout === 'tabs'"
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
                      {{ item.label
                      }}<span v-if="item.required" class="ml-1 text-red-500"
                        >*</span
                      >
                    </div>
                    <div
                      v-if="item.component === 'CompositeModel'"
                      class="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900"
                    >
                      组合模型暂请放在普通分区中维护
                    </div>
                    <Input
                      v-else-if="item.component === 'Input'"
                      v-model:value="formValues[normalizeKey(item.fieldCode)]"
                      :placeholder="renderPlaceholder(item)"
                      :readonly="item.readonly"
                    />
                    <Input.TextArea
                      v-else-if="item.component === 'Textarea'"
                      v-model:value="formValues[normalizeKey(item.fieldCode)]"
                      :placeholder="renderPlaceholder(item)"
                      :readonly="item.readonly"
                      :rows="4"
                    />
                    <InputNumber
                      v-else-if="item.component === 'InputNumber'"
                      v-model:value="formValues[normalizeKey(item.fieldCode)]"
                      class="w-full"
                      :disabled="item.readonly"
                      :placeholder="renderPlaceholder(item)"
                    />
                    <DatePicker
                      v-else-if="item.component === 'DatePicker'"
                      v-model:value="formValues[normalizeKey(item.fieldCode)]"
                      class="w-full"
                      value-format="YYYY-MM-DD HH:mm:ss"
                      :disabled="item.readonly"
                    />
                    <Select
                      v-else-if="item.component === 'Dict'"
                      :key="getDictSelectRenderKey('root-tab', item, tab.id)"
                      v-model:value="formValues[normalizeKey(item.fieldCode)]"
                      class="w-full"
                      :disabled="item.readonly"
                      :options="getDictOptionsByCode(resolveRootDictCode(item))"
                      :placeholder="renderPlaceholder(item)"
                      @dropdown-visible-change="
                        (open) => open && ensureRootDictOptionsForItem(item)
                      "
                    />
                    <Switch
                      v-else-if="item.component === 'Switch'"
                      v-model:checked="formValues[normalizeKey(item.fieldCode)]"
                      :disabled="item.readonly"
                    />
                    <Upload
                      v-else-if="item.component === 'Attachment'"
                      :custom-request="
                        (options) => handleUploadRequest(options, item)
                      "
                      :disabled="item.readonly"
                      :file-list="
                        formValues[normalizeKey(item.fieldCode)] || []
                      "
                      :max-count="isAttachmentMultiple(item) ? 9 : 1"
                      :multiple="isAttachmentMultiple(item)"
                      @update:file-list="
                        updateRootAttachment(item.fieldCode, $event)
                      "
                    >
                      <Button>{{ getAttachmentButtonText(item) }}</Button>
                    </Upload>
                    <Input
                      v-else
                      v-model:value="formValues[normalizeKey(item.fieldCode)]"
                      :placeholder="renderPlaceholder(item)"
                      :readonly="item.readonly"
                    />
                  </div>
                </div>
              </div>
            </Tabs.TabPane>
          </Tabs>
          <div v-else class="grid grid-cols-24 gap-4">
            <div
              v-for="item in section.items"
              :key="item.id"
              :style="{
                gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
              }"
            >
              <div class="space-y-2">
                <div class="text-sm font-medium text-gray-700">
                  {{ item.label
                  }}<span v-if="item.required" class="ml-1 text-red-500"
                    >*</span
                  >
                </div>
                <template v-if="item.component === 'CompositeModel'">
                  <div
                    class="rounded-lg border border-amber-200 bg-amber-50/70 p-3"
                  >
                    <template
                      v-if="
                        getCompositeRelation(item.relatedDefinitionId)
                          ?.relationType === '1:N' ||
                        item.displayMode === 'table'
                      "
                    >
                      <div class="mb-3 flex items-center justify-between gap-2">
                        <div class="text-sm text-amber-900">
                          组合模型明细会写入子模型业务表，并自动回填关联字段。
                        </div>
                        <Button
                          size="small"
                          type="primary"
                          @click="openCompositeDrawer(item)"
                          >新增明细</Button
                        >
                      </div>
                      <Table
                        :columns="getCompositeTableColumns(item)"
                        :data-source="
                          getCompositeRows(item.relatedDefinitionId)
                        "
                        :pagination="false"
                        row-key="id"
                        size="small"
                      >
                        <template #bodyCell="{ column, record, index }">
                          <template v-if="column.key === '__seq'">{{
                            Number(index) + 1
                          }}</template>
                          <template v-else-if="column.key === '__action'">
                            <Space size="small">
                              <Button
                                size="small"
                                type="link"
                                @click="
                                  openCompositeDrawer(item, Number(index))
                                "
                                >编辑</Button
                              >
                              <Button
                                size="small"
                                type="link"
                                danger
                                @click="
                                  removeCompositeRow(
                                    String(item.relatedDefinitionId),
                                    Number(index),
                                  )
                                "
                                >删除</Button
                              >
                            </Space>
                          </template>
                          <template v-else>{{
                            getDisplayValue(
                              record[String(column.dataIndex)],
                              getCompositeLeafFields(
                                item.relatedDefinitionId,
                              ).find(
                                (field: any) =>
                                  normalizeKey(field.fieldCode) ===
                                  column.dataIndex,
                              ),
                            )
                          }}</template>
                        </template>
                      </Table>
                    </template>
                    <template v-else>
                      <div class="grid grid-cols-24 gap-4">
                        <div
                          v-for="childItem in getCompositeLeafFields(
                            item.relatedDefinitionId,
                          )"
                          :key="childItem.id"
                          :style="{
                            gridColumn: `span ${Math.min(childItem.span, 24)} / span ${Math.min(childItem.span, 24)}`,
                          }"
                        >
                          <div class="space-y-2">
                            <div class="text-sm font-medium text-gray-700">
                              {{ childItem.label
                              }}<span
                                v-if="childItem.required"
                                class="ml-1 text-red-500"
                                >*</span
                              >
                            </div>
                            <Input
                              v-if="childItem.component === 'Input'"
                              :value="
                                getCompositeSingleValue(
                                  String(item.relatedDefinitionId),
                                )[normalizeKey(childItem.fieldCode)]
                              "
                              :placeholder="renderPlaceholder(childItem)"
                              :readonly="childItem.readonly"
                              @update:value="
                                setCompositeSingleFieldValue(
                                  String(item.relatedDefinitionId),
                                  childItem.fieldCode,
                                  $event,
                                )
                              "
                            />
                            <Input.TextArea
                              v-else-if="childItem.component === 'Textarea'"
                              :value="
                                getCompositeSingleValue(
                                  String(item.relatedDefinitionId),
                                )[normalizeKey(childItem.fieldCode)]
                              "
                              :placeholder="renderPlaceholder(childItem)"
                              :readonly="childItem.readonly"
                              :rows="4"
                              @update:value="
                                setCompositeSingleFieldValue(
                                  String(item.relatedDefinitionId),
                                  childItem.fieldCode,
                                  $event,
                                )
                              "
                            />
                            <InputNumber
                              v-else-if="childItem.component === 'InputNumber'"
                              class="w-full"
                              :value="
                                getCompositeSingleValue(
                                  String(item.relatedDefinitionId),
                                )[normalizeKey(childItem.fieldCode)]
                              "
                              :disabled="childItem.readonly"
                              :placeholder="renderPlaceholder(childItem)"
                              @update:value="
                                setCompositeSingleFieldValue(
                                  String(item.relatedDefinitionId),
                                  childItem.fieldCode,
                                  $event,
                                )
                              "
                            />
                            <DatePicker
                              v-else-if="childItem.component === 'DatePicker'"
                              class="w-full"
                              value-format="YYYY-MM-DD HH:mm:ss"
                              :value="
                                getCompositeSingleValue(
                                  String(item.relatedDefinitionId),
                                )[normalizeKey(childItem.fieldCode)]
                              "
                              :disabled="childItem.readonly"
                              @update:value="
                                setCompositeSingleFieldValue(
                                  String(item.relatedDefinitionId),
                                  childItem.fieldCode,
                                  $event,
                                )
                              "
                            />
                            <Select
                              v-else-if="childItem.component === 'Dict'"
                              :key="
                                getDictSelectRenderKey(
                                  'composite-inline',
                                  childItem,
                                  String(item.relatedDefinitionId),
                                )
                              "
                              class="w-full"
                              :value="
                                getCompositeSingleValue(
                                  String(item.relatedDefinitionId),
                                )[normalizeKey(childItem.fieldCode)]
                              "
                              :disabled="childItem.readonly"
                              :options="
                                getDictOptionsByCode(
                                  resolveCompositeDictCode(
                                    String(item.relatedDefinitionId),
                                    childItem,
                                  ),
                                )
                              "
                              :placeholder="renderPlaceholder(childItem)"
                              @update:value="
                                setCompositeSingleFieldValue(
                                  String(item.relatedDefinitionId),
                                  childItem.fieldCode,
                                  $event,
                                )
                              "
                              @dropdown-visible-change="
                                (open) =>
                                  open &&
                                  ensureCompositeDictOptionsForItem(
                                    String(item.relatedDefinitionId),
                                    childItem,
                                  )
                              "
                            />
                            <Switch
                              v-else-if="childItem.component === 'Switch'"
                              :checked="
                                !!getCompositeSingleValue(
                                  String(item.relatedDefinitionId),
                                )[normalizeKey(childItem.fieldCode)]
                              "
                              :disabled="childItem.readonly"
                              @update:checked="
                                setCompositeSingleFieldValue(
                                  String(item.relatedDefinitionId),
                                  childItem.fieldCode,
                                  $event,
                                )
                              "
                            />
                            <Upload
                              v-else-if="childItem.component === 'Attachment'"
                              :custom-request="
                                (options) =>
                                  handleUploadRequest(
                                    options,
                                    childItem,
                                    compositeDefinitionMap[
                                      String(item.relatedDefinitionId)
                                    ]?.tableName,
                                  )
                              "
                              :disabled="childItem.readonly"
                              :file-list="
                                getCompositeSingleValue(
                                  String(item.relatedDefinitionId),
                                )[normalizeKey(childItem.fieldCode)] || []
                              "
                              :max-count="
                                isAttachmentMultiple(childItem) ? 9 : 1
                              "
                              :multiple="isAttachmentMultiple(childItem)"
                              @update:file-list="
                                updateCompositeSingleAttachment(
                                  String(item.relatedDefinitionId),
                                  childItem.fieldCode,
                                  $event,
                                )
                              "
                            >
                              <Button>{{
                                getAttachmentButtonText(childItem)
                              }}</Button>
                            </Upload>
                            <Input
                              v-else
                              :value="
                                getCompositeSingleValue(
                                  String(item.relatedDefinitionId),
                                )[normalizeKey(childItem.fieldCode)]
                              "
                              :placeholder="renderPlaceholder(childItem)"
                              :readonly="childItem.readonly"
                              @update:value="
                                setCompositeSingleFieldValue(
                                  String(item.relatedDefinitionId),
                                  childItem.fieldCode,
                                  $event,
                                )
                              "
                            />
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </template>
                <Input
                  v-else-if="item.component === 'Input'"
                  v-model:value="formValues[normalizeKey(item.fieldCode)]"
                  :placeholder="renderPlaceholder(item)"
                  :readonly="item.readonly"
                />
                <Input.TextArea
                  v-else-if="item.component === 'Textarea'"
                  v-model:value="formValues[normalizeKey(item.fieldCode)]"
                  :placeholder="renderPlaceholder(item)"
                  :readonly="item.readonly"
                  :rows="4"
                />
                <InputNumber
                  v-else-if="item.component === 'InputNumber'"
                  v-model:value="formValues[normalizeKey(item.fieldCode)]"
                  class="w-full"
                  :disabled="item.readonly"
                  :placeholder="renderPlaceholder(item)"
                />
                <DatePicker
                  v-else-if="item.component === 'DatePicker'"
                  v-model:value="formValues[normalizeKey(item.fieldCode)]"
                  class="w-full"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  :disabled="item.readonly"
                />
                <Select
                  v-else-if="item.component === 'Dict'"
                  :key="getDictSelectRenderKey('root-panel', item, section.id)"
                  v-model:value="formValues[normalizeKey(item.fieldCode)]"
                  class="w-full"
                  :disabled="item.readonly"
                  :options="getDictOptionsByCode(resolveRootDictCode(item))"
                  :placeholder="renderPlaceholder(item)"
                  @dropdown-visible-change="
                    (open) => open && ensureRootDictOptionsForItem(item)
                  "
                />
                <Switch
                  v-else-if="item.component === 'Switch'"
                  v-model:checked="formValues[normalizeKey(item.fieldCode)]"
                  :disabled="item.readonly"
                />
                <Upload
                  v-else-if="item.component === 'Attachment'"
                  :custom-request="
                    (options) => handleUploadRequest(options, item)
                  "
                  :disabled="item.readonly"
                  :file-list="formValues[normalizeKey(item.fieldCode)] || []"
                  :max-count="isAttachmentMultiple(item) ? 9 : 1"
                  :multiple="isAttachmentMultiple(item)"
                  @update:file-list="
                    updateRootAttachment(item.fieldCode, $event)
                  "
                >
                  <Button>{{ getAttachmentButtonText(item) }}</Button>
                </Upload>
                <Input
                  v-else
                  v-model:value="formValues[normalizeKey(item.fieldCode)]"
                  :placeholder="renderPlaceholder(item)"
                  :readonly="item.readonly"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Drawer
        :open="compositeDrawerOpen"
        :title="compositeDrawerTitle"
        width="720"
        @close="closeCompositeDrawer"
      >
        <div class="grid grid-cols-24 gap-4">
          <div
            v-for="item in compositeDrawerFields"
            :key="item.id"
            :style="{
              gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
            }"
          >
            <div class="space-y-2">
              <div class="text-sm font-medium text-gray-700">
                {{ item.label
                }}<span v-if="item.required" class="ml-1 text-red-500">*</span>
              </div>
              <Input
                v-if="item.component === 'Input'"
                v-model:value="
                  compositeDrawerValues[normalizeKey(item.fieldCode)]
                "
                :placeholder="renderPlaceholder(item)"
                :readonly="item.readonly"
              />
              <Input.TextArea
                v-else-if="item.component === 'Textarea'"
                v-model:value="
                  compositeDrawerValues[normalizeKey(item.fieldCode)]
                "
                :placeholder="renderPlaceholder(item)"
                :readonly="item.readonly"
                :rows="4"
              />
              <InputNumber
                v-else-if="item.component === 'InputNumber'"
                v-model:value="
                  compositeDrawerValues[normalizeKey(item.fieldCode)]
                "
                class="w-full"
                :disabled="item.readonly"
                :placeholder="renderPlaceholder(item)"
              />
              <DatePicker
                v-else-if="item.component === 'DatePicker'"
                v-model:value="
                  compositeDrawerValues[normalizeKey(item.fieldCode)]
                "
                class="w-full"
                value-format="YYYY-MM-DD HH:mm:ss"
                :disabled="item.readonly"
              />
              <Select
                v-else-if="item.component === 'Dict'"
                :key="
                  getDictSelectRenderKey(
                    'composite-drawer',
                    item,
                    compositeDrawerDefinitionId,
                  )
                "
                v-model:value="
                  compositeDrawerValues[normalizeKey(item.fieldCode)]
                "
                class="w-full"
                :disabled="item.readonly"
                :options="
                  getDictOptionsByCode(
                    resolveCompositeDictCode(compositeDrawerDefinitionId, item),
                  )
                "
                :placeholder="renderPlaceholder(item)"
                @dropdown-visible-change="
                  (open) =>
                    open &&
                    ensureCompositeDictOptionsForItem(
                      compositeDrawerDefinitionId,
                      item,
                    )
                "
              />
              <Switch
                v-else-if="item.component === 'Switch'"
                v-model:checked="
                  compositeDrawerValues[normalizeKey(item.fieldCode)]
                "
                :disabled="item.readonly"
              />
              <Upload
                v-else-if="item.component === 'Attachment'"
                :custom-request="
                  (options) =>
                    handleUploadRequest(
                      options,
                      item,
                      compositeDefinitionMap[compositeDrawerDefinitionId]
                        ?.tableName,
                    )
                "
                :disabled="item.readonly"
                :file-list="
                  compositeDrawerValues[normalizeKey(item.fieldCode)] || []
                "
                :max-count="isAttachmentMultiple(item) ? 9 : 1"
                :multiple="isAttachmentMultiple(item)"
                @update:file-list="
                  updateCompositeDrawerAttachment(item.fieldCode, $event)
                "
              >
                <Button>{{ getAttachmentButtonText(item) }}</Button>
              </Upload>
              <Input
                v-else
                v-model:value="
                  compositeDrawerValues[normalizeKey(item.fieldCode)]
                "
                :placeholder="renderPlaceholder(item)"
                :readonly="item.readonly"
              />
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4">
          <Button @click="closeCompositeDrawer">取消</Button>
          <Button type="primary" @click="saveCompositeDrawer">保存明细</Button>
        </div>
      </Drawer>
      <div class="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4">
        <Button :disabled="submitting" @click="modalApi.close()">取消</Button>
        <Button :loading="submitting" @click="handleSubmit('save')"
          >保存</Button
        >
        <Button
          :loading="submitting"
          type="primary"
          @click="handleSubmit('submit')"
          >提交</Button
        >
      </div>
    </div>
  </Modal>
</template>
