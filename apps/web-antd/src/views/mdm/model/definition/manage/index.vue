<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { FormDesignerSchema } from '../form-designer';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { Maximize, Minimize } from '@vben/icons';

import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
} from 'ant-design-vue';

import { getDictItemOptionsApi, getDictListApi } from '#/api/mdm/dict';
import {
  deleteModelFieldApi,
  getModelDefinitionDetailApi,
  getModelFieldListApi,
  getModelVersionListApi,
  updateModelDefinitionEnabledApi,
  updateModelFieldEnabledApi,
  upgradeModelDefinitionApi,
} from '#/api/mdm/model-definition';
import {
  deleteModelRelationshipApi,
  getModelRelationshipListApi,
  obsoleteModelRelationshipApi,
  publishModelRelationshipApi,
} from '#/api/mdm/model-relationship';
import { getUserGroupListApi } from '#/api/mdm/user-group';
import { formatDateTime } from '#/utils/date';

import RelationshipFormModal from '../../relationship/modules/form.vue';
import {
  buildFieldMetaMap,
  createDefaultDesignerSchema,
  createFieldWidget,
  getDefaultComponent,
  getDisplayDraftStorageKey,
  getDisplayStorageKey,
  normalizeDesignerSchema,
} from '../form-designer';
import FieldFormModal from '../modules/field-form.vue';
import ModelFormModal from '../modules/form.vue';

const TAB_KEYS = [
  'fields',
  'display',
  'auth',
  'relationship',
  'history',
] as const;
type TabKey = (typeof TAB_KEYS)[number];

type DesignerSelection =
  | null
  | { fieldId: string; sectionId: string; type: 'field' }
  | { sectionId: string; type: 'section' };

type DragPayload =
  | {
      fieldCode: string;
      fieldId: string;
      fromIndex: number;
      fromSectionId: string;
      mode: 'existing';
    }
  | { fieldCode: string; mode: 'palette' };

type DropTarget = {
  index: number;
  sectionId: string;
};

type SectionDropTarget = {
  index: number;
};

type AuthConfig = {
  canAudit: boolean;
  canEdit: boolean;
  canManage: boolean;
  canPublish: boolean;
  canView: boolean;
  targetId: string;
  targetName: string;
};

type DictOption = {
  label: string;
  value: string;
};

type DictDefinitionOption = {
  code: string;
  label: string;
  value: string;
};

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const fieldLoading = ref(false);
const relationshipLoading = ref(false);
const versionLoading = ref(false);
const authLoading = ref(false);

const currentDefinition = ref<any>(null);
const fields = ref<any[]>([]);
const dictDefinitions = ref<DictDefinitionOption[]>([]);
const dictItemOptionsMap = ref<Record<string, DictOption[]>>({});
const relationships = ref<any[]>([]);
const versions = ref<any[]>([]);
const authConfigs = ref<AuthConfig[]>([]);
const designerSchema = ref<FormDesignerSchema>({
  sections: [],
  version: 1,
});
const designerSelection = ref<DesignerSelection>(null);
const dragPayload = ref<DragPayload | null>(null);
const dropTarget = ref<DropTarget | null>(null);
const sectionDragId = ref<null | string>(null);
const sectionDropTarget = ref<null | SectionDropTarget>(null);
const workspaceFullscreen = ref(false);

const [ModelForm, modelFormApi] = useVbenModal({
  connectedComponent: ModelFormModal,
  destroyOnClose: true,
});

const [FieldForm, fieldFormApi] = useVbenModal({
  connectedComponent: FieldFormModal,
  destroyOnClose: true,
});

const [RelationshipForm, relationshipFormApi] = useVbenModal({
  connectedComponent: RelationshipFormModal,
  destroyOnClose: true,
});

const modelId = computed(() => String(route.params.id || ''));
const activeTab = ref<TabKey>('fields');

const isEditable = computed(() =>
  ['draft', 'revised'].includes(currentDefinition.value?.status),
);
const canMaintainPublishedFields = computed(
  () => currentDefinition.value?.status === 'published',
);
const canEditField = computed(
  () => isEditable.value || canMaintainPublishedFields.value,
);
const canDeleteField = computed(
  () => currentDefinition.value?.status === 'draft',
);
const canToggleModel = computed(
  () => currentDefinition.value?.status === 'published',
);

const modelStatusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'warning', label: '草稿' },
  history: { color: 'default', label: '历史' },
  published: { color: 'success', label: '已发布' },
  revised: { color: 'processing', label: '升级' },
};

const relationStatusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'warning', label: '草稿' },
  obsolete: { color: 'default', label: '作废' },
  published: { color: 'success', label: '已发布' },
};

const relationTypeMap: Record<string, string> = {
  '1:1': '一对一',
  '1:N': '一对多',
  'N:1': '多对一',
  'N:N': '多对多',
};

const fieldTypeMap: Record<string, string> = {
  attachment: '附件',
  boolean: '布尔',
  date: '日期',
  int4: '整数',
  dict: '字典',
  numeric: '数值',
  relation_master: '关联主数据',
  text: '长文本',
  timestamptz: '日期时间',
  varchar: '短文本',
};

const FORM_COMPONENT_OPTIONS = [
  { label: '输入框', value: 'Input' },
  { label: '文本域', value: 'Textarea' },
  { label: '数字框', value: 'InputNumber' },
  { label: '日期选择', value: 'DatePicker' },
  { label: '开关', value: 'Switch' },
  { label: '字典', value: 'Dict' },
  { label: '附件', value: 'Attachment' },
];

const LABEL_LAYOUT_OPTIONS = [
  { label: '左右结构', value: 'horizontal' },
  { label: '上下结构', value: 'vertical' },
];

const FIELD_SPAN_OPTIONS = [
  { label: '1/3', value: 8 },
  { label: '1/2', value: 12 },
  { label: '2/3', value: 16 },
  { label: '整行', value: 24 },
];

const fieldMetaMap = computed(() => buildFieldMetaMap(fields.value));

const usedFieldCodes = computed(
  () =>
    new Set(
      designerSchema.value.sections.flatMap((section) =>
        section.items.map((item) => item.fieldCode),
      ),
    ),
);

const paletteFields = computed(() =>
  fields.value
    .filter((item) => !item.isPrimary && item.code !== 'id')
    .map((item) => ({
      code: item.code,
      component: getDefaultComponent(item.dataType),
      dataType: item.dataType,
      label: item.name,
      used: usedFieldCodes.value.has(item.code),
    })),
);

const selectedSection = computed(() => {
  if (!designerSelection.value) {
    return null;
  }
  return (
    designerSchema.value.sections.find(
      (item) => item.id === designerSelection.value?.sectionId,
    ) ?? null
  );
});

const selectedField = computed(() => {
  if (!designerSelection.value || designerSelection.value.type !== 'field') {
    return null;
  }
  return (
    selectedSection.value?.items.find(
      (item) => item.id === designerSelection.value?.fieldId,
    ) ?? null
  );
});

const fieldColumns: TableColumnsType = [
  { title: '字段名称', dataIndex: 'name', key: 'name' },
  { title: '字段编码', dataIndex: 'code', key: 'code', width: 160 },
  { title: '数据类型', dataIndex: 'dataType', key: 'dataType', width: 120 },
  { title: '长度', dataIndex: 'length', key: 'length', width: 90 },
  {
    title: '校验规则',
    dataIndex: 'validationRuleName',
    key: 'validationRuleName',
    width: 160,
  },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
];

const relationshipColumns: TableColumnsType = [
  {
    title: '源模型',
    dataIndex: 'sourceModelName',
    key: 'sourceModelName',
    minWidth: 180,
  },
  {
    title: '关联模型',
    dataIndex: 'targetModelName',
    key: 'targetModelName',
    minWidth: 180,
  },
  {
    title: '关系类型',
    dataIndex: 'relationType',
    key: 'relationType',
    width: 120,
  },
  { title: '源字段', dataIndex: 'sourceField', key: 'sourceField', width: 140 },
  {
    title: '目标字段',
    dataIndex: 'targetField',
    key: 'targetField',
    width: 140,
  },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '操作', key: 'action', width: 240, fixed: 'right' },
];

const versionColumns: TableColumnsType = [
  { title: '版本号', dataIndex: 'versionNo', key: 'versionNo', width: 100 },
  {
    title: '版本标签',
    dataIndex: 'versionLabel',
    key: 'versionLabel',
    width: 180,
  },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '动作', dataIndex: 'actionType', key: 'actionType', width: 120 },
  { title: '物理表', dataIndex: 'tableName', key: 'tableName', minWidth: 180 },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 140 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
];

const authColumns: TableColumnsType = [
  { title: '授权对象', dataIndex: 'targetName', key: 'targetName', width: 220 },
  { title: '查看', dataIndex: 'canView', key: 'canView', width: 90 },
  { title: '维护', dataIndex: 'canEdit', key: 'canEdit', width: 90 },
  { title: '审核', dataIndex: 'canAudit', key: 'canAudit', width: 90 },
  { title: '发布', dataIndex: 'canPublish', key: 'canPublish', width: 90 },
  { title: '管理', dataIndex: 'canManage', key: 'canManage', width: 90 },
];

function getSafeStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setSafeStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function setSafeSessionStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function getAuthStorageKey() {
  return `mdm:model:auth:${modelId.value}`;
}

function getDictOptionsByCode(dictCode?: string) {
  if (!dictCode) {
    return [];
  }
  return dictItemOptionsMap.value[dictCode] ?? [];
}

function normalizeTab(tab: unknown): TabKey {
  return TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : 'fields';
}

function loadDesignerSchema() {
  const stored = getSafeStorage<FormDesignerSchema | null>(
    getDisplayStorageKey(modelId.value),
    null,
  );
  designerSchema.value = normalizeDesignerSchema(fields.value, stored);
  if (!designerSelection.value && designerSchema.value.sections.length > 0) {
    designerSelection.value = {
      sectionId: designerSchema.value.sections[0].id,
      type: 'section',
    };
  }
}

function selectSection(sectionId: string) {
  designerSelection.value = { sectionId, type: 'section' };
}

function selectField(sectionId: string, fieldId: string) {
  designerSelection.value = { fieldId, sectionId, type: 'field' };
}

function addSection() {
  if (!isEditable.value) {
    message.warning('当前状态不可编辑表单设计，请先发起升级。');
    return;
  }
  const nextSection: FormDesignerSection = {
    code: `section_${designerSchema.value.sections.length + 1}`,
    collapsible: false,
    defaultExpanded: true,
    id: createId('section'),
    items: [],
    span: 24,
    title: `新分区${designerSchema.value.sections.length + 1}`,
  };
  designerSchema.value.sections.push(nextSection);
  selectSection(nextSection.id);
}

function regenerateDesignerSchema() {
  if (!isEditable.value) {
    message.warning('当前状态不可编辑表单设计，请先发起升级。');
    return;
  }
  designerSchema.value = createDefaultDesignerSchema(fields.value);
  designerSelection.value = designerSchema.value.sections[0]
    ? {
        sectionId: designerSchema.value.sections[0].id,
        type: 'section',
      }
    : null;
  message.success('已重新生成表单布局');
}

function removeSection(sectionId: string) {
  if (!isEditable.value) {
    message.warning('当前状态不可编辑表单设计，请先发起升级。');
    return;
  }
  const section = designerSchema.value.sections.find(
    (item) => item.id === sectionId,
  );
  if (!section) {
    return;
  }
  if (section.items.length > 0) {
    message.warning('请先移出该分区内字段后再删除分区');
    return;
  }
  designerSchema.value.sections = designerSchema.value.sections.filter(
    (item) => item.id !== sectionId,
  );
  designerSelection.value = designerSchema.value.sections[0]
    ? {
        sectionId: designerSchema.value.sections[0].id,
        type: 'section',
      }
    : null;
}

function removeField(sectionId: string, fieldId: string) {
  if (!isEditable.value) {
    message.warning('当前状态不可编辑表单设计，请先发起升级。');
    return;
  }
  const section = designerSchema.value.sections.find(
    (item) => item.id === sectionId,
  );
  if (!section) {
    return;
  }
  section.items = section.items.filter((item) => item.id !== fieldId);
  designerSelection.value = { sectionId, type: 'section' };
}

function handlePaletteDragStart(fieldCode: string) {
  if (!isEditable.value) {
    return;
  }
  dragPayload.value = { fieldCode, mode: 'palette' };
  dropTarget.value = null;
}

function handleFieldDragStart(
  sectionId: string,
  fieldId: string,
  fieldCode: string,
  fromIndex: number,
) {
  if (!isEditable.value) {
    return;
  }
  dragPayload.value = {
    fieldCode,
    fieldId,
    fromIndex,
    fromSectionId: sectionId,
    mode: 'existing',
  };
  dropTarget.value = null;
}

function allowDrop(event: DragEvent) {
  event.preventDefault();
}

function clearDragState() {
  dragPayload.value = null;
  dropTarget.value = null;
  sectionDragId.value = null;
  sectionDropTarget.value = null;
}

function setDropTarget(sectionId: string, index: number) {
  dropTarget.value = { index, sectionId };
}

function setSectionDropTarget(index: number) {
  sectionDropTarget.value = { index };
}

function handleSectionBlockDragStart(sectionId: string) {
  if (!isEditable.value) {
    return;
  }
  sectionDragId.value = sectionId;
  dragPayload.value = null;
  dropTarget.value = null;
  sectionDropTarget.value = null;
}

function handleSectionBlockDragOver(event: DragEvent, index: number) {
  if (!sectionDragId.value) {
    return;
  }
  allowDrop(event);
  const currentTarget = event.currentTarget as HTMLElement | null;
  if (!currentTarget) {
    setSectionDropTarget(index);
    return;
  }
  const rect = currentTarget.getBoundingClientRect();
  const before = event.clientY < rect.top + rect.height / 2;
  setSectionDropTarget(before ? index : index + 1);
}

function handleSectionBlockDrop(index: number) {
  if (!isEditable.value || !sectionDragId.value) {
    return;
  }
  const sourceIndex = designerSchema.value.sections.findIndex(
    (item) => item.id === sectionDragId.value,
  );
  if (sourceIndex === -1) {
    clearDragState();
    return;
  }
  const targetIndex = sectionDropTarget.value?.index ?? index;
  const [movedSection] = designerSchema.value.sections.splice(sourceIndex, 1);
  if (!movedSection) {
    clearDragState();
    return;
  }
  const nextIndex =
    sourceIndex < targetIndex ? Math.max(targetIndex - 1, 0) : targetIndex;
  designerSchema.value.sections.splice(nextIndex, 0, movedSection);
  selectSection(movedSection.id);
  clearDragState();
}

function handleSectionDragOver(event: DragEvent, sectionId: string) {
  if (!dragPayload.value) {
    return;
  }
  allowDrop(event);
  const section = designerSchema.value.sections.find(
    (item) => item.id === sectionId,
  );
  setDropTarget(sectionId, section?.items.length ?? 0);
}

function handleFieldDragOver(
  event: DragEvent,
  sectionId: string,
  index: number,
) {
  if (!dragPayload.value) {
    return;
  }
  allowDrop(event);
  const currentTarget = event.currentTarget as HTMLElement | null;
  if (!currentTarget) {
    setDropTarget(sectionId, index);
    return;
  }
  const rect = currentTarget.getBoundingClientRect();
  const before = event.clientY < rect.top + rect.height / 2;
  setDropTarget(sectionId, before ? index : index + 1);
}

function handleDrop(sectionId: string, fallbackIndex?: number) {
  const targetIndex =
    dropTarget.value?.sectionId === sectionId
      ? dropTarget.value.index
      : fallbackIndex;
  insertFieldToSection(sectionId, targetIndex);
}

function insertFieldToSection(sectionId: string, targetIndex?: number) {
  if (!isEditable.value) {
    return;
  }
  const payload = dragPayload.value;
  if (!payload) {
    return;
  }
  const section = designerSchema.value.sections.find(
    (item) => item.id === sectionId,
  );
  if (!section) {
    return;
  }

  if (payload.mode === 'palette') {
    if (usedFieldCodes.value.has(payload.fieldCode)) {
      message.warning('同一个字段在表单中只能放置一次');
      clearDragState();
      return;
    }
    const newField = createFieldWidget(payload.fieldCode, fieldMetaMap.value);
    if (!newField) {
      clearDragState();
      return;
    }
    section.items.splice(targetIndex ?? section.items.length, 0, newField);
    selectField(sectionId, newField.id);
  } else {
    const sourceSection = designerSchema.value.sections.find(
      (item) => item.id === payload.fromSectionId,
    );
    if (!sourceSection) {
      return;
    }
    const [movedField] = sourceSection.items.splice(payload.fromIndex, 1);
    if (!movedField) {
      clearDragState();
      return;
    }
    const nextIndex =
      sourceSection.id === sectionId &&
      targetIndex !== undefined &&
      payload.fromIndex < targetIndex
        ? targetIndex - 1
        : (targetIndex ?? section.items.length);
    section.items.splice(nextIndex, 0, movedField);
    selectField(sectionId, movedField.id);
  }

  clearDragState();
}

async function loadDefinition() {
  if (!modelId.value) {
    return;
  }
  loading.value = true;
  try {
    currentDefinition.value = await getModelDefinitionDetailApi(modelId.value);
  } finally {
    loading.value = false;
  }
}

async function loadFields() {
  if (!modelId.value) {
    return;
  }
  fieldLoading.value = true;
  try {
    fields.value = await getModelFieldListApi(modelId.value);
    loadDesignerSchema();
    await preloadSchemaDictOptions();
  } finally {
    fieldLoading.value = false;
  }
}

async function loadRelationships() {
  if (!modelId.value) {
    return;
  }
  relationshipLoading.value = true;
  try {
    const { items } = await getModelRelationshipListApi({ pageSize: 1000 });
    relationships.value = items.filter(
      (item: any) =>
        item.sourceDefinitionId === modelId.value ||
        item.targetDefinitionId === modelId.value,
    );
  } finally {
    relationshipLoading.value = false;
  }
}

async function loadVersions() {
  if (!modelId.value) {
    return;
  }
  versionLoading.value = true;
  try {
    versions.value = await getModelVersionListApi(modelId.value);
  } finally {
    versionLoading.value = false;
  }
}

async function loadAuthConfig() {
  authLoading.value = true;
  try {
    const { items } = await getUserGroupListApi({ pageSize: 1000 });
    const stored = getSafeStorage<AuthConfig[]>(getAuthStorageKey(), []);
    const storedMap = new Map(stored.map((item) => [item.targetId, item]));

    authConfigs.value = items.map((item: any) => ({
      canAudit: storedMap.get(item.id)?.canAudit ?? false,
      canEdit: storedMap.get(item.id)?.canEdit ?? false,
      canManage: storedMap.get(item.id)?.canManage ?? false,
      canPublish: storedMap.get(item.id)?.canPublish ?? false,
      canView: storedMap.get(item.id)?.canView ?? true,
      targetId: item.id,
      targetName: item.name,
    }));
  } finally {
    authLoading.value = false;
  }
}

async function loadDictDefinitions() {
  const { items } = await getDictListApi({ pageSize: 1000 });
  dictDefinitions.value = items.map((item: any) => ({
    code: item.code,
    label: `${item.name} (${item.code})`,
    value: item.code,
  }));
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
  const dictCodes = [
    ...new Set(
      designerSchema.value.sections.flatMap((section) =>
        section.items
          .filter((item) => item.component === 'Dict' && item.dictCode)
          .map((item) => item.dictCode as string),
      ),
    ),
  ];
  await Promise.all(dictCodes.map((dictCode) => ensureDictOptions(dictCode)));
}

async function initializePage() {
  await loadDefinition();
  await Promise.all([
    loadFields(),
    loadRelationships(),
    loadVersions(),
    loadAuthConfig(),
    loadDictDefinitions(),
  ]);
}

function saveDisplayConfig() {
  if (!isEditable.value) {
    message.warning('当前状态不可编辑表单设计，请先发起升级。');
    return;
  }
  setSafeStorage(
    getDisplayStorageKey(modelId.value),
    normalizeDesignerSchema(fields.value, designerSchema.value),
  );
  message.success('表单设计已保存');
}

function handleOpenPreview() {
  router.push({
    name: 'MdmModelDefinitionPreview',
    params: { id: modelId.value },
  });
}

function toggleWorkspaceFullscreen() {
  workspaceFullscreen.value = !workspaceFullscreen.value;
}

function saveAuthConfig() {
  setSafeStorage(getAuthStorageKey(), authConfigs.value);
  message.success('授权配置已保存');
}

function handleEditModel() {
  if (!currentDefinition.value) {
    return;
  }
  modelFormApi
    .setData({
      ...currentDefinition.value,
      onSuccess: async () => {
        await loadDefinition();
      },
    })
    .open();
}

async function handleToggleModelEnabled(enabled: boolean) {
  if (!currentDefinition.value?.id) {
    return;
  }
  try {
    await updateModelDefinitionEnabledApi(currentDefinition.value.id, enabled);
    message.success(enabled ? '模型已启用' : '模型已禁用');
    await loadDefinition();
  } catch {
    message.error(enabled ? '启用失败' : '禁用失败');
  }
}

async function handleUpgradeModel() {
  if (!currentDefinition.value?.id) {
    return;
  }
  try {
    const newDefinitionId = await upgradeModelDefinitionApi(
      currentDefinition.value.id,
    );
    if (!newDefinitionId) {
      throw new Error('升级失败');
    }
    message.success('已生成升级草稿，正在跳转');
    router.push({
      name: 'MdmModelDefinitionManage',
      params: { id: String(newDefinitionId) },
      query: { tab: 'fields' },
    });
  } catch {
    message.error('升级失败');
  }
}

function handleCreateField() {
  if (!isEditable.value || !currentDefinition.value?.id) {
    message.warning('当前状态不可维护字段，请先发起升级。');
    return;
  }
  fieldFormApi
    .setData({
      definitionId: currentDefinition.value.id,
      definitionStatus: currentDefinition.value.status,
      onSuccess: async () => {
        await loadFields();
      },
    })
    .open();
}

function handleEditField(row: any) {
  if (row.systemField) {
    message.warning('系统默认字段不允许编辑维护。');
    return;
  }
  if (!canEditField.value || !currentDefinition.value?.id) {
    message.warning('当前状态不可编辑字段。');
    return;
  }
  fieldFormApi
    .setData({
      ...row,
      definitionId: currentDefinition.value.id,
      definitionStatus: currentDefinition.value.status,
      onSuccess: async () => {
        await loadFields();
      },
    })
    .open();
}

function handleDeleteField(row: any) {
  if (row.systemField) {
    message.warning('系统默认字段不允许删除。');
    return;
  }
  if (!canDeleteField.value) {
    message.warning('只有草稿状态允许删除字段。');
    return;
  }
  Modal.confirm({
    async onOk() {
      try {
        await deleteModelFieldApi(row.id);
        message.success(`已删除字段: ${row.name}`);
        await loadFields();
      } catch {
        message.error('删除字段失败');
      }
    },
    title: `是否删除字段 ${row.name}？`,
  });
}

async function handleToggleField(row: any, status: boolean) {
  if (row.systemField) {
    message.warning('系统默认字段不允许启用或禁用。');
    return;
  }
  if (!canEditField.value) {
    message.warning('当前状态不可维护字段。');
    return;
  }
  try {
    await updateModelFieldEnabledApi(row.id, status);
    message.success(status ? '字段已启用' : '字段已禁用');
    await loadFields();
  } catch {
    message.error(status ? '启用失败' : '禁用失败');
  }
}

function handleCreateRelationship() {
  if (!isEditable.value || !currentDefinition.value?.id) {
    message.warning('当前状态不可维护模型关系，请先发起升级。');
    return;
  }
  relationshipFormApi
    .setData({
      sourceDefinitionId: currentDefinition.value.id,
      sort: 10,
      onSuccess: async () => {
        await loadRelationships();
      },
    })
    .open();
}

function handleEditRelationship(row: any) {
  relationshipFormApi
    .setData({
      ...row,
      onSuccess: async () => {
        await loadRelationships();
      },
    })
    .open();
}

function handleDeleteRelationship(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await deleteModelRelationshipApi(row.id);
        message.success('关系已删除');
        await loadRelationships();
      } catch {
        message.error('删除失败');
      }
    },
    title: '是否删除当前关系？',
  });
}

async function handlePublishRelationship(row: any) {
  try {
    await publishModelRelationshipApi(row.id);
    message.success('关系已发布');
    await loadRelationships();
  } catch {
    message.error('发布失败');
  }
}

async function handleObsoleteRelationship(row: any) {
  try {
    await obsoleteModelRelationshipApi(row.id);
    message.success('关系已作废');
    await loadRelationships();
  } catch {
    message.error('作废失败');
  }
}

watch(modelId, async () => {
  await initializePage();
});

watch(
  designerSchema,
  (value) => {
    if (!modelId.value) {
      return;
    }
    setSafeSessionStorage(
      getDisplayDraftStorageKey(modelId.value),
      normalizeDesignerSchema(fields.value, value),
    );
  },
  { deep: true },
);

watch(
  selectedField,
  async (field) => {
    if (!field) {
      return;
    }
    if (field.component !== 'Dict' && field.dictCode) {
      field.dictCode = '';
    }
    if (field.component === 'Dict') {
      await ensureDictOptions(field.dictCode);
    }
  },
  { deep: true },
);

onMounted(async () => {
  activeTab.value = normalizeTab(route.query.tab);
  await initializePage();
});
</script>

<template>
  <Page
    auto-content-height
    content-class="flex h-full min-h-0 flex-col"
    description="模型管理页统一承载字段、显示、授权、关系和历史版本维护。"
    title="模型管理"
  >
    <template #extra>
      <Space>
        <Button @click="handleEditModel">编辑模型</Button>
        <Button
          v-if="currentDefinition?.status === 'published'"
          type="primary"
          @click="handleUpgradeModel"
        >
          升级
        </Button>
        <Button
          v-if="canToggleModel && !currentDefinition?.enabled"
          @click="handleToggleModelEnabled(true)"
        >
          启用
        </Button>
        <Button
          v-if="canToggleModel && currentDefinition?.enabled"
          @click="handleToggleModelEnabled(false)"
        >
          禁用
        </Button>
      </Space>
    </template>

    <ModelForm @success="loadDefinition" />
    <FieldForm @success="loadFields" />
    <RelationshipForm @success="loadRelationships" />

    <Spin :spinning="loading" class="min-h-0 flex-1">
      <div
        class="model-manage-shell grid min-h-0 gap-4 overflow-hidden"
        :class="
          workspaceFullscreen
            ? 'model-manage-shell-fullscreen grid-cols-[minmax(0,1fr)]'
            : 'grid-cols-[420px_minmax(0,1fr)]'
        "
      >
        <Card
          v-show="!workspaceFullscreen"
          class="model-manage-info-card h-full"
        >
          <template #title>
            <div class="flex items-center justify-between gap-2">
              <span>{{ currentDefinition?.name || '模型信息' }}</span>
              <Tag :color="modelStatusMap[currentDefinition?.status]?.color">
                {{ modelStatusMap[currentDefinition?.status]?.label || '-' }}
              </Tag>
            </div>
          </template>

          <div class="mb-4 flex flex-wrap gap-2">
            <Tag color="blue">
              版本 {{ currentDefinition?.versionNo || '-' }}
            </Tag>
            <Tag :color="currentDefinition?.enabled ? 'success' : 'default'">
              {{ currentDefinition?.enabled ? '已启用' : '已禁用' }}
            </Tag>
          </div>

          <Descriptions :column="1" bordered size="small">
            <Descriptions.Item label="模型编码">
              {{ currentDefinition?.code || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="模型类型">
              {{ currentDefinition?.modelTypeLabel || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="数据主题">
              {{ currentDefinition?.themeName || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="数据表">
              {{ currentDefinition?.tableName || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="排序号">
              {{ currentDefinition?.sortNo ?? '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="审核配置">
              {{ currentDefinition?.needAudit ? '需要审核' : '无需审核' }}
            </Descriptions.Item>
            <Descriptions.Item label="审核人">
              {{ currentDefinition?.auditGroupName || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {{ formatDateTime(currentDefinition?.updatedAt) }}
            </Descriptions.Item>
            <Descriptions.Item label="备注">
              {{ currentDefinition?.remark || '-' }}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card class="model-manage-workspace-card h-full min-h-0">
          <template #title>
            <div class="flex items-center justify-between gap-3">
              <span>配置区域</span>
              <Button
                size="small"
                type="text"
                @click="toggleWorkspaceFullscreen"
              >
                <template #icon>
                  <Minimize v-if="workspaceFullscreen" class="size-4" />
                  <Maximize v-else class="size-4" />
                </template>
              </Button>
            </div>
          </template>

          <Tabs v-model:active-key="activeTab">
            <Tabs.TabPane key="fields" tab="字段管理">
              <div class="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">
                    维护当前模型的字段结构与字段状态。
                  </div>
                  <div class="text-text-secondary mt-1 text-xs">
                    已发布模型允许编辑字段业务属性与启用/禁用，字段结构调整仍需先执行“升级”。
                  </div>
                </div>
                <Button
                  :disabled="!isEditable"
                  type="primary"
                  @click="handleCreateField"
                >
                  新增字段
                </Button>
              </div>

              <Alert
                v-if="currentDefinition?.status === 'history'"
                class="mb-4"
                message="历史版本字段已锁定，仅支持查看。"
                show-icon
                type="warning"
              />

              <Alert
                v-else-if="currentDefinition?.status === 'published'"
                class="mb-4"
                message="已发布模型可编辑字段名称、长度、精度、排序、默认值、校验规则、备注，并支持启用/禁用；字段结构不可修改。"
                show-icon
                type="warning"
              />

              <Table
                :columns="fieldColumns"
                :data-source="fields"
                :loading="fieldLoading"
                :pagination="false"
                :scroll="{ x: 1080 }"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    <Space>
                      <span>{{ record.name }}</span>
                      <Tag v-if="record.systemField" color="gold">系统</Tag>
                    </Space>
                  </template>
                  <template v-else-if="column.key === 'dataType'">
                    <Tag color="blue">
                      {{ fieldTypeMap[record.dataType] ?? record.dataType }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <Tag :color="record.status ? 'success' : 'default'">
                      {{ record.status ? '启用' : '禁用' }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <Space>
                      <Button
                        v-if="canEditField && !record.systemField"
                        size="small"
                        type="link"
                        @click="handleEditField(record)"
                      >
                        编辑
                      </Button>
                      <Button
                        v-if="canDeleteField && !record.systemField"
                        danger
                        size="small"
                        type="link"
                        @click="handleDeleteField(record)"
                      >
                        删除
                      </Button>
                      <Button
                        v-if="
                          canEditField && !record.systemField && !record.status
                        "
                        size="small"
                        type="link"
                        @click="handleToggleField(record, true)"
                      >
                        启用
                      </Button>
                      <Button
                        v-if="
                          canEditField && !record.systemField && record.status
                        "
                        size="small"
                        type="link"
                        @click="handleToggleField(record, false)"
                      >
                        禁用
                      </Button>
                    </Space>
                  </template>
                </template>
              </Table>
            </Tabs.TabPane>

            <Tabs.TabPane key="display" tab="显示配置">
              <div class="mb-4 flex items-start justify-between gap-3">
                <Alert
                  class="flex-1"
                  message="当前阶段仅设计维护表单界面。可通过新增分区、拖拽字段和调整属性来设计表单布局。"
                  show-icon
                  type="info"
                />
                <Space>
                  <Button @click="handleOpenPreview">预览</Button>
                  <Button
                    :disabled="!isEditable"
                    @click="regenerateDesignerSchema"
                  >
                    重新生成
                  </Button>
                  <Button :disabled="!isEditable" @click="addSection">
                    新增分区
                  </Button>
                  <Button type="primary" @click="saveDisplayConfig">
                    保存设计
                  </Button>
                </Space>
              </div>

              <div
                class="grid min-h-[640px] gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]"
              >
                <Card size="small" title="字段素材">
                  <div class="space-y-3">
                    <div class="text-xs text-gray-500">
                      拖拽左侧字段到中间画布，同一字段只能在表单中放置一次。
                    </div>
                    <div class="space-y-2">
                      <div
                        v-for="field in paletteFields"
                        :key="field.code"
                        class="cursor-move rounded-lg border p-3 transition"
                        :class="[
                          field.used
                            ? 'border-dashed border-gray-200 bg-gray-50 text-gray-400'
                            : 'border-gray-200 bg-white hover:border-primary',
                        ]"
                        :draggable="isEditable && !field.used"
                        @dragend="clearDragState"
                        @dragstart="handlePaletteDragStart(field.code)"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <div class="font-medium">{{ field.label }}</div>
                          <Tag color="blue">{{ field.dataType }}</Tag>
                        </div>
                        <div class="mt-1 text-xs text-gray-500">
                          {{ field.code }}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card size="small" title="表单画布">
                  <div class="grid grid-cols-24 gap-4">
                    <div
                      v-for="(section, index) in designerSchema.sections"
                      :key="section.id"
                      class="relative rounded-xl border p-4 transition"
                      :class="[
                        designerSelection?.sectionId === section.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200',
                      ]"
                      :draggable="isEditable"
                      :style="{
                        gridColumn: `span ${Math.min(section.span || 24, 24)} / span ${Math.min(section.span || 24, 24)}`,
                      }"
                      @click="selectSection(section.id)"
                      @dragend="clearDragState"
                      @dragover="handleSectionBlockDragOver($event, index)"
                      @dragstart="handleSectionBlockDragStart(section.id)"
                      @drop="handleSectionBlockDrop(index)"
                    >
                      <div
                        v-if="sectionDropTarget?.index === index"
                        class="absolute inset-x-4 top-0 h-1 rounded-full bg-primary"
                      ></div>
                      <div
                        v-if="sectionDropTarget?.index === index + 1"
                        class="absolute inset-x-4 bottom-0 h-1 rounded-full bg-primary"
                      ></div>
                      <div class="mb-4 flex items-center justify-between gap-3">
                        <div class="min-w-0 flex-1">
                          <div class="font-medium">{{ section.title }}</div>
                          <div
                            v-if="section.collapsible"
                            class="text-xs text-gray-500"
                          >
                            {{
                              section.defaultExpanded ? '默认展开' : '默认收起'
                            }}
                          </div>
                        </div>
                        <Button
                          :disabled="!isEditable"
                          danger
                          size="small"
                          type="text"
                          @click.stop="removeSection(section.id)"
                        >
                          删除分区
                        </Button>
                      </div>

                      <div
                        class="grid min-h-[120px] grid-cols-24 gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-3"
                        @dragover="handleSectionDragOver($event, section.id)"
                        @drop="handleDrop(section.id, section.items.length)"
                      >
                        <div
                          v-for="(item, fieldIndex) in section.items"
                          :key="item.id"
                          class="relative rounded-lg border bg-white p-3 shadow-sm transition"
                          :class="[
                            designerSelection?.type === 'field' &&
                            designerSelection.fieldId === item.id
                              ? 'border-primary ring-1 ring-primary/20'
                              : 'border-gray-200',
                          ]"
                          :draggable="isEditable"
                          :style="{
                            gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                          }"
                          @click.stop="selectField(section.id, item.id)"
                          @dragend="clearDragState"
                          @dragstart.stop="
                            handleFieldDragStart(
                              section.id,
                              item.id,
                              item.fieldCode,
                              fieldIndex,
                            )
                          "
                          @dragover="
                            handleFieldDragOver($event, section.id, fieldIndex)
                          "
                          @drop.stop="handleDrop(section.id, fieldIndex)"
                        >
                          <div
                            v-if="
                              dropTarget?.sectionId === section.id &&
                              dropTarget.index === fieldIndex
                            "
                            class="absolute inset-x-3 top-0 h-1 rounded-full bg-primary"
                          ></div>
                          <div
                            v-if="
                              dropTarget?.sectionId === section.id &&
                              dropTarget.index === fieldIndex + 1
                            "
                            class="absolute inset-x-3 bottom-0 h-1 rounded-full bg-primary"
                          ></div>
                          <div class="flex items-start justify-end">
                            <Button
                              :disabled="!isEditable"
                              danger
                              size="small"
                              type="text"
                              @click.stop="removeField(section.id, item.id)"
                            >
                              删除
                            </Button>
                          </div>
                          <div
                            :class="
                              item.labelLayout === 'horizontal'
                                ? 'mt-3 grid grid-cols-[3fr_7fr] items-center gap-3'
                                : 'mt-3 space-y-2'
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
                              <span
                                v-if="item.required"
                                class="ml-1 text-red-500"
                                >*</span>
                            </div>
                            <div class="space-y-2 text-left">
                              <Input
                                v-if="item.component === 'Input'"
                                :placeholder="
                                  item.placeholder || `请输入${item.label}`
                                "
                                :readonly="true"
                                :value="item.defaultValue"
                              />
                              <Input.TextArea
                                v-else-if="item.component === 'Textarea'"
                                :placeholder="
                                  item.placeholder || `请输入${item.label}`
                                "
                                :readonly="true"
                                :rows="4"
                                :value="item.defaultValue"
                              />
                              <InputNumber
                                v-else-if="item.component === 'InputNumber'"
                                :disabled="true"
                                class="w-full"
                                :placeholder="
                                  item.placeholder || `请输入${item.label}`
                                "
                                :value="
                                  item.defaultValue
                                    ? Number(item.defaultValue)
                                    : undefined
                                "
                              />
                              <DatePicker
                                v-else-if="item.component === 'DatePicker'"
                                :disabled="true"
                                class="w-full"
                                :placeholder="
                                  item.placeholder || `请选择${item.label}`
                                "
                              />
                              <Select
                                v-else-if="item.component === 'Dict'"
                                :disabled="true"
                                class="w-full"
                                :options="getDictOptionsByCode(item.dictCode)"
                                :placeholder="
                                  item.placeholder || `请选择${item.label}`
                                "
                                :value="item.defaultValue"
                              />
                              <Switch
                                v-else-if="item.component === 'Switch'"
                                :checked="!!item.defaultValue"
                                :disabled="true"
                              />
                              <Upload
                                v-else-if="item.component === 'Attachment'"
                                :disabled="true"
                              >
                                <Button disabled>上传附件</Button>
                              </Upload>
                              <Input
                                v-else
                                :placeholder="
                                  item.placeholder || `请输入${item.label}`
                                "
                                :readonly="true"
                                :value="item.defaultValue"
                              />
                              <div
                                v-if="item.readonly || !item.visible"
                                class="flex flex-wrap gap-2"
                              >
                                <Tag v-if="item.readonly">只读</Tag>
                                <Tag v-if="!item.visible">隐藏</Tag>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          v-if="section.items.length === 0"
                          class="col-span-24 flex items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 py-10 text-sm text-gray-400"
                        >
                          将字段拖到这里，开始设计当前分区
                        </div>
                        <div
                          v-else-if="
                            dropTarget?.sectionId === section.id &&
                            dropTarget.index === section.items.length
                          "
                          class="col-span-24 h-1 rounded-full bg-primary"
                        ></div>
                      </div>
                    </div>

                    <div
                      v-if="designerSchema.sections.length === 0"
                      class="col-span-24"
                    >
                      <Empty
                        description="暂无分区，请先新增分区或重新生成表单"
                      />
                    </div>
                  </div>
                </Card>

                <Card size="small" title="属性配置">
                  <template v-if="selectedField">
                    <div class="space-y-4">
                      <div class="text-xs text-gray-500">
                        当前正在编辑字段组件属性
                      </div>
                      <Input
                        :disabled="!isEditable"
                        v-model:value="selectedField.label"
                        placeholder="显示标题"
                      />
                      <Select
                        class="w-full"
                        :disabled="!isEditable"
                        v-model:value="selectedField.component"
                        :options="FORM_COMPONENT_OPTIONS"
                        placeholder="组件类型"
                      />
                      <Input
                        :disabled="!isEditable"
                        v-model:value="selectedField.placeholder"
                        placeholder="占位提示"
                      />
                      <div v-if="selectedField.component === 'Dict'">
                        <div class="mb-2 text-sm font-medium">选择字典</div>
                        <Select
                          class="w-full"
                          :disabled="!isEditable"
                          v-model:value="selectedField.dictCode"
                          :options="dictDefinitions"
                          placeholder="请选择字典"
                          show-search
                          option-filter-prop="label"
                        />
                      </div>
                      <Input
                        :disabled="!isEditable"
                        v-model:value="selectedField.help"
                        placeholder="帮助文案"
                      />
                      <Input
                        :disabled="!isEditable"
                        v-model:value="selectedField.defaultValue"
                        placeholder="默认值"
                      />
                      <div>
                        <div class="mb-2 text-sm font-medium">标题布局</div>
                        <Select
                          class="w-full"
                          :disabled="!isEditable"
                          v-model:value="selectedField.labelLayout"
                          :options="LABEL_LAYOUT_OPTIONS"
                        />
                      </div>
                      <div>
                        <div class="mb-2 text-sm font-medium">宽度</div>
                        <Select
                          class="w-full"
                          :disabled="!isEditable"
                          v-model:value="selectedField.span"
                          :options="FIELD_SPAN_OPTIONS"
                        />
                      </div>
                      <div
                        class="space-y-3 rounded-lg border border-gray-200 p-3"
                      >
                        <div class="flex items-center justify-between">
                          <span>显示</span>
                          <Switch
                            v-model:checked="selectedField.visible"
                            :disabled="!isEditable"
                          />
                        </div>
                        <div class="flex items-center justify-between">
                          <span>只读</span>
                          <Switch
                            v-model:checked="selectedField.readonly"
                            :disabled="!isEditable"
                          />
                        </div>
                        <div class="flex items-center justify-between">
                          <span>必填</span>
                          <Switch
                            v-model:checked="selectedField.required"
                            :disabled="!isEditable"
                          />
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="selectedSection">
                    <div class="space-y-4">
                      <div class="text-xs text-gray-500">
                        当前正在编辑分区属性
                      </div>
                      <Input
                        :disabled="!isEditable"
                        v-model:value="selectedSection.title"
                        placeholder="分区标题"
                      />
                      <Input
                        :disabled="!isEditable"
                        v-model:value="selectedSection.code"
                        placeholder="分区编码"
                      />
                      <div>
                        <div class="mb-2 text-sm font-medium">宽度</div>
                        <Select
                          class="w-full"
                          :disabled="!isEditable"
                          v-model:value="selectedSection.span"
                          :options="FIELD_SPAN_OPTIONS"
                        />
                      </div>
                      <div
                        class="space-y-3 rounded-lg border border-gray-200 p-3"
                      >
                        <div class="flex items-center justify-between">
                          <span>可折叠</span>
                          <Switch
                            v-model:checked="selectedSection.collapsible"
                            :disabled="!isEditable"
                          />
                        </div>
                        <div class="flex items-center justify-between">
                          <span>默认展开</span>
                          <Switch
                            v-model:checked="selectedSection.defaultExpanded"
                            :disabled="!isEditable"
                          />
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <Empty description="选择分区或字段后，可在这里编辑属性" />
                  </template>
                </Card>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane key="auth" tab="授权">
              <div class="mb-4 flex items-start justify-between gap-3">
                <Alert
                  class="flex-1"
                  message="当前使用用户组作为授权对象，权限配置先保存在浏览器本地，后续可平滑替换成后端接口。"
                  show-icon
                  type="info"
                />
                <Button type="primary" @click="saveAuthConfig">保存授权</Button>
              </div>

              <Table
                :columns="authColumns"
                :data-source="authConfigs"
                :loading="authLoading"
                :pagination="false"
                row-key="targetId"
              >
                <template #bodyCell="{ column, record }">
                  <template
                    v-if="
                      [
                        'canView',
                        'canEdit',
                        'canAudit',
                        'canPublish',
                        'canManage',
                      ].includes(String(column.key))
                    "
                  >
                    <Switch v-model:checked="record[String(column.key)]" />
                  </template>
                </template>
              </Table>
            </Tabs.TabPane>

            <Tabs.TabPane key="relationship" tab="模型关系">
              <div class="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">
                    仅显示与当前模型相关的关系记录。
                  </div>
                  <div class="text-text-secondary mt-1 text-xs">
                    新增关系时默认带出当前模型作为源模型。
                  </div>
                </div>
                <Button
                  :disabled="!isEditable"
                  type="primary"
                  @click="handleCreateRelationship"
                >
                  新增关系
                </Button>
              </div>

              <Table
                :columns="relationshipColumns"
                :data-source="relationships"
                :loading="relationshipLoading"
                :pagination="false"
                :scroll="{ x: 1280 }"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'relationType'">
                    {{
                      relationTypeMap[record.relationType] ??
                      record.relationType
                    }}
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <Tag :color="relationStatusMap[record.status]?.color">
                      {{
                        relationStatusMap[record.status]?.label ?? record.status
                      }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <Space>
                      <Button
                        v-if="record.status === 'draft'"
                        size="small"
                        type="link"
                        @click="handleEditRelationship(record)"
                      >
                        编辑
                      </Button>
                      <Button
                        v-if="record.status === 'draft'"
                        size="small"
                        type="link"
                        @click="handlePublishRelationship(record)"
                      >
                        发布
                      </Button>
                      <Button
                        v-if="record.status === 'draft'"
                        danger
                        size="small"
                        type="link"
                        @click="handleDeleteRelationship(record)"
                      >
                        删除
                      </Button>
                      <Button
                        v-if="['draft', 'published'].includes(record.status)"
                        size="small"
                        type="link"
                        @click="handleObsoleteRelationship(record)"
                      >
                        作废
                      </Button>
                    </Space>
                  </template>
                </template>
              </Table>
            </Tabs.TabPane>

            <Tabs.TabPane key="history" tab="历史版本">
              <Table
                :columns="versionColumns"
                :data-source="versions"
                :loading="versionLoading"
                :pagination="false"
                :scroll="{ x: 980 }"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <Tag :color="modelStatusMap[record.status]?.color">
                      {{
                        modelStatusMap[record.status]?.label ?? record.status
                      }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTime(record.createdAt) }}
                  </template>
                  <template v-else-if="column.key === 'versionNo'">
                    <Space>
                      <span>v{{ record.versionNo }}</span>
                      <Tag
                        v-if="record.versionNo === currentDefinition?.versionNo"
                        color="blue"
                      >
                        当前
                      </Tag>
                    </Space>
                  </template>
                </template>
              </Table>
              <Empty
                v-if="!versionLoading && versions.length === 0"
                class="mt-8"
              />
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
.model-manage-shell {
  height: calc(100vh - 220px);
}

.model-manage-shell-fullscreen {
  grid-template-columns: minmax(0, 1fr);
}

.model-manage-info-card:deep(.ant-card-body),
.model-manage-workspace-card:deep(.ant-card-body) {
  height: calc(100% - 57px);
  overflow: auto;
}
</style>
