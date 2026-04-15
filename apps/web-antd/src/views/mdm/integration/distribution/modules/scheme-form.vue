<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createDistributionSchemeApi,
  updateDistributionSchemeApi,
} from '#/api/mdm/distribution';

import { useSchemeSchema } from '../data';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);

const title = computed(() =>
  currentData.value?.id ? '编辑分发方案' : '新增分发方案',
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
        code: values.code,
        cronExpr: values.cronExpr,
        definitionId: values.definitionId,
        dispatchMode: values.dispatchMode,
        filterSql: values.filterSql,
        includeDataAuth: values.includeDataAuth,
        name: values.name,
        remark: values.remark,
        status: values.status,
        targetId: values.targetId,
        triggerEvents: values.triggerEvents,
      };

      await (currentData.value?.id ? updateDistributionSchemeApi(currentData.value.id, payload) : createDistributionSchemeApi(payload));

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
      schema: useSchemeSchema(
        data.definitionOptions ?? [],
        data.targetOptions ?? [],
      ),
    });
    formApi.resetForm();
    formApi.setValues({
      ...data,
      triggerEvents: data.triggerEvents ?? ['create', 'update'],
    });
  },
});
</script>

<template>
  <Modal :title="title">
    <Form class="p-4" />
  </Modal>
</template>
