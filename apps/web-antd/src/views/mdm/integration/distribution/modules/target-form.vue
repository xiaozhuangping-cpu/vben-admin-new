<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createDistributionTargetApi,
  updateDistributionTargetApi,
} from '#/api/mdm/distribution';

import { useTargetSchema } from '../data';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);

const title = computed(() =>
  currentData.value?.id ? '编辑分发目标' : '新增分发目标',
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useTargetSchema(),
  showDefaultActions: false,
});

function parseJsonText(text: string, fallback: Record<string, any> = {}) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return fallback;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    throw new Error('JSON 配置格式不正确');
  }
}

function omitSensitiveAuthFields(authConfig: Record<string, any>) {
  const sanitized = { ...authConfig };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.username;
  return sanitized;
}

function hasOwnField(values: Record<string, any>, field: string) {
  return Object.prototype.hasOwnProperty.call(values, field);
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    modalApi.lock();
    try {
      const values = (await formApi.getValues()) as Record<string, any>;
      const existingAuthConfig = currentData.value?.authConfig ?? {};
      const authConfig = {
        ...existingAuthConfig,
        ...parseJsonText(values.authConfigText, {}),
      };
      const headers = parseJsonText(values.headersText, {});
      const testPayload = parseJsonText(values.testPayloadText, {});

      if (Object.keys(headers).length > 0) {
        authConfig.headers = headers;
      }

      if (values.dispatchMethod) {
        authConfig.method = values.dispatchMethod;
      }

      if (values.testMethod) {
        authConfig.testMethod = values.testMethod;
      }

      if (Object.keys(testPayload).length > 0) {
        authConfig.testPayload = testPayload;
      }

      if (values.authType === 'bearer') {
        delete authConfig.username;
        delete authConfig.password;

        if (hasOwnField(values, 'bearerToken')) {
          const bearerToken = String(values.bearerToken ?? '');
          if (bearerToken) {
            authConfig.token = bearerToken;
          } else {
            delete authConfig.token;
          }
        }
      } else {
        delete authConfig.token;
      }

      if (values.authType === 'basic') {
        if (hasOwnField(values, 'basicUsername')) {
          const basicUsername = String(values.basicUsername ?? '').trim();
          if (basicUsername) {
            authConfig.username = basicUsername;
          } else if (existingAuthConfig.username) {
            authConfig.username = existingAuthConfig.username;
          }
        }

        if (hasOwnField(values, 'basicPassword')) {
          const basicPassword = String(values.basicPassword ?? '');
          if (basicPassword) {
            authConfig.password = basicPassword;
          } else if (existingAuthConfig.password) {
            authConfig.password = existingAuthConfig.password;
          }
        }
      } else {
        delete authConfig.username;
        delete authConfig.password;
      }

      const payload = {
        authConfig,
        authType: values.authType,
        baseUrl: values.baseUrl,
        code: values.code,
        description: values.description,
        name: values.name,
        status: values.status,
        targetType: values.targetType,
      };

      await (currentData.value?.id
        ? updateDistributionTargetApi(currentData.value.id, payload)
        : createDistributionTargetApi(payload));

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
    const authConfig = data.authConfig ?? {};
    formApi.setValues({
      ...data,
      authConfigText: JSON.stringify(
        omitSensitiveAuthFields(authConfig ?? {}),
        null,
        2,
      ),
      basicPassword: '',
      basicUsername: '',
      bearerToken: authConfig.token ?? '',
      dispatchMethod: authConfig.method ?? 'POST',
      headersText: JSON.stringify(authConfig.headers ?? {}, null, 2),
      testMethod: authConfig.testMethod ?? 'GET',
      testPayloadText: JSON.stringify(authConfig.testPayload ?? {}, null, 2),
    });
  },
});
</script>

<template>
  <Modal :title="title">
    <Form class="p-4" />
  </Modal>
</template>
