import type { ModelField } from '#/api/mdm/model-definition';

export type FormDesignerField = {
  attachmentMode?: string;
  component: string;
  defaultValue?: string;
  dictCode?: string;
  displayMode?: 'panel' | 'tab' | 'table';
  fieldCode: string;
  help?: string;
  id: string;
  label: string;
  labelLayout: 'horizontal' | 'vertical';
  placeholder?: string;
  readonly: boolean;
  relatedDefinitionId?: string;
  relatedModelName?: string;
  relationType?: string;
  required: boolean;
  sourceKind?: 'composite' | 'field';
  span: number;
  summaryColumns?: FormDesignerSummaryColumn[];
  summaryFieldCodes?: string[];
  visible: boolean;
};

export type FormDesignerSummaryColumn = {
  fieldCode: string;
  width?: number;
  wrap?: boolean;
};

export type FormDesignerTab = {
  id: string;
  items: FormDesignerField[];
  key: string;
  title: string;
};

type BaseFormDesignerSection = {
  code: string;
  id: string;
  span: number;
  title: string;
};

export type FormDesignerPanelSection = BaseFormDesignerSection & {
  collapsible: boolean;
  defaultExpanded: boolean;
  items: FormDesignerField[];
  layout?: 'panel';
};

export type FormDesignerTabsSection = BaseFormDesignerSection & {
  defaultActiveTabId?: string;
  layout: 'tabs';
  tabs: FormDesignerTab[];
};

export type FormDesignerSection =
  | FormDesignerPanelSection
  | FormDesignerTabsSection;

export type FormDesignerSchema = {
  sections: FormDesignerSection[];
  version: number;
};

export type FieldMeta = {
  attachmentMode?: string;
  code: string;
  component: string;
  dictCode?: string;
  label: string;
};

export type CompositeModelMeta = {
  definitionId: string;
  label: string;
  relationType: string;
};

function shouldShowOnDesignerCanvas(
  field: Pick<ModelField, 'code' | 'isPrimary'>,
) {
  return !field.isPrimary && field.code !== 'id';
}

export function getDisplayStorageKey(modelId: string) {
  return `mdm:model:display:${modelId}`;
}

export function getDisplayDraftStorageKey(modelId: string) {
  return `mdm:model:display:draft:${modelId}`;
}

export function getDefaultComponent(dataType?: string) {
  switch (dataType) {
    case 'attachment': {
      return 'Attachment';
    }
    case 'boolean': {
      return 'Switch';
    }
    case 'date':
    case 'timestamptz': {
      return 'DatePicker';
    }
    case 'dict': {
      return 'Dict';
    }
    case 'int4':
    case 'numeric': {
      return 'InputNumber';
    }
    case 'text': {
      return 'Textarea';
    }
    default: {
      return 'Input';
    }
  }
}

export function buildFieldMetaMap(fields: ModelField[]) {
  return new Map<string, FieldMeta>(
    fields
      .filter((item) => shouldShowOnDesignerCanvas(item))
      .map((item) => [
        item.code,
        {
          attachmentMode: item.attachmentMode ?? undefined,
          code: item.code,
          component: getDefaultComponent(item.dataType),
          dictCode: item.dictCode ?? '',
          label: item.name,
        },
      ]),
  );
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createFieldWidget(
  fieldCode: string,
  fieldMetaMap: Map<string, FieldMeta>,
): FormDesignerField | null {
  const meta = fieldMetaMap.get(fieldCode);
  if (!meta) {
    return null;
  }
  return {
    component: meta.component,
    attachmentMode: meta.attachmentMode ?? '',
    dictCode: meta.dictCode ?? '',
    fieldCode: meta.code,
    id: createId('field'),
    label: meta.label,
    labelLayout: 'vertical',
    readonly: false,
    required: false,
    sourceKind: 'field',
    span: 12,
    visible: true,
  };
}

export function createCompositeWidget(
  composite: CompositeModelMeta,
): FormDesignerField {
  return {
    component: 'CompositeModel',
    defaultValue: '',
    displayMode: composite.relationType === '1:N' ? 'table' : 'panel',
    dictCode: '',
    fieldCode: `__composite__:${composite.definitionId}`,
    help: '',
    id: createId('field'),
    label: composite.label,
    labelLayout: 'vertical',
    placeholder: '',
    readonly: false,
    relatedDefinitionId: composite.definitionId,
    relatedModelName: composite.label,
    relationType: composite.relationType,
    required: false,
    sourceKind: 'composite',
    span: 24,
    summaryColumns: [],
    summaryFieldCodes: [],
    visible: true,
  };
}

export function createTab(
  index: number,
  items: FormDesignerField[] = [],
): FormDesignerTab {
  return {
    id: createId('tab'),
    items,
    key: `tab_${index}`,
    title: `页签${index}`,
  };
}

function normalizeSummaryColumns(item: Partial<FormDesignerField>) {
  const summaryColumns = Array.isArray(item.summaryColumns)
    ? item.summaryColumns
        .filter((column): column is FormDesignerSummaryColumn =>
          Boolean(column?.fieldCode),
        )
        .map((column) => ({
          fieldCode: column.fieldCode,
          width: column.width ?? undefined,
          wrap: column.wrap ?? false,
        }))
    : [];

  if (summaryColumns.length > 0) {
    return summaryColumns;
  }

  return Array.isArray(item.summaryFieldCodes)
    ? item.summaryFieldCodes.filter(Boolean).map((fieldCode) => ({
        fieldCode,
        width: undefined,
        wrap: false,
      }))
    : [];
}

function normalizeField(
  item: Partial<FormDesignerField>,
  fieldMetaMap: Map<string, FieldMeta>,
) {
  const meta = fieldMetaMap.get(item.fieldCode || '');
  const summaryColumns = normalizeSummaryColumns(item);
  const normalizedDictCode =
    typeof item.dictCode === 'string' && item.dictCode.trim()
      ? item.dictCode
      : (meta?.dictCode ?? '');
  return {
    component: item.component || meta?.component || 'Input',
    attachmentMode: meta?.attachmentMode ?? item.attachmentMode ?? '',
    defaultValue: item.defaultValue ?? '',
    displayMode: item.displayMode ?? 'panel',
    dictCode: normalizedDictCode,
    fieldCode: item.fieldCode || '',
    help: item.help ?? '',
    id: item.id || createId('field'),
    label: item.label || meta?.label || item.fieldCode || '',
    labelLayout: item.labelLayout ?? 'vertical',
    placeholder: item.placeholder ?? '',
    readonly: item.readonly ?? false,
    relatedDefinitionId: item.relatedDefinitionId ?? '',
    relatedModelName: item.relatedModelName ?? '',
    relationType: item.relationType ?? '',
    required: item.required ?? false,
    sourceKind: item.sourceKind ?? 'field',
    span: item.span ?? 12,
    summaryColumns,
    summaryFieldCodes: summaryColumns.map((column) => column.fieldCode),
    visible: item.visible ?? true,
  } satisfies FormDesignerField;
}

function normalizeSectionItems(
  items: Array<Partial<FormDesignerField>> | undefined,
  compositeMap: Map<string, CompositeModelMeta>,
  fieldCodeSet: Set<string>,
  fieldMetaMap: Map<string, FieldMeta>,
  usedCompositeIds: Set<string>,
  usedCodes: Set<string>,
) {
  return (items || [])
    .filter((item) => {
      if (item.component === 'CompositeModel') {
        if (
          !item.relatedDefinitionId ||
          !compositeMap.has(item.relatedDefinitionId) ||
          usedCompositeIds.has(item.relatedDefinitionId)
        ) {
          return false;
        }
        usedCompositeIds.add(item.relatedDefinitionId);
        return true;
      }
      if (
        !item.fieldCode ||
        !fieldCodeSet.has(item.fieldCode) ||
        usedCodes.has(item.fieldCode)
      ) {
        return false;
      }
      usedCodes.add(item.fieldCode);
      return true;
    })
    .map((item) => normalizeField(item, fieldMetaMap));
}

function normalizePanelSection(
  section: Partial<FormDesignerPanelSection>,
  compositeMap: Map<string, CompositeModelMeta>,
  sectionIndex: number,
  fieldCodeSet: Set<string>,
  fieldMetaMap: Map<string, FieldMeta>,
  usedCompositeIds: Set<string>,
  usedCodes: Set<string>,
) {
  return {
    code: section.code || `section_${sectionIndex + 1}`,
    collapsible: section.collapsible ?? false,
    defaultExpanded: section.defaultExpanded ?? true,
    id: section.id || createId('section'),
    items: normalizeSectionItems(
      section.items,
      compositeMap,
      fieldCodeSet,
      fieldMetaMap,
      usedCompositeIds,
      usedCodes,
    ),
    layout: 'panel',
    span: section.span ?? 24,
    title: section.title || `分区${sectionIndex + 1}`,
  } satisfies FormDesignerPanelSection;
}

function normalizeTabsSection(
  section: Partial<FormDesignerTabsSection>,
  compositeMap: Map<string, CompositeModelMeta>,
  sectionIndex: number,
  fieldCodeSet: Set<string>,
  fieldMetaMap: Map<string, FieldMeta>,
  usedCompositeIds: Set<string>,
  usedCodes: Set<string>,
) {
  const tabs = (section.tabs || [])
    .map((tab, tabIndex) => ({
      id: tab.id || createId('tab'),
      items: normalizeSectionItems(
        tab.items,
        compositeMap,
        fieldCodeSet,
        fieldMetaMap,
        usedCompositeIds,
        usedCodes,
      ),
      key: tab.key || `tab_${tabIndex + 1}`,
      title: tab.title || `页签${tabIndex + 1}`,
    }))
    .filter((tab) => tab.items.length > 0 || tab.title);
  const normalizedTabs = tabs.length > 0 ? tabs : [createTab(1)];
  const defaultActiveTabId = normalizedTabs.some(
    (tab) => tab.id === section.defaultActiveTabId,
  )
    ? section.defaultActiveTabId
    : normalizedTabs[0]?.id;
  return {
    code: section.code || `tabs_${sectionIndex + 1}`,
    defaultActiveTabId,
    id: section.id || createId('section'),
    layout: 'tabs',
    span: section.span ?? 24,
    tabs: normalizedTabs,
    title: section.title || `页签分区${sectionIndex + 1}`,
  } satisfies FormDesignerTabsSection;
}

export function getSectionFields(section: FormDesignerSection) {
  if (section.layout === 'tabs') {
    return section.tabs.flatMap((tab) => tab.items);
  }
  return section.items;
}

export function createDefaultDesignerSchema(fields: ModelField[]) {
  const canvasFields = fields.filter((item) =>
    shouldShowOnDesignerCanvas(item),
  );
  const fieldMetaMap = buildFieldMetaMap(canvasFields);
  return {
    sections: [
      {
        code: 'basic_info',
        collapsible: false,
        defaultExpanded: true,
        id: createId('section'),
        items: canvasFields
          .map((item) => createFieldWidget(item.code, fieldMetaMap))
          .filter(Boolean) as FormDesignerField[],
        layout: 'panel',
        span: 24,
        title: '基础信息',
      },
    ],
    version: 1,
  } satisfies FormDesignerSchema;
}

export function normalizeDesignerSchema(
  fields: ModelField[],
  schema?: FormDesignerSchema | null,
  compositeModels: CompositeModelMeta[] = [],
) {
  const canvasFields = fields.filter((item) =>
    shouldShowOnDesignerCanvas(item),
  );
  const baseSchema =
    schema && Array.isArray(schema.sections)
      ? schema
      : createDefaultDesignerSchema(canvasFields);
  const fieldMetaMap = buildFieldMetaMap(canvasFields);
  const fieldCodeSet = new Set(canvasFields.map((item) => item.code));
  const compositeMap = new Map(
    compositeModels.map((item) => [item.definitionId, item]),
  );
  const usedCompositeIds = new Set<string>();
  const usedCodes = new Set<string>();

  const sections = baseSchema.sections
    .map((section, sectionIndex) => {
      if (section.layout === 'tabs') {
        return normalizeTabsSection(
          section,
          compositeMap,
          sectionIndex,
          fieldCodeSet,
          fieldMetaMap,
          usedCompositeIds,
          usedCodes,
        );
      }
      return normalizePanelSection(
        section,
        compositeMap,
        sectionIndex,
        fieldCodeSet,
        fieldMetaMap,
        usedCompositeIds,
        usedCodes,
      );
    })
    .filter((section) =>
      section.layout === 'tabs'
        ? section.tabs.length > 0 || section.title
        : section.items.length > 0 || section.title,
    );

  if (sections.length === 0) {
    return createDefaultDesignerSchema(canvasFields);
  }

  return {
    sections,
    version: 1,
  } satisfies FormDesignerSchema;
}
