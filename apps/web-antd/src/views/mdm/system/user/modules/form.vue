<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import { useSchema } from '../data';

const emit = defineEmits(['success']);
const currentData = ref<any>({});

const getTitle = computed(() => {
  return currentData.value?.id ? '编辑用户信息' : '新建用户';
});

const [VbenForm, formApi] = useVbenForm({
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
      console.log('User saved:', values);
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
      currentData.value = data || {};
      nextTick(() => {
        formApi.setValues(currentData.value);
      });
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <VbenForm class="p-4" />
  </Modal>
</template>
