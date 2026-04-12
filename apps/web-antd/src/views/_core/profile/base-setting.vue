<script setup lang="ts">
import type { BasicOption } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { message } from 'ant-design-vue';

import { getUserInfoApi, updateProfileApi } from '#/api';

const userStore = useUserStore();
const profileBaseSettingRef = ref();
const updateLoading = ref(false);

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'realName',
      component: 'Input',
      label: '姓名',
    },
    {
      fieldName: 'username',
      component: 'Input',
      label: '用户名',
      componentProps: {
        disabled: true,
      },
    },
    {
      fieldName: 'roleNames',
      component: 'Select',
      componentProps: {
        mode: 'tags',
        disabled: true,
        open: false,
      },
      label: '已分配角色',
    },
    {
      fieldName: 'groupNames',
      component: 'Select',
      componentProps: {
        mode: 'tags',
        disabled: true,
        open: false,
      },
      label: '所属用户组',
    },
    {
      fieldName: 'createdAt',
      component: 'Input',
      label: '注册时间',
      componentProps: {
        disabled: true,
      },
    },
    {
      fieldName: 'lastLogin',
      component: 'Input',
      label: '最后登录',
      componentProps: {
        disabled: true,
      },
    },
    {
      fieldName: 'desc',
      component: 'Textarea',
      label: '账号描述',
      componentProps: {
        disabled: true,
      },
    },
  ];
});

onMounted(async () => {
  const data = await getUserInfoApi();
  profileBaseSettingRef.value.getFormApi().setValues({
    ...data,
    roleNames: data.roleNames || [],
    groupNames: data.groupNames || [],
  });
});

async function handleSubmit(values: any) {
  try {
    updateLoading.value = true;
    await new Promise((resolve) => setTimeout(resolve, 500)); // Make loading visible
    await updateProfileApi({
      realName: values.realName,
    });
    message.success('更新成功');
    // 重新获取并更新 store 中的用户信息
    const userInfo = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
  } catch (err: any) {
    message.error(err.message || '更新失败');
  } finally {
    updateLoading.value = false;
  }
}
</script>
<template>
  <div class="center-form-container p-6">
    <ProfileBaseSetting
      ref="profileBaseSettingRef"
      class="w-full max-w-[720px]"
      :form-schema="formSchema"
      :submit-button-props="{ loading: updateLoading, type: 'primary' }"
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
