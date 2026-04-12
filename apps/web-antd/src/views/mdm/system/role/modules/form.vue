<script lang="ts" setup>
import { useVbenForm } from '#/adapter/form';
import { message, Card, Button, Typography, Space } from 'ant-design-vue';
import { createRoleApi, updateRoleApi } from '#/api/mdm/rbac-role';
import { useSchema } from '../data';
import { watch, ref } from 'vue';
import { IconifyIcon } from '@vben/icons';

const props = defineProps<{
  currentData: any;
}>();

const emit = defineEmits(['success', 'cancel']);

const loading = ref(false);

const [Form, formApi] = useVbenForm({
  handleSubmit: onSubmit,
  schema: useSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

// 监听当前编辑的数据
watch(
  () => props.currentData,
  (val) => {
    if (val && val.id) {
      formApi.setValues(val);
    } else if (val) {
      formApi.resetForm();
      formApi.setValues(val);
    } else {
      formApi.resetForm();
    }
  },
  { immediate: true },
);

async function onSubmit(values: any) {
  try {
    loading.value = true;
    if (props.currentData?.id) {
      await updateRoleApi(props.currentData.id, values);
      message.success('角色信息已更新');
    } else {
      await createRoleApi(values);
      message.success('新角色创建成功');
    }
    emit('success');
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function handleSave() {
  formApi.validateAndSubmitForm();
}

function handleReset() {
  formApi.resetForm();
  emit('cancel');
}
</script>

<template>
  <Card class="h-full border-none shadow-sm flex flex-col" :body-style="{ flex: 1, overflow: 'auto' }">
    <template #title>
      <Space>
        <IconifyIcon icon="lucide:shield-check" class="text-amber-500" />
        <span>{{ currentData?.id ? '编辑角色信息' : '创建新角色' }}</span>
        <Typography.Text v-if="currentData?.id" type="secondary" class="text-xs font-normal">
          (ID: {{ currentData.id }})
        </Typography.Text>
      </Space>
    </template>
    
    <template #extra>
      <Space>
        <Button @click="handleReset">
          取消
        </Button>
        <Button :loading="loading" type="primary" @click="handleSave">
          <template #icon><IconifyIcon icon="lucide:save" /></template>
          保存角色
        </Button>
      </Space>
    </template>

    <div class="py-2">
      <div v-if="!currentData" class="text-center py-20 bg-gray-50/30 rounded-xl border border-dashed">
         <IconifyIcon icon="lucide:shield-plus" class="text-4xl text-gray-200 mb-2" />
         <div class="text-gray-400">请选择左侧角色或点击“新增角色”</div>
      </div>
      <Form v-else />
    </div>
  </Card>
</template>

<style scoped>
:deep(.vben-form) {
  padding: 0 !important;
}

:deep(.ant-form-item-label) {
  font-weight: 500;
}
</style>
