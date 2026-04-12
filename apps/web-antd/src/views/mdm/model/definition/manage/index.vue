<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type {
  CompositeModelMeta,
  FormDesignerSchema,
  FormDesignerSection,
} from '../form-designer';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { Maximize, Minimize } from '@vben/icons';

import {
  Alert,
  Button,
  Card,
  Checkbox,
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
  getModelDataAuthConfigApi,
  saveModelDataAuthConfigApi,
} from '#/api/mdm/model-data-auth';
import {
  deleteModelFieldApi,
  getModelDefinitionDetailApi,
  getModelFieldListApi,
  getModelVersionListApi,
  updateModelDefinitionStatusApi,
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
  createCompositeWidget,
  createDefaultDesignerSchema,
  createFieldWidget,
  createId,
  createTab,
  getDefaultComponent,
  getDisplayDraftStorageKey,
  getDisplayStorageKey,
  getSectionFields,
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
  | { fieldId: string; sectionId: string; tabId?: string; type: 'field' }
  | { sectionId: string; type: 'section' };

type DragPayload =
  | {
      fieldCode: string;
      fieldId: string;
      fromIndex: number;
      fromSectionId: string;
      fromTabId?: string;
      mode: 'existing';
    }
  | { fieldCode: string; mode: 'palette' }
  | {
      label: string;
      mode: 'composite-palette';
      relatedDefinitionId: string;
      relationType: string;
    };

type DropTarget = {
  index: number;
  sectionId: string;
  tabId?: string;
};

type SectionDropTarget = {
  index: number;
};

type AuthFieldPermission = {
  canRead: boolean;
  canWrite: boolean;
};

type AuthGroupOption = {
  disabled?: boolean;
  label: string;
  value: string;
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
const authFieldPermissionMap = ref<Record<string, AuthFieldPermission>>({});
const authGroupOptions = ref<AuthGroupOption[]>([]);
const authRowFilterSql = ref('');
const authSelectedGroupIds = ref<string[]>([]);
const compositeFieldOptionsMap = ref<Record<string, DictOption[]>>({});
const compositeFieldRequestMap = new Map<string, Promise<void>>();
const dictDefinitions = ref<DictDefinitionOption[]>([]);
const dictItemOptionsMap = ref<Record<string, DictOption[]>>({});
const relationships = ref<any[]>([]);
const versions = ref<any[]>([]);
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
const activeDesignerTabs = ref<Record<string, string>>({});

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
const modelStatusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'warning', label: '草稿' },
  history: { color: 'default', label: '历史' },
  invalid: { color: 'default', label: '失效' },
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
const authFieldRows = computed(() =>
  fields.value.map((field) => {
    const permission = authFieldPermissionMap.value[field.id] ?? {
      canRead: false,
      canWrite: false,
    };

    return {
      ...field,
      canRead: permission.canRead,
      canWrite: permission.canWrite,
    };
  }),
);
const authReadableFieldRows = computed(() =>
  authFieldRows.value.filter((field) => !!field.id),
);
const authWritableFieldRows = computed(() =>
  authFieldRows.value.filter((field) => !!field.id && !field.systemField),
);
const authReadAllChecked = computed(
  () =>
    authReadableFieldRows.value.length > 0 &&
    authReadableFieldRows.value.every((field) => field.canRead),
);
const authReadPartialChecked = computed(
  () =>
    authReadableFieldRows.value.some((field) => field.canRead) &&
    !authReadAllChecked.value,
);
const authWriteAllChecked = computed(
  () =>
    authWritableFieldRows.value.length > 0 &&
    authWritableFieldRows.value.every((field) => field.canWrite),
);
const authWritePartialChecked = computed(
  () =>
    authWritableFieldRows.value.some((field) => field.canWrite) &&
    !authWriteAllChecked.value,
);

function getFieldAttachmentMode(field: any) {
  if (field?.attachmentMode) {
    return field.attachmentMode;
  }
  if (field?.dataType === 'attachment') {
    return field?.isMultiple ? 'multiple' : 'single';
  }
  return '';
}

const usedFieldCodes = computed(
  () =>
    new Set(
      designerSchema.value.sections.flatMap((section) =>
        getSectionFields(section)
          .filter((item) => item.component !== 'CompositeModel')
          .map((item) => item.fieldCode),
      ),
    ),
);

const usedCompositeDefinitionIds = computed(
  () =>
    new Set(
      designerSchema.value.sections.flatMap((section) =>
        getSectionFields(section)
          .filter(
            (item) =>
              item.component === 'CompositeModel' && item.relatedDefinitionId,
          )
          .map((item) => String(item.relatedDefinitionId)),
      ),
    ),
);

const paletteFields = computed(() =>
  fields.value
    .filter((item) => !item.isPrimary && item.code !== 'id')
    .map((item) => ({
      attachmentMode: getFieldAttachmentMode(item),
      code: item.code,
      component: getDefaultComponent(item.dataType),
      dataType: item.dataType,
      label: item.name,
      used: usedFieldCodes.value.has(item.code),
    })),
);

const compositePaletteModels = computed<CompositeModelMeta[]>(() => {
  if (currentDefinition.value?.modelType !== 'normal') {
    return [];
  }
  return relationships.value
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
    }));
});

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

function resolveFieldInSchema(
  sectionId: string,
  fieldId: string,
  tabId?: string,
) {
  const section = designerSchema.value.sections.find(
    (item) => item.id === sectionId,
  );
  if (!section) {
    return null;
  }
  if (section.layout === 'tabs') {
    const tab = section.tabs.find((item) => item.id === tabId);
    return tab?.items.find((item) => item.id === fieldId) ?? null;
  }
  return section.items.find((item) => item.id === fieldId) ?? null;
}

const selectedField = computed(() => {
  if (!designerSelection.value || designerSelection.value.type !== 'field') {
    return null;
  }
  return resolveFieldInSchema(
    designerSelection.value.sectionId,
    designerSelection.value.fieldId,
    designerSelection.value.tabId,
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

const authFieldColumns: TableColumnsType = [
  { title: '字段名称', dataIndex: 'name', key: 'name', minWidth: 180 },
  { title: '字段编码', dataIndex: 'code', key: 'code', width: 180 },
  { title: '字段类型', dataIndex: 'dataType', key: 'dataType', width: 140 },
  { title: '读取', dataIndex: 'canRead', key: 'canRead', width: 90 },
  { title: '写入', dataIndex: 'canWrite', key: 'canWrite', width: 90 },
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

function buildAuthFieldPermissionMap(
  permissions: Array<{
    canRead?: boolean;
    canWrite?: boolean;
    fieldId: string;
  }>,
) {
  return Object.fromEntries(
    permissions
      .filter((item) => item.fieldId)
      .map((item) => [
        String(item.fieldId),
        {
          canRead: !!(item.canRead || item.canWrite),
          canWrite: !!item.canWrite,
        },
      ]),
  );
}

function ensureAuthFieldPermissionMap() {
  const nextMap = { ...authFieldPermissionMap.value };

  for (const field of fields.value) {
    if (!field?.id || nextMap[field.id]) {
      continue;
    }

    nextMap[field.id] = {
      canRead: false,
      canWrite: false,
    };
  }

  for (const fieldId of Object.keys(nextMap)) {
    if (!fields.value.some((field) => field.id === fieldId)) {
      delete nextMap[fieldId];
    }
  }

  authFieldPermissionMap.value = nextMap;
}

function updateAuthFieldRead(fieldId: string, checked: boolean) {
  const current = authFieldPermissionMap.value[fieldId] ?? {
    canRead: false,
    canWrite: false,
  };

  authFieldPermissionMap.value = {
    ...authFieldPermissionMap.value,
    [fieldId]: {
      canRead: checked,
      canWrite: checked ? current.canWrite : false,
    },
  };
}

function updateAuthFieldWrite(fieldId: string, checked: boolean) {
  const current = authFieldPermissionMap.value[fieldId] ?? {
    canRead: false,
    canWrite: false,
  };

  authFieldPermissionMap.value = {
    ...authFieldPermissionMap.value,
    [fieldId]: {
      canRead: checked ? true : current.canRead,
      canWrite: checked,
    },
  };
}

function toggleAllAuthFieldRead(checked: boolean) {
  const nextMap = { ...authFieldPermissionMap.value };

  for (const field of authReadableFieldRows.value) {
    nextMap[String(field.id)] = {
      canRead: checked,
      canWrite: checked ? !!nextMap[String(field.id)]?.canWrite : false,
    };
  }

  authFieldPermissionMap.value = nextMap;
}

function toggleAllAuthFieldWrite(checked: boolean) {
  const nextMap = { ...authFieldPermissionMap.value };

  for (const field of authWritableFieldRows.value) {
    nextMap[String(field.id)] = {
      canRead: checked ? true : !!nextMap[String(field.id)]?.canRead,
      canWrite: checked,
    };
  }

  authFieldPermissionMap.value = nextMap;
}

function getDictOptionsByCode(dictCode?: string) {
  if (!dictCode) {
    return [];
  }
  return dictItemOptionsMap.value[dictCode] ?? [];
}

async function ensureCompositeFieldOptions(relatedDefinitionId?: string) {
  if (
    !relatedDefinitionId ||
    compositeFieldOptionsMap.value[relatedDefinitionId]
  ) {
    return;
  }
  const pendingRequest = compositeFieldRequestMap.get(relatedDefinitionId);
  if (pendingRequest) {
    await pendingRequest;
    return;
  }

  const request = (async () => {
    try {
      const compositeFields = await getModelFieldListApi(relatedDefinitionId);
      compositeFieldOptionsMap.value = {
        ...compositeFieldOptionsMap.value,
        [relatedDefinitionId]: compositeFields
          .filter((item: any) => !item.isPrimary && item.code !== 'id')
          .map((item: any) => ({
            label: `${item.name} (${item.code})`,
            value: item.code,
          })),
      };
    } catch {
      compositeFieldOptionsMap.value = {
        ...compositeFieldOptionsMap.value,
        [relatedDefinitionId]: [],
      };
    } finally {
      compositeFieldRequestMap.delete(relatedDefinitionId);
    }
  })();

  compositeFieldRequestMap.set(relatedDefinitionId, request);
  await request;
}

function handleCompositeSummaryDropdownVisibleChange(
  open: boolean,
  relatedDefinitionId?: string,
) {
  if (!open) {
    return;
  }
  void ensureCompositeFieldOptions(relatedDefinitionId);
}

function getAttachmentModeLabel(attachmentMode?: string) {
  return attachmentMode === 'multiple' ? '多附件' : '单附件';
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

function isAttachmentMultiple(attachmentMode?: string) {
  return attachmentMode === 'multiple';
}

function getCompositeFieldOptions(relatedDefinitionId?: string) {
  return compositeFieldOptionsMap.value[relatedDefinitionId || ''] || [];
}

function normalizeTab(tab: unknown): TabKey {
  return TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : 'fields';
}

function loadDesignerSchema() {
  const stored = getSafeStorage<FormDesignerSchema | null>(
    getDisplayStorageKey(modelId.value),
    null,
  );
  designerSchema.value = normalizeDesignerSchema(
    fields.value,
    stored,
    compositePaletteModels.value,
  );
  activeDesignerTabs.value = Object.fromEntries(
    designerSchema.value.sections
      .filter((section) => section.layout === 'tabs')
      .map((section) => [
        section.id,
        section.defaultActiveTabId || section.tabs[0]?.id || '',
      ]),
  );
  if (!designerSelection.value && designerSchema.value.sections.length > 0) {
    const firstSection = designerSchema.value.sections[0];
    if (!firstSection) {
      return;
    }
    designerSelection.value = {
      sectionId: firstSection.id,
      type: 'section',
    };
  }
}

function selectSection(sectionId: string) {
  designerSelection.value = { sectionId, type: 'section' };
}

function selectField(sectionId: string, fieldId: string, tabId?: string) {
  designerSelection.value = { fieldId, sectionId, tabId, type: 'field' };
}

function selectTabField(sectionId: string, tabId: string, fieldId: string) {
  designerSelection.value = { fieldId, sectionId, tabId, type: 'field' };
}

function getSectionById(sectionId: string) {
  return designerSchema.value.sections.find((item) => item.id === sectionId);
}

function getTabItems(sectionId: string, tabId?: string) {
  const section = getSectionById(sectionId);
  if (!section) {
    return null;
  }
  if (section.layout === 'tabs') {
    const targetTabId =
      tabId || activeDesignerTabs.value[sectionId] || section.tabs[0]?.id;
    const tab = section.tabs.find((item) => item.id === targetTabId);
    return tab?.items ?? null;
  }
  return section.items;
}

function updateActiveDesignerTab(sectionId: string, tabId: string) {
  activeDesignerTabs.value = {
    ...activeDesignerTabs.value,
    [sectionId]: tabId,
  };
}

function addSection(layout: 'panel' | 'tabs' = 'panel') {
  if (!isEditable.value) {
    message.warning('当前状态不可编辑表单设计，请先发起升级。');
    return;
  }
  const sectionIndex = designerSchema.value.sections.length + 1;
  const nextSection: FormDesignerSection =
    layout === 'tabs'
      ? {
          code: `tabs_${sectionIndex}`,
          defaultActiveTabId: '',
          id: createId('section'),
          layout: 'tabs',
          span: 24,
          tabs: [createTab(1), createTab(2)],
          title: `页签分区${sectionIndex}`,
        }
      : {
          code: `section_${sectionIndex}`,
          collapsible: false,
          defaultExpanded: true,
          id: createId('section'),
          items: [],
          layout: 'panel',
          span: 24,
          title: `新分区${sectionIndex}`,
        };
  if (nextSection.layout === 'tabs') {
    nextSection.defaultActiveTabId = nextSection.tabs[0]?.id;
    updateActiveDesignerTab(nextSection.id, nextSection.tabs[0]?.id || '');
  }
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
  if (getSectionFields(section).length > 0) {
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

function removeField(sectionId: string, fieldId: string, tabId?: string) {
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
  if (section.layout === 'tabs') {
    const tab = section.tabs.find((item) => item.id === tabId);
    if (!tab) {
      return;
    }
    tab.items = tab.items.filter((item) => item.id !== fieldId);
  } else {
    section.items = section.items.filter((item) => item.id !== fieldId);
  }
  designerSelection.value = { sectionId, type: 'section' };
}

function activateDrag(event: DragEvent) {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return;
  }
  dataTransfer.effectAllowed = 'move';
  dataTransfer.dropEffect = 'move';
  dataTransfer.setData('text/plain', 'mdm-form-designer');
}

function handlePaletteDragStart(event: DragEvent, fieldCode: string) {
  if (!isEditable.value) {
    return;
  }
  activateDrag(event);
  dragPayload.value = { fieldCode, mode: 'palette' };
  dropTarget.value = null;
}

function handleCompositePaletteDragStart(
  event: DragEvent,
  model: CompositeModelMeta,
) {
  if (!isEditable.value) {
    return;
  }
  activateDrag(event);
  dragPayload.value = {
    label: model.label,
    mode: 'composite-palette',
    relatedDefinitionId: model.definitionId,
    relationType: model.relationType,
  };
  dropTarget.value = null;
}

function handleFieldDragStart(
  event: DragEvent,
  sectionId: string,
  fieldId: string,
  fieldCode: string,
  fromIndex: number,
  fromTabId?: string,
) {
  if (!isEditable.value) {
    return;
  }
  activateDrag(event);
  dragPayload.value = {
    fieldCode,
    fieldId,
    fromIndex,
    fromSectionId: sectionId,
    fromTabId,
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

function setDropTarget(sectionId: string, index: number, tabId?: string) {
  dropTarget.value = { index, sectionId, tabId };
}

function setSectionDropTarget(index: number) {
  sectionDropTarget.value = { index };
}

function handleSectionBlockDragOver(
  event: DragEvent,
  sectionId: string,
  index: number,
) {
  if (sectionDragId.value) {
    allowDrop(event);
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (!currentTarget) {
      setSectionDropTarget(index);
      return;
    }
    const rect = currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    setSectionDropTarget(before ? index : index + 1);
    return;
  }
  if (!dragPayload.value) {
    return;
  }
  allowDrop(event);
  const items = getTabItems(sectionId);
  setDropTarget(sectionId, items?.length ?? 0);
}

function handleSectionBlockDrop(sectionId: string, index: number) {
  if (!isEditable.value) {
    return;
  }
  if (sectionDragId.value) {
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
    return;
  }
  if (!dragPayload.value) {
    return;
  }
  handleDrop(sectionId);
}

function handleSectionDragOver(
  event: DragEvent,
  sectionId: string,
  tabId?: string,
) {
  if (!dragPayload.value) {
    return;
  }
  allowDrop(event);
  const items = getTabItems(sectionId, tabId);
  setDropTarget(sectionId, items?.length ?? 0, tabId);
}

function handleFieldDragOver(
  event: DragEvent,
  sectionId: string,
  index: number,
  tabId?: string,
) {
  if (!dragPayload.value) {
    return;
  }
  allowDrop(event);
  const currentTarget = event.currentTarget as HTMLElement | null;
  if (!currentTarget) {
    setDropTarget(sectionId, index, tabId);
    return;
  }
  const rect = currentTarget.getBoundingClientRect();
  const before = event.clientY < rect.top + rect.height / 2;
  setDropTarget(sectionId, before ? index : index + 1, tabId);
}

function handleDrop(sectionId: string, tabId?: string, fallbackIndex?: number) {
  const targetIndex =
    dropTarget.value?.sectionId === sectionId &&
    dropTarget.value?.tabId === tabId
      ? dropTarget.value.index
      : fallbackIndex;
  insertFieldToSection(sectionId, targetIndex, tabId);
}

function insertFieldToSection(
  sectionId: string,
  targetIndex?: number,
  tabId?: string,
) {
  if (!isEditable.value) {
    return;
  }
  const payload = dragPayload.value;
  if (!payload) {
    return;
  }
  const section = getSectionById(sectionId);
  if (!section) {
    return;
  }
  const targetItems = getTabItems(sectionId, tabId);
  if (!targetItems) {
    clearDragState();
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
    targetItems.splice(targetIndex ?? targetItems.length, 0, newField);
    if (tabId) {
      selectTabField(sectionId, tabId, newField.id);
    } else {
      selectField(sectionId, newField.id);
    }
  } else if (payload.mode === 'composite-palette') {
    if (usedCompositeDefinitionIds.value.has(payload.relatedDefinitionId)) {
      message.warning('同一个组合模型在当前表单中只能放置一次');
      clearDragState();
      return;
    }
    const compositeWidget = createCompositeWidget({
      definitionId: payload.relatedDefinitionId,
      label: payload.label,
      relationType: payload.relationType,
    });
    targetItems.splice(targetIndex ?? targetItems.length, 0, compositeWidget);
    if (tabId) {
      selectTabField(sectionId, tabId, compositeWidget.id);
    } else {
      selectField(sectionId, compositeWidget.id);
    }
  } else {
    const sourceItems = getTabItems(payload.fromSectionId, payload.fromTabId);
    if (!sourceItems) {
      return;
    }
    const [movedField] = sourceItems.splice(payload.fromIndex, 1);
    if (!movedField) {
      clearDragState();
      return;
    }
    const sameContainer =
      payload.fromSectionId === sectionId && payload.fromTabId === tabId;
    const nextIndex =
      sameContainer &&
      targetIndex !== undefined &&
      payload.fromIndex < targetIndex
        ? targetIndex - 1
        : (targetIndex ?? targetItems.length);
    targetItems.splice(nextIndex, 0, movedField);
    if (tabId) {
      selectTabField(sectionId, tabId, movedField.id);
    } else {
      selectField(sectionId, movedField.id);
    }
  }

  clearDragState();
}

function handleTabsChange(sectionId: string, activeKey: string) {
  const section = getSectionById(sectionId);
  if (section?.layout === 'tabs') {
    section.defaultActiveTabId = activeKey;
  }
  updateActiveDesignerTab(sectionId, activeKey);
}

function addSectionTab(sectionId: string) {
  const section = getSectionById(sectionId);
  if (!section || section.layout !== 'tabs') {
    return;
  }
  const nextTab = createTab(section.tabs.length + 1);
  section.tabs.push(nextTab);
  section.defaultActiveTabId ||= nextTab.id;
  updateActiveDesignerTab(sectionId, nextTab.id);
}

function removeSectionTab(sectionId: string, tabId: string) {
  const section = getSectionById(sectionId);
  if (!section || section.layout !== 'tabs') {
    return;
  }
  const tab = section.tabs.find((item) => item.id === tabId);
  if (!tab) {
    return;
  }
  if (tab.items.length > 0) {
    message.warning('请先移出该页签内字段后再删除页签');
    return;
  }
  if (section.tabs.length <= 1) {
    message.warning('TAB 分区至少保留一个页签');
    return;
  }
  section.tabs = section.tabs.filter((item) => item.id !== tabId);
  const nextActiveTabId = section.tabs[0]?.id || '';
  section.defaultActiveTabId = nextActiveTabId;
  updateActiveDesignerTab(sectionId, nextActiveTabId);
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
    ensureAuthFieldPermissionMap();
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
  if (!modelId.value) {
    return;
  }
  authLoading.value = true;
  try {
    const [{ items: userGroups }, authConfig] = await Promise.all([
      getUserGroupListApi({ pageSize: 1000 }),
      getModelDataAuthConfigApi(modelId.value),
    ]);

    authGroupOptions.value = userGroups
      .filter((item: any) => item.status !== false)
      .map((item: any) => ({
        label: item.name,
        value: String(item.id),
      }));
    authSelectedGroupIds.value = authConfig.groupIds;
    authRowFilterSql.value = authConfig.rowFilterSql ?? '';
    authFieldPermissionMap.value = buildAuthFieldPermissionMap(
      authConfig.fieldPermissions,
    );
    ensureAuthFieldPermissionMap();
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
        getSectionFields(section)
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
    loadDictDefinitions(),
  ]);
  await loadAuthConfig();
  await refreshDesignerSchema();
}

async function refreshDesignerSchema() {
  loadDesignerSchema();
  await preloadSchemaDictOptions();
}

function saveDisplayConfig() {
  if (!isEditable.value) {
    message.warning('当前状态不可编辑表单设计，请先发起升级。');
    return;
  }
  setSafeStorage(
    getDisplayStorageKey(modelId.value),
    normalizeDesignerSchema(
      fields.value,
      designerSchema.value,
      compositePaletteModels.value,
    ),
  );
  message.success('表单设计已保存');
}

function handleOpenPreview() {
  router.push({
    name: 'MdmModelDefinitionPreview',
    params: { id: modelId.value },
  });
}

function openCompositeModelDesigner(relatedDefinitionId?: string) {
  if (!relatedDefinitionId) {
    return;
  }
  router.push({
    name: 'MdmModelDefinitionManage',
    params: { id: relatedDefinitionId },
    query: { tab: 'display' },
  });
}

function toggleWorkspaceFullscreen() {
  workspaceFullscreen.value = !workspaceFullscreen.value;
}

async function saveAuthConfig() {
  if (!modelId.value) {
    return;
  }

  try {
    authLoading.value = true;
    await saveModelDataAuthConfigApi({
      definitionId: modelId.value,
      fieldPermissions: fields.value
        .filter((field) => field?.id)
        .map((field) => {
          const permission = authFieldPermissionMap.value[field.id] ?? {
            canRead: false,
            canWrite: false,
          };

          return {
            canRead: permission.canRead,
            canWrite: permission.canWrite,
            fieldId: String(field.id),
          };
        }),
      groupIds: authSelectedGroupIds.value,
      rowFilterSql: authRowFilterSql.value,
      status: true,
    });
    message.success('数据授权配置已保存');
  } catch {
    message.error('数据授权配置保存失败');
  } finally {
    authLoading.value = false;
  }
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
    await updateModelDefinitionStatusApi(
      currentDefinition.value.id,
      enabled ? 'published' : 'invalid',
    );
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
        await refreshDesignerSchema();
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
        await refreshDesignerSchema();
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
        await refreshDesignerSchema();
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
    await refreshDesignerSchema();
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
        await refreshDesignerSchema();
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
        await refreshDesignerSchema();
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
        await refreshDesignerSchema();
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
    await refreshDesignerSchema();
  } catch {
    message.error('发布失败');
  }
}

async function handleObsoleteRelationship(row: any) {
  try {
    await obsoleteModelRelationshipApi(row.id);
    message.success('关系已作废');
    await loadRelationships();
    await refreshDesignerSchema();
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
      normalizeDesignerSchema(
        fields.value,
        value,
        compositePaletteModels.value,
      ),
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
    if (field.component === 'CompositeModel') {
      await ensureCompositeFieldOptions(field.relatedDefinitionId);
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
          v-if="currentDefinition?.status === 'invalid'"
          @click="handleToggleModelEnabled(true)"
        >
          启用
        </Button>
        <Button
          v-if="currentDefinition?.status === 'published'"
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
            <Tag
              :color="
                currentDefinition?.status === 'invalid' ? 'default' : 'success'
              "
            >
              {{
                currentDefinition?.status === 'invalid' ? '已禁用' : '已启用'
              }}
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
                  <Button :disabled="!isEditable" @click="addSection()">
                    新增分区
                  </Button>
                  <Button :disabled="!isEditable" @click="addSection('tabs')">
                    新增TAB分区
                  </Button>
                  <Button type="primary" @click="saveDisplayConfig">
                    保存设计
                  </Button>
                </Space>
              </div>

              <div
                class="grid min-h-[640px] gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]"
              >
                <Card size="small" title="设计素材">
                  <div class="space-y-4">
                    <div class="text-xs text-gray-500">
                      拖拽左侧素材到中间画布。字段和组合模型在当前表单中都只能放置一次。
                    </div>
                    <div class="space-y-2">
                      <div class="text-sm font-medium">字段素材</div>
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
                        @dragstart="handlePaletteDragStart($event, field.code)"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <div class="font-medium">{{ field.label }}</div>
                          <Tag color="blue">{{ field.dataType }}</Tag>
                        </div>
                        <div class="mt-1 text-xs text-gray-500">
                          {{ field.code }}
                        </div>
                        <div
                          v-if="field.dataType === 'attachment'"
                          class="mt-2"
                        >
                          <Tag color="processing">
                            {{ getAttachmentModeLabel(field.attachmentMode) }}
                          </Tag>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="compositePaletteModels.length > 0"
                      class="space-y-2"
                    >
                      <div class="text-sm font-medium">组合模型素材</div>
                      <div
                        v-for="model in compositePaletteModels"
                        :key="model.definitionId"
                        class="cursor-move rounded-lg border p-3 transition"
                        :class="[
                          usedCompositeDefinitionIds.has(model.definitionId)
                            ? 'border-dashed border-gray-200 bg-gray-50 text-gray-400'
                            : 'border-amber-200 bg-amber-50/60 hover:border-amber-400',
                        ]"
                        :draggable="
                          isEditable &&
                          !usedCompositeDefinitionIds.has(model.definitionId)
                        "
                        @dragend="clearDragState"
                        @dragstart="
                          handleCompositePaletteDragStart($event, model)
                        "
                      >
                        <div class="flex items-center justify-between gap-2">
                          <div class="font-medium">{{ model.label }}</div>
                          <Tag color="gold">{{ model.relationType }}</Tag>
                        </div>
                        <div class="mt-1 text-xs text-gray-500">
                          组合模型容器
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
                      :style="{
                        gridColumn: `span ${Math.min(section.span || 24, 24)} / span ${Math.min(section.span || 24, 24)}`,
                      }"
                      @click.self="selectSection(section.id)"
                      @dragend="clearDragState"
                      @dragover="
                        handleSectionBlockDragOver($event, section.id, index)
                      "
                      @drop="handleSectionBlockDrop(section.id, index)"
                    >
                      <div
                        v-if="sectionDropTarget?.index === index"
                        class="absolute inset-x-4 top-0 h-1 rounded-full bg-primary"
                      ></div>
                      <div
                        v-if="sectionDropTarget?.index === index + 1"
                        class="absolute inset-x-4 bottom-0 h-1 rounded-full bg-primary"
                      ></div>
                      <div
                        class="mb-4 flex items-center justify-between gap-3"
                        @click.stop="selectSection(section.id)"
                      >
                        <div class="min-w-0 flex-1">
                          <div class="font-medium">{{ section.title }}</div>
                          <div
                            v-if="
                              section.layout !== 'tabs' && section.collapsible
                            "
                            class="text-xs text-gray-500"
                          >
                            {{
                              section.defaultExpanded ? '默认展开' : '默认收起'
                            }}
                          </div>
                          <div
                            v-else-if="section.layout === 'tabs'"
                            class="text-xs text-gray-500"
                          >
                            TAB 页签分区
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
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
                      </div>

                      <div
                        v-if="section.layout !== 'tabs'"
                        class="grid min-h-[120px] grid-cols-24 gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-3"
                        @dragover="handleSectionDragOver($event, section.id)"
                        @drop="
                          handleDrop(
                            section.id,
                            undefined,
                            section.items.length,
                          )
                        "
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
                          :draggable="
                            isEditable && item.component !== 'CompositeModel'
                          "
                          :style="{
                            gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                          }"
                          @click.stop="selectField(section.id, item.id)"
                          @dragend="clearDragState"
                          @dragstart.stop="
                            handleFieldDragStart(
                              $event,
                              section.id,
                              item.id,
                              item.fieldCode,
                              fieldIndex,
                            )
                          "
                          @dragover.stop="
                            handleFieldDragOver($event, section.id, fieldIndex)
                          "
                          @drop.stop="
                            handleDrop(section.id, undefined, fieldIndex)
                          "
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
                              <div
                                v-if="item.component === 'CompositeModel'"
                                class="rounded-lg border border-amber-200 bg-amber-50/70 p-3"
                              >
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
                                  <Tag>
                                    {{
                                      getCompositeDisplayModeLabel(
                                        item.displayMode,
                                      )
                                    }}
                                  </Tag>
                                  <Tag color="blue">子模型设计单独维护</Tag>
                                </div>
                              </div>
                              <Input
                                v-else-if="item.component === 'Input'"
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
                                :max-count="
                                  isAttachmentMultiple(item.attachmentMode)
                                    ? 9
                                    : 1
                                "
                                :multiple="
                                  isAttachmentMultiple(item.attachmentMode)
                                "
                                :disabled="true"
                              >
                                <Button disabled>
                                  {{
                                    isAttachmentMultiple(item.attachmentMode)
                                      ? '上传多个附件'
                                      : '上传附件'
                                  }}
                                </Button>
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
                            !dropTarget.tabId &&
                            dropTarget.index === section.items.length
                          "
                          class="col-span-24 h-1 rounded-full bg-primary"
                        ></div>
                      </div>

                      <div
                        v-else
                        class="rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-3"
                      >
                        <Tabs
                          :active-key="
                            activeDesignerTabs[section.id] ||
                            section.defaultActiveTabId ||
                            section.tabs[0]?.id
                          "
                          @change="
                            (key) => handleTabsChange(section.id, String(key))
                          "
                        >
                          <Tabs.TabPane
                            v-for="tab in section.tabs"
                            :key="tab.id"
                            :tab="tab.title"
                          >
                            <div
                              class="grid min-h-[120px] grid-cols-24 gap-3 rounded-lg border border-dashed border-gray-300 bg-white/80 p-3"
                              @dragover="
                                handleSectionDragOver(
                                  $event,
                                  section.id,
                                  tab.id,
                                )
                              "
                              @drop="
                                handleDrop(section.id, tab.id, tab.items.length)
                              "
                            >
                              <div
                                v-for="(item, fieldIndex) in tab.items"
                                :key="item.id"
                                class="relative rounded-lg border bg-white p-3 shadow-sm transition"
                                :class="[
                                  designerSelection?.type === 'field' &&
                                  designerSelection.fieldId === item.id
                                    ? 'border-primary ring-1 ring-primary/20'
                                    : 'border-gray-200',
                                ]"
                                :draggable="
                                  isEditable &&
                                  item.component !== 'CompositeModel'
                                "
                                :style="{
                                  gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                                }"
                                @click.stop="
                                  selectTabField(section.id, tab.id, item.id)
                                "
                                @dragend="clearDragState"
                                @dragstart.stop="
                                  handleFieldDragStart(
                                    $event,
                                    section.id,
                                    item.id,
                                    item.fieldCode,
                                    fieldIndex,
                                    tab.id,
                                  )
                                "
                                @dragover.stop="
                                  handleFieldDragOver(
                                    $event,
                                    section.id,
                                    fieldIndex,
                                    tab.id,
                                  )
                                "
                                @drop.stop="
                                  handleDrop(section.id, tab.id, fieldIndex)
                                "
                              >
                                <div
                                  v-if="
                                    dropTarget?.sectionId === section.id &&
                                    dropTarget?.tabId === tab.id &&
                                    dropTarget.index === fieldIndex
                                  "
                                  class="absolute inset-x-3 top-0 h-1 rounded-full bg-primary"
                                ></div>
                                <div
                                  v-if="
                                    dropTarget?.sectionId === section.id &&
                                    dropTarget?.tabId === tab.id &&
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
                                    @click.stop="
                                      removeField(section.id, item.id, tab.id)
                                    "
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
                                    <div
                                      v-if="item.component === 'CompositeModel'"
                                      class="rounded-lg border border-amber-200 bg-amber-50/70 p-3"
                                    >
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
                                      <div
                                        class="mt-2 flex flex-wrap gap-2 text-xs"
                                      >
                                        <Tag>
                                          {{
                                            getCompositeDisplayModeLabel(
                                              item.displayMode,
                                            )
                                          }}
                                        </Tag>
                                        <Tag color="blue">
                                          子模型设计单独维护
                                        </Tag>
                                      </div>
                                    </div>
                                    <Input
                                      v-else-if="item.component === 'Input'"
                                      :placeholder="
                                        item.placeholder ||
                                        `请输入${item.label}`
                                      "
                                      :readonly="true"
                                      :value="item.defaultValue"
                                    />
                                    <Input.TextArea
                                      v-else-if="item.component === 'Textarea'"
                                      :placeholder="
                                        item.placeholder ||
                                        `请输入${item.label}`
                                      "
                                      :readonly="true"
                                      :rows="4"
                                      :value="item.defaultValue"
                                    />
                                    <InputNumber
                                      v-else-if="
                                        item.component === 'InputNumber'
                                      "
                                      :disabled="true"
                                      class="w-full"
                                      :placeholder="
                                        item.placeholder ||
                                        `请输入${item.label}`
                                      "
                                      :value="
                                        item.defaultValue
                                          ? Number(item.defaultValue)
                                          : undefined
                                      "
                                    />
                                    <DatePicker
                                      v-else-if="
                                        item.component === 'DatePicker'
                                      "
                                      :disabled="true"
                                      class="w-full"
                                      :placeholder="
                                        item.placeholder ||
                                        `请选择${item.label}`
                                      "
                                    />
                                    <Select
                                      v-else-if="item.component === 'Dict'"
                                      :disabled="true"
                                      class="w-full"
                                      :options="
                                        getDictOptionsByCode(item.dictCode)
                                      "
                                      :placeholder="
                                        item.placeholder ||
                                        `请选择${item.label}`
                                      "
                                      :value="item.defaultValue"
                                    />
                                    <Switch
                                      v-else-if="item.component === 'Switch'"
                                      :checked="!!item.defaultValue"
                                      :disabled="true"
                                    />
                                    <Upload
                                      v-else-if="
                                        item.component === 'Attachment'
                                      "
                                      :max-count="
                                        isAttachmentMultiple(
                                          item.attachmentMode,
                                        )
                                          ? 9
                                          : 1
                                      "
                                      :multiple="
                                        isAttachmentMultiple(
                                          item.attachmentMode,
                                        )
                                      "
                                      :disabled="true"
                                    >
                                      <Button disabled>
                                        {{
                                          isAttachmentMultiple(
                                            item.attachmentMode,
                                          )
                                            ? '上传多个附件'
                                            : '上传附件'
                                        }}
                                      </Button>
                                    </Upload>
                                    <Input
                                      v-else
                                      :placeholder="
                                        item.placeholder ||
                                        `请输入${item.label}`
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
                                v-if="tab.items.length === 0"
                                class="col-span-24 flex items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 py-10 text-sm text-gray-400"
                              >
                                将字段拖到当前页签，开始设计 TAB 内容
                              </div>
                              <div
                                v-else-if="
                                  dropTarget?.sectionId === section.id &&
                                  dropTarget?.tabId === tab.id &&
                                  dropTarget.index === tab.items.length
                                "
                                class="col-span-24 h-1 rounded-full bg-primary"
                              ></div>
                            </div>
                          </Tabs.TabPane>
                        </Tabs>
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
                        v-if="selectedField.component !== 'CompositeModel'"
                        class="w-full"
                        :disabled="!isEditable"
                        v-model:value="selectedField.component"
                        :options="FORM_COMPONENT_OPTIONS"
                        placeholder="组件类型"
                      />
                      <Input v-else value="组合模型容器" disabled />
                      <Input
                        :disabled="!isEditable"
                        v-model:value="selectedField.placeholder"
                        placeholder="占位提示"
                      />
                      <div v-if="selectedField.component === 'CompositeModel'">
                        <div class="mb-2 text-sm font-medium">组合模型</div>
                        <Input
                          :value="
                            selectedField.relatedModelName ||
                            selectedField.label
                          "
                          disabled
                        />
                        <div class="mt-3">
                          <div class="mb-2 text-sm font-medium">展示方式</div>
                          <Select
                            class="w-full"
                            :disabled="!isEditable"
                            v-model:value="selectedField.displayMode"
                            :options="[
                              { label: '面板', value: 'panel' },
                              { label: '页签', value: 'tab' },
                              { label: '明细表', value: 'table' },
                            ]"
                          />
                        </div>
                        <div
                          v-if="selectedField.displayMode === 'table'"
                          class="mt-3"
                        >
                          <div class="mb-2 text-sm font-medium">摘要列</div>
                          <Select
                            class="w-full"
                            mode="multiple"
                            :disabled="!isEditable"
                            v-model:value="selectedField.summaryFieldCodes"
                            :options="
                              getCompositeFieldOptions(
                                selectedField.relatedDefinitionId,
                              )
                            "
                            placeholder="请选择明细表展示字段"
                            show-search
                            option-filter-prop="label"
                            @dropdown-visible-change="
                              handleCompositeSummaryDropdownVisibleChange(
                                $event,
                                selectedField.relatedDefinitionId,
                              )
                            "
                          />
                          <div class="mt-2 text-xs text-gray-500">
                            未配置时，预览页会默认使用子模型前 5 个可见字段。
                          </div>
                        </div>
                        <div
                          class="mt-3 flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-3"
                        >
                          <div class="text-xs text-gray-500">
                            组合模型字段布局在子模型设计页单独维护。
                          </div>
                          <Button
                            size="small"
                            type="primary"
                            @click="
                              openCompositeModelDesigner(
                                selectedField.relatedDefinitionId,
                              )
                            "
                          >
                            打开子模型设计
                          </Button>
                        </div>
                      </div>
                      <div v-if="selectedField.component === 'Attachment'">
                        <div class="mb-2 text-sm font-medium">附件方式</div>
                        <Input
                          :value="
                            getAttachmentModeLabel(selectedField.attachmentMode)
                          "
                          disabled
                        />
                        <div class="mt-2 text-xs text-gray-500">
                          附件方式由字段定义决定，如需调整请回到字段维护页修改。
                        </div>
                      </div>
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
                        v-if="selectedField.component !== 'CompositeModel'"
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
                      <template v-if="selectedSection.layout !== 'tabs'">
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
                      </template>
                      <template v-else>
                        <div
                          class="space-y-3 rounded-lg border border-gray-200 p-3"
                        >
                          <div class="flex items-center justify-between">
                            <span class="text-sm font-medium">TAB 页签</span>
                            <Button
                              :disabled="!isEditable"
                              size="small"
                              type="dashed"
                              @click="addSectionTab(selectedSection.id)"
                            >
                              新增页签
                            </Button>
                          </div>
                          <div
                            v-for="tab in selectedSection.tabs"
                            :key="tab.id"
                            class="flex items-center gap-2"
                          >
                            <Input
                              :disabled="!isEditable"
                              v-model:value="tab.title"
                              placeholder="页签标题"
                            />
                            <Button
                              :disabled="!isEditable"
                              danger
                              size="small"
                              type="text"
                              @click="
                                removeSectionTab(selectedSection.id, tab.id)
                              "
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      </template>
                    </div>
                  </template>

                  <template v-else>
                    <Empty description="选择分区或字段后，可在这里编辑属性" />
                  </template>
                </Card>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane key="auth" tab="数据授权">
              <div class="mb-4 flex items-start justify-between gap-3">
                <Alert
                  class="flex-1"
                  message="多个被授权用户组共用同一份行权限 SQL；列权限按当前模型全部字段统一配置。"
                  show-icon
                  type="info"
                />
                <Button
                  :loading="authLoading"
                  type="primary"
                  @click="saveAuthConfig"
                >
                  保存数据授权
                </Button>
              </div>

              <Card class="mb-4" size="small" title="被授权用户组">
                <Select
                  v-model:value="authSelectedGroupIds"
                  mode="multiple"
                  :options="authGroupOptions"
                  :loading="authLoading"
                  :max-tag-count="6"
                  class="w-full"
                  placeholder="请选择被授权用户组"
                  option-filter-prop="label"
                  show-search
                />
              </Card>

              <div class="grid grid-cols-1 gap-4 xl:grid-cols-10">
                <Card class="xl:col-span-6" size="small" title="列权限配置">
                  <Table
                    :columns="authFieldColumns"
                    :data-source="authFieldRows"
                    :loading="authLoading || fieldLoading"
                    :pagination="false"
                    :scroll="{ x: 680, y: 520 }"
                    row-key="id"
                    size="small"
                  >
                    <template #headerCell="{ column }">
                      <template v-if="column.key === 'canRead'">
                        <div class="flex items-center justify-center gap-2">
                          <span>读取</span>
                          <Checkbox
                            :checked="authReadAllChecked"
                            :indeterminate="authReadPartialChecked"
                            @change="
                              toggleAllAuthFieldRead($event.target.checked)
                            "
                          />
                        </div>
                      </template>
                      <template v-else-if="column.key === 'canWrite'">
                        <div class="flex items-center justify-center gap-2">
                          <span>写入</span>
                          <Checkbox
                            :checked="authWriteAllChecked"
                            :indeterminate="authWritePartialChecked"
                            @change="
                              toggleAllAuthFieldWrite($event.target.checked)
                            "
                          />
                        </div>
                      </template>
                    </template>
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'dataType'">
                        {{ fieldTypeMap[record.dataType] ?? record.dataType }}
                      </template>
                      <template v-else-if="column.key === 'canRead'">
                        <Checkbox
                          :checked="record.canRead"
                          @change="
                            updateAuthFieldRead(
                              String(record.id),
                              $event.target.checked,
                            )
                          "
                        />
                      </template>
                      <template v-else-if="column.key === 'canWrite'">
                        <Checkbox
                          :checked="record.canWrite"
                          :disabled="record.systemField"
                          @change="
                            updateAuthFieldWrite(
                              String(record.id),
                              $event.target.checked,
                            )
                          "
                        />
                      </template>
                    </template>
                  </Table>
                </Card>

                <Card class="xl:col-span-4" size="small" title="行权限配置">
                  <div class="mb-3 text-xs text-gray-500">
                    这里填写共享给当前所选用户组的 SQL 条件脚本，建议仅编写
                    WHERE 条件表达式。
                  </div>
                  <Input.TextArea
                    v-model:value="authRowFilterSql"
                    :auto-size="{ minRows: 18, maxRows: 24 }"
                    placeholder="例如：created_by = auth.uid() and status = 'published'"
                    class="font-mono"
                  />
                </Card>
              </div>
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
