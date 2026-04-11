<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createDictItemApi, updateDictItemApi } from '#/api/mdm/dict';

const emit = defineEmits(['success']);
const currentData = ref<any>(null);

const getTitle = computed(() => {
  return currentData.value?.id ? '编辑字典条目' : '新增字典条目';
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入显示名',
      },
      fieldName: 'name',
      label: '显示名',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入条目编码',
      },
      fieldName: 'code',
      label: '编码',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入值',
      },
      fieldName: 'value',
      label: '值',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: {
        min: 0,
        placeholder: '请输入排序值',
      },
      defaultValue: 0,
      fieldName: 'sortNo',
      label: '排序',
    },
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'status',
      label: '启用',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
      },
      fieldName: 'remark',
      label: '备注',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      await (currentData.value?.id ? updateDictItemApi(currentData.value.id, {
          ...(values as any),
          dictId: currentData.value.dictId,
        }) : createDictItemApi({
          ...(values as any),
          dictId: currentData.value.dictId,
        }));
      emit('success');
      currentData.value?.onSuccess?.();
      modalApi.close();
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
    formApi.setValues({
      ...data,
      sortNo: data?.sortNo ?? 0,
      status: data?.status ?? true,
    });
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="p-4" />
  </Modal>
</template>
