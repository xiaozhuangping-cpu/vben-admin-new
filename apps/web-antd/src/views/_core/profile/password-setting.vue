<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';

import { message } from 'ant-design-vue';
import { updatePasswordApi } from '#/api';
import { ref } from 'vue';

const loading = ref(false);

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'oldPassword',
      label: '旧密码',
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: '请输入旧密码',
      },
    },
    {
      fieldName: 'newPassword',
      label: '新密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请输入新密码',
      },
    },
    {
      fieldName: 'confirmPassword',
      label: '确认密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请再次输入新密码',
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({ required_error: '请再次输入新密码' })
            .min(1, { message: '请再次输入新密码' })
            .refine((value) => value === newPassword, {
              message: '两次输入的密码不一致',
            });
        },
        triggerFields: ['newPassword'],
      },
    },
  ];
});

async function handleSubmit(values: any) {
  try {
    loading.value = true;
    await new Promise((resolve) => setTimeout(resolve, 500)); // Make loading visible
    await updatePasswordApi(values.newPassword);
    message.success('密码修改成功');
  } catch (err: any) {
    message.error(err.message || '密码修改失败');
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <div class="center-form-container p-6">
    <ProfilePasswordSetting
      class="w-full max-w-[500px]"
      :form-schema="formSchema"
      :submit-button-props="{ loading, type: 'primary' }"
      submit-button-position="center"
      :form-props="{
        layout: 'vertical',
      }"
      @submit="handleSubmit"
    />
  </div>
</template>

<style>
.center-form-container {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

.center-form-container .ant-form-item:last-child .ant-form-item-control-input-content,
.center-form-container .vben-form-actions,
.center-form-container [class*="action"] {
  display: flex !important;
  justify-content: center !important;
  width: 100% !important;
}
</style>
