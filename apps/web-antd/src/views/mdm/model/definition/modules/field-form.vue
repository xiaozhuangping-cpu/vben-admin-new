<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  getDictDefinitionOptionsApi,
  getDictItemOptionsApi,
} from '#/api/mdm/dict';
import {
  createModelFieldApi,
  getModelDefinitionOptionsApi,
  updateModelFieldApi,
} from '#/api/mdm/model-definition';
import { getNumberingSegmentOptionsApi } from '#/api/mdm/numbering';
import { getValidationRuleOptionsApi } from '#/api/mdm/validation-rule';

const emit = defineEmits(['success']);
const currentData = ref<any>(null);

const isPublishedEditMode = computed(
  () =>
    currentData.value?.definitionStatus === 'published' &&
    !!currentData.value?.id,
);

const getDefinitionOptions = () =>
  getModelDefinitionOptionsApi({
    excludeId: currentData.value?.definitionId,
  });

const getTitle = computed(() => {
  return currentData.value?.id ? '编辑模型字段' : '新增模型字段';
});

function getInitialAttachmentMode(data: any) {
  if (data?.attachmentMode) {
    return data.attachmentMode;
  }
  if (data?.dataType === 'attachment') {
    return data?.isMultiple ? 'multiple' : 'single';
  }
  return null;
}

function supportsSearchable(dataType?: string) {
  return String(dataType || '') !== 'attachment';
}

function supportsListVisible(dataType?: string) {
  return String(dataType || '') !== 'attachment';
}

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '请输入字段名称' },
      fieldName: 'name',
      label: '字段名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '请输入字段编码' },
      fieldName: 'code',
      label: '字段编码',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '文本', value: 'text' },
          { label: '短文本', value: 'varchar' },
          { label: '整数', value: 'int4' },
          { label: '数值', value: 'numeric' },
          { label: '布尔', value: 'boolean' },
          { label: '日期', value: 'date' },
          { label: '时间', value: 'timestamptz' },
          { label: '字典', value: 'dict' },
          { label: '关联主数据', value: 'relation_master' },
          { label: '附件', value: 'attachment' },
        ],
        placeholder: '请选择数据类型',
      },
      fieldName: 'dataType',
      label: '数据类型',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, placeholder: '长度' },
      fieldName: 'length',
      label: '长度',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, placeholder: '精度' },
      fieldName: 'precision',
      label: '精度',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 1, placeholder: '排序' },
      fieldName: 'sort',
      label: '排序',
      defaultValue: 10,
    },
    {
      component: 'Input',
      componentProps: { placeholder: '默认值' },
      fieldName: 'defaultValue',
      label: '默认值',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: getValidationRuleOptionsApi,
        placeholder: '请选择校验规则',
      },
      fieldName: 'validationRuleId',
      label: '校验规则',
    },
    {
      component: 'Switch',
      fieldName: 'isCodeField',
      label: '是否编码字段',
      defaultValue: false,
      dependencies: {
        show: (values) => values.dataType !== 'attachment',
        triggerFields: ['dataType'],
      },
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: getNumberingSegmentOptionsApi,
        placeholder: '请选择码段',
      },
      fieldName: 'numberingSegmentId',
      label: '码段',
      dependencies: {
        show: (values) =>
          values.dataType !== 'attachment' && values.isCodeField === true,
        triggerFields: ['dataType', 'isCodeField'],
      },
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: getDictDefinitionOptionsApi,
        placeholder: '请选择关联字典',
        showSearch: true,
        optionFilterProp: 'label',
      },
      fieldName: 'dictCode',
      label: '关联字典',
      dependencies: {
        show: (values) => values.dataType === 'dict',
        rules: ({ dataType }) =>
          dataType === 'dict' ? 'selectRequired' : null,
        triggerFields: ['dataType'],
      },
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: () => getDefinitionOptions(),
        placeholder: '请选择关联主数据',
        showSearch: true,
        optionFilterProp: 'label',
      },
      fieldName: 'relatedDefinitionId',
      label: '关联主数据',
      dependencies: {
        show: (values) => values.dataType === 'relation_master',
        rules: ({ dataType }) =>
          dataType === 'relation_master' ? 'selectRequired' : null,
        triggerFields: ['dataType'],
      },
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => await getDictItemOptionsApi('mdm_model_attachment'),
        placeholder: '请选择附件方式',
      },
      fieldName: 'attachmentMode',
      label: '附件方式',
      defaultValue: 'single',
      dependencies: {
        show: (values) => values.dataType === 'attachment',
        rules: ({ dataType }) =>
          dataType === 'attachment' ? 'selectRequired' : null,
        triggerFields: ['dataType'],
      },
    },
    {
      component: 'Switch',
      fieldName: 'isRequired',
      label: '必填',
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isTitle',
      label: '是否标题',
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isPrimary',
      label: '主键',
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isUnique',
      label: '唯一',
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'status',
      label: '启用',
      defaultValue: true,
    },
    {
      component: 'Switch',
      fieldName: 'listVisible',
      label: '列表展示',
      defaultValue: false,
      dependencies: {
        show: (values) => supportsListVisible(values.dataType),
        triggerFields: ['dataType'],
      },
    },
    {
      component: 'Switch',
      fieldName: 'searchable',
      label: '支持搜索',
      defaultValue: false,
      dependencies: {
        show: (values) => supportsSearchable(values.dataType),
        triggerFields: ['dataType'],
      },
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder:
          '附件字段通过“附件方式”控制单附件/多附件，上传文件统一存储为附件对象。',
      },
      fieldName: 'remarks',
      formItemClass: 'md:cols-span-2',
      label: '备注',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  class: 'w-[760px] max-w-[92vw]',
  async onConfirm() {
    if (currentData.value?.systemField) {
      message.warning('系统默认字段不允许编辑维护。');
      return;
    }
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      if (values.isCodeField && !values.numberingSegmentId) {
        message.warning('编码字段必须选择码段。');
        return;
      }
      if (values.isCodeField) {
        // keep current numbering segment
      } else {
        values.numberingSegmentId = null;
      }
      if (values.dataType === 'attachment') {
        values.attachmentMode = values.attachmentMode || 'single';
        values.isMultiple = values.attachmentMode === 'multiple';
        values.listVisible = false;
        values.searchable = false;
      } else {
        values.attachmentMode = null;
      }
      if (!supportsListVisible(values.dataType)) {
        values.listVisible = false;
      }
      if (!supportsSearchable(values.dataType)) {
        values.searchable = false;
      }
      if (isPublishedEditMode.value) {
        const originalLength = currentData.value?.length;
        const originalPrecision = currentData.value?.precision;
        const nextLength = values.length ?? null;
        const nextPrecision = values.precision ?? null;

        if (
          originalLength !== null &&
          originalLength !== undefined &&
          (nextLength === null ||
            nextLength === undefined ||
            nextLength < originalLength)
        ) {
          message.warning('已发布模型的字段长度只能调大，不能缩小。');
          return;
        }

        if (
          originalPrecision !== null &&
          originalPrecision !== undefined &&
          (nextPrecision === null ||
            nextPrecision === undefined ||
            nextPrecision < originalPrecision)
        ) {
          message.warning('已发布模型的字段精度只能调大，不能缩小。');
          return;
        }
      }
      await (currentData.value?.id
        ? updateModelFieldApi(currentData.value.id, {
            ...values,
            definitionId: currentData.value.definitionId,
            definitionStatus: currentData.value.definitionStatus,
          } as any)
        : createModelFieldApi({
            ...values,
            definitionId: currentData.value.definitionId,
          } as any));
      modalApi.close();
      currentData.value?.onSuccess?.();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData<any>() || {};
    currentData.value = data;
    const isSystemField = !!data?.systemField;
    const isRevisedMode = data?.definitionStatus === 'revised' && !!data?.id;
    const isPublishedMode =
      data?.definitionStatus === 'published' && !!data?.id;
    formApi.updateSchema([
      {
        fieldName: 'code',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'dataType',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'length',
        componentProps: {
          disabled: isSystemField,
          min: isPublishedMode ? (data?.length ?? 0) : 0,
          placeholder: '长度',
        },
      },
      {
        fieldName: 'precision',
        componentProps: {
          disabled: isSystemField,
          min: isPublishedMode ? (data?.precision ?? 0) : 0,
          placeholder: '精度',
        },
      },
      {
        fieldName: 'isCodeField',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'numberingSegmentId',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'dictCode',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'relatedDefinitionId',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'attachmentMode',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'isPrimary',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'isRequired',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'isTitle',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'isUnique',
        componentProps: {
          disabled: isSystemField || isRevisedMode || isPublishedMode,
        },
      },
      {
        fieldName: 'name',
        componentProps: { disabled: isSystemField },
      },
      {
        fieldName: 'sort',
        componentProps: {
          disabled: isSystemField,
          min: 1,
          placeholder: '排序',
        },
      },
      {
        fieldName: 'defaultValue',
        componentProps: { disabled: isSystemField, placeholder: '默认值' },
      },
      {
        fieldName: 'validationRuleId',
        componentProps: { disabled: isSystemField || isRevisedMode },
      },
      {
        fieldName: 'status',
        componentProps: { disabled: isSystemField || isPublishedMode },
      },
      {
        fieldName: 'listVisible',
        componentProps: {
          disabled:
            isSystemField ||
            !supportsListVisible(data?.dataType) ||
            String(data?.code || '').toLowerCase() === 'id',
        },
      },
      {
        fieldName: 'searchable',
        componentProps: {
          disabled:
            isSystemField ||
            !supportsSearchable(data?.dataType) ||
            String(data?.code || '').toLowerCase() === 'id',
        },
      },
      {
        fieldName: 'remarks',
        componentProps: { disabled: isSystemField },
      },
    ]);
    formApi.setValues({
      attachmentMode: getInitialAttachmentMode(data),
      isCodeField: false,
      isMultiple: false,
      numberingSegmentId: null,
      dictCode: null,
      isTitle: false,
      listVisible: false,
      relatedDefinitionId: null,
      searchable: false,
      ...data,
    });
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="p-4" />
  </Modal>
</template>
