<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createDynamicMasterDataRecordApi,
  updateDynamicMasterDataRecordApi,
} from '#/api/mdm/master-data';

import { buildDynamicFormSchema } from '../data';

const emit = defineEmits(['success']);
const currentData = ref<any>(null);

const getTitle = computed(() => {
  const masterDataTitle = currentData.value?.masterDataTitle || '主数据';
  return currentData.value?.id
    ? `编辑${masterDataTitle}`
    : `新增${masterDataTitle}`;
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: [],
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
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined),
      );

      await (currentData.value?.id
        ? updateDynamicMasterDataRecordApi(
            currentData.value.tableName,
            currentData.value.id,
            payload,
          )
        : createDynamicMasterDataRecordApi(
            currentData.value.tableName,
            payload,
          ));

      currentData.value?.onSuccess?.();
      emit('success');
      modalApi.close();
    } finally {
      modalApi.lock(false);
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<any>();
      currentData.value = data;
      formApi.setState({
        schema: buildDynamicFormSchema(data?.fields || []),
      });
      formApi.resetForm();
      formApi.setValues(data || {});
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="p-4" />
  </Modal>
</template>
