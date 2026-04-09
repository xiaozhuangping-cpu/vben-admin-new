<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createDynamicMasterDataRecordApi,
  updateDynamicMasterDataRecordApi,
} from '#/api/mdm/master-data';
import {
  normalizeAttachmentValue,
  serializeAttachmentValue,
} from '#/api/mdm/storage';

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
        Object.entries(values)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => {
            const field = (currentData.value?.fields || []).find(
              (item: any) => item.code?.toLowerCase() === key,
            );

            if (field?.dataType === 'attachment') {
              return [key, serializeAttachmentValue(value, !!field.isMultiple)];
            }

            return [key, value];
          }),
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
        schema: buildDynamicFormSchema(data?.fields || [], {
          tableName: data?.tableName,
        }),
      });
      formApi.resetForm();
      const attachmentValues = Object.fromEntries(
        (data?.fields || [])
          .filter((field: any) => field.dataType === 'attachment')
          .map((field: any) => [
            field.code.toLowerCase(),
            normalizeAttachmentValue(
              data?.[field.code.toLowerCase()],
              !!field.isMultiple,
            ),
          ]),
      );
      formApi.setValues({
        ...(data || {}),
        ...attachmentValues,
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
