<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createModelDefinitionApi,
  updateModelDefinitionApi,
} from '#/api/mdm/model-definition';

import { useSchema } from '../data';

const emit = defineEmits(['success']);
const currentData = ref<any>(null);

const getTitle = computed(() => {
  return currentData.value?.id ? '编辑数据模型' : '新增数据模型';
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
        ? updateModelDefinitionApi(currentData.value.id, {
            ...values,
            versionNo: currentData.value.versionNo,
          } as any)
        : createModelDefinitionApi({
            ...values,
            versionNo: 1,
          } as any));
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
      const isReadonlyStatus = ['history', 'invalid', 'published', 'revised'].includes(
        data?.status,
      );
      const isSortReadonlyStatus = ['history', 'revised'].includes(
        data?.status,
      );
      formApi.updateSchema([
        { fieldName: 'code', componentProps: { disabled: isReadonlyStatus } },
        {
          fieldName: 'enabled',
          componentProps: { disabled: isReadonlyStatus },
        },
        {
          fieldName: 'modelType',
          componentProps: { disabled: isReadonlyStatus },
        },
        {
          fieldName: 'sortNo',
          componentProps: { disabled: isSortReadonlyStatus },
        },
        {
          fieldName: 'themeId',
          componentProps: { disabled: isReadonlyStatus },
        },
      ]);
      formApi.setValues({
        ...data,
        auditGroupId: data?.auditGroupId ?? data?.audit_group_id,
        enabled: data?.enabled ?? true,
        modelType: data?.modelType ?? data?.model_type ?? 'normal',
        needAudit: data?.needAudit ?? data?.need_audit ?? false,
        remark: data?.remark ?? data?.description ?? '',
        sortNo: data?.sortNo ?? data?.sort_no ?? 0,
        themeId: data?.themeId ?? data?.theme_id,
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
