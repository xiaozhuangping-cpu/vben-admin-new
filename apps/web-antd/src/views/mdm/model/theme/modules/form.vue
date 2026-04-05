<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';

import { useSchema } from '../data';

const emit = defineEmits(['success']);
const currentData = ref<any>(null);

const getTitle = computed(() => {
  return currentData.value?.id ? '编辑数据主题' : '新增数据主题';
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (valid) {
      modalApi.lock();
      const values = await formApi.getValues();
      console.log('Submitted values:', values);
      // In real app: currentData.value?.id ? updateApi(id, values) : createApi(values)
      setTimeout(() => {
        modalApi.lock(false);
        modalApi.close();
        emit('success');
      }, 500);
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<any>();
      currentData.value = data;
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
