<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createModelRelationshipApi,
  updateModelRelationshipApi,
} from '#/api/mdm/model-relationship';

import { useSchema } from '../data';

const emit = defineEmits(['success']);
const currentData = ref<any>(null);

const getTitle = computed(() => {
  return currentData.value?.id ? '编辑模型关系' : '新增模型关系';
});

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
      await (currentData.value?.id
        ? updateModelRelationshipApi(currentData.value.id, values as any)
        : createModelRelationshipApi(values as any));
      modalApi.close();
      currentData.value?.onSuccess?.();
      emit('success');
    } catch {
      // Error is handled by request interceptor
    } finally {
      modalApi.lock(false);
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<any>();
      currentData.value = data;
      formApi.setValues({
        remark: '',
        sort: 10,
        ...data,
      });
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="p-4" />
  </Modal>
</template>
