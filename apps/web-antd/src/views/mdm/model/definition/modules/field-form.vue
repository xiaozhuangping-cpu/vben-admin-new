<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createModelFieldApi,
  updateModelFieldApi,
} from '#/api/mdm/model-definition';

const emit = defineEmits(['success']);
const currentData = ref<any>(null);

const getTitle = computed(() => {
  return currentData.value?.id ? '编辑模型字段' : '新增模型字段';
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
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
          { label: '附件(URL)', value: 'attachment' },
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
      component: 'Switch',
      fieldName: 'isMultiple',
      label: '多附件',
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isRequired',
      label: '必填',
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
      component: 'Textarea',
      componentProps: {
        placeholder:
          '附件类型建议直接填写 Supabase Storage 文件 URL，不需要额外附件表。',
      },
      fieldName: 'remarks',
      label: '备注',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  class: 'w-[760px] max-w-[92vw]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      await (currentData.value?.id
        ? updateModelFieldApi(currentData.value.id, {
            ...values,
            definitionId: currentData.value.definitionId,
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
    formApi.setValues(data || {});
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="p-4" />
  </Modal>
</template>
