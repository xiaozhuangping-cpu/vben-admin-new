import type { ModelField } from '#/api/mdm/model-definition';

export type FormDesignerField = {
  component: string;
  defaultValue?: string;
  dictCode?: string;
  fieldCode: string;
  help?: string;
  id: string;
  label: string;
  labelLayout: 'horizontal' | 'vertical';
  placeholder?: string;
  readonly: boolean;
  required: boolean;
  span: number;
  visible: boolean;
};

export type FormDesignerSection = {
  code: string;
  collapsible: boolean;
  defaultExpanded: boolean;
  id: string;
  items: FormDesignerField[];
  span: number;
  title: string;
};

export type FormDesignerSchema = {
  sections: FormDesignerSection[];
  version: number;
};

export type FieldMeta = {
  code: string;
  component: string;
  label: string;
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
          code: item.code,
          component: getDefaultComponent(item.dataType),
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
    dictCode: '',
    fieldCode: meta.code,
    id: createId('field'),
    label: meta.label,
    labelLayout: 'vertical',
    readonly: false,
    required: false,
    span: 12,
    visible: true,
  };
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
        span: 24,
        items: canvasFields
          .map((item) => createFieldWidget(item.code, fieldMetaMap))
          .filter(Boolean) as FormDesignerField[],
        title: '基础信息',
      },
    ],
    version: 1,
  } satisfies FormDesignerSchema;
}

export function normalizeDesignerSchema(
  fields: ModelField[],
  schema?: FormDesignerSchema | null,
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
  const usedCodes = new Set<string>();

  const sections = baseSchema.sections
    .map((section, sectionIndex) => ({
      code: section.code || `section_${sectionIndex + 1}`,
      collapsible: section.collapsible ?? false,
      defaultExpanded: section.defaultExpanded ?? true,
      id: section.id || createId('section'),
      span: section.span ?? 24,
      items: (section.items || [])
        .filter((item) => {
          if (
            !fieldCodeSet.has(item.fieldCode) ||
            usedCodes.has(item.fieldCode)
          ) {
            return false;
          }
          usedCodes.add(item.fieldCode);
          return true;
        })
        .map((item) => {
          const meta = fieldMetaMap.get(item.fieldCode);
          return {
            component: item.component || meta?.component || 'Input',
            defaultValue: item.defaultValue ?? '',
            dictCode: item.dictCode ?? '',
            fieldCode: item.fieldCode,
            help: item.help ?? '',
            id: item.id || createId('field'),
            label: item.label || meta?.label || item.fieldCode,
            labelLayout: item.labelLayout ?? 'vertical',
            placeholder: item.placeholder ?? '',
            readonly: item.readonly ?? false,
            required: item.required ?? false,
            span: item.span ?? 12,
            visible: item.visible ?? true,
          };
        }),
      title: section.title || `分区${sectionIndex + 1}`,
    }))
    .filter((section) => section.items.length > 0 || section.title);

  if (sections.length === 0) {
    return createDefaultDesignerSchema(canvasFields);
  }

  return {
    sections,
    version: 1,
  } satisfies FormDesignerSchema;
}
