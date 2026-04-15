<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createCollectionTaskApi,
  updateCollectionTaskApi,
} from '#/api/mdm/collection';

import { useSchema } from '../data';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);

const title = computed(() =>
  currentData.value?.id ? '编辑归集任务' : '新增归集任务',
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useSchema(),
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
        apiUrl: values.apiUrl,
        collectionType: values.collectionType,
        executeStrategy: values.executeStrategy,
        name: values.name,
        pluginCode: values.pluginCode,
        status: values.status,
      };

      await (currentData.value?.id
        ? updateCollectionTaskApi(currentData.value.id, payload)
        : createCollectionTaskApi(payload));

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
    formApi.resetForm();
    formApi.setValues({
      apiUrl: data.apiUrl ?? '',
      collectionType: data.collectionType ?? 'api',
      executeStrategy: data.executeStrategy ?? '',
      name: data.name ?? '',
      pluginCode: data.pluginCode ?? undefined,
      status: data.status ?? 'enabled',
    });
  },
});
</script>

<template>
  <Modal :title="title">
    <Form class="p-4" />
  </Modal>
</template>
