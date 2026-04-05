<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { useVbenForm, z } from '#/adapter/form';
import { useSchema } from '../data';

const emit = defineEmits(['success']);
const currentData = ref<any>({});

const getTitle = computed(() => {
  return currentData.value?.id ? '编辑角色信息' : '新建角色';
});

const [LocalForm, formApi] = useVbenForm({
  layout: 'vertical',
  schema: [
    { field: 'name', label: '角色名称', component: 'Input', defaultValue: '' },
    { field: 'code', label: '角色标识', component: 'Input', defaultValue: '' },
  ],
  validationSchema: z.object({
    name: z.string().min(1, '必填'),
    code: z.string().min(1, '必填'),
  }),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (valid) {
      modalApi.lock();
      const values = await formApi.getValues();
      console.log('Role saved:', values);
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
    <LocalForm class="p-4" />
  </Modal>
</template>
