<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createDistributionSchemeFieldApi,
  updateDistributionSchemeFieldApi,
} from '#/api/mdm/distribution';

import { useMappingSchema } from '../data';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);

const title = computed(() =>
  currentData.value?.id ? '编辑字段映射' : '新增字段映射',
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: [],
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
      const payload = {
        fixedValue: values.fixedValue,
        mappingType: values.mappingType,
        schemeId: currentData.value?.schemeId,
        sortNo: values.sortNo,
        sourceFieldCode: values.sourceFieldCode,
        targetFieldCode: values.targetFieldCode,
        transformScript: values.transformScript,
      };

      await (currentData.value?.id ? updateDistributionSchemeFieldApi(currentData.value.id, payload) : createDistributionSchemeFieldApi(payload));

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
    formApi.setState({
      schema: useMappingSchema(data.sourceFieldOptions ?? []),
    });
    formApi.resetForm();
    formApi.setValues({
      ...data,
      mappingType: data.mappingType ?? 'direct',
      sortNo: data.sortNo ?? 10,
    });
  },
});
</script>

<template>
  <Modal :title="title">
    <Form class="p-4" />
  </Modal>
</template>
