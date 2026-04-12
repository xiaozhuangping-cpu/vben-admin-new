<script lang="ts" setup>
import { useVbenForm } from '#/adapter/form';
import { message, Card, Button, Typography, Space, Modal, Input, Tooltip } from 'ant-design-vue';
import { createManagedUserApi } from '#/api/mdm/admin-user';
import { updateUserApi } from '#/api/mdm/user';
import { updateUserRolesApi } from '#/api/mdm/rbac-user';
import { getRoleListApi } from '#/api/mdm/rbac-role';
import { manageUserPasswordApi } from '#/api/mdm/user-password';
import { useSchema } from '../data';
import { watch, ref, onMounted } from 'vue';
import { IconifyIcon } from '@vben/icons';

const props = defineProps<{
  currentData: any;
}>();

const emit = defineEmits(['success', 'cancel']);

const loading = ref(false);
const roleOptions = ref<any[]>([]);
const passwordModalOpen = ref(false);
const passwordSaving = ref(false);
const passwordForm = ref({
  confirmPassword: '',
  newPassword: '',
});
const isCreateMode = ref(true);

const [Form, formApi] = useVbenForm({
  handleSubmit: onSubmit,
  schema: useSchema([], true),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-8',
});

function syncFormSchema() {
  formApi.setState({
    schema: useSchema(roleOptions.value, isCreateMode.value),
  });
}

async function fetchRoles() {
  try {
    const response = await getRoleListApi({ pageSize: 100 });
    const items = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : [];

    roleOptions.value = items.map((item: any) => ({
      label: item.name,
      value: item.id,
    }));

    syncFormSchema();
  } catch (error) {
    console.error('Failed to fetch roles', error);
  }
}

onMounted(() => {
  fetchRoles();
});

// 监听当前编辑的数据
watch(
  () => props.currentData,
  (val) => {
    isCreateMode.value = !val?.id;
    syncFormSchema();

    if (val && val.id) {
      formApi.setValues({
        ...val,
        roleIds: val.roleIds ?? [],
      });
    } else if (val) {
      formApi.resetForm();
      formApi.setValues({
        ...val,
        roleIds: val.roleIds ?? [],
      });
    } else {
      formApi.resetForm();
    }
  },
  { immediate: true },
);

async function onSubmit(values: any) {
  try {
    loading.value = true;
    const {
      roleIds = [],
      password = '',
      confirmPassword = '',
      ...userPayload
    } = values as any;
    let userId = props.currentData?.id;

    if (userId) {
      await updateUserApi(userId, userPayload);
      message.success('用户信息已更新');
    } else {
      const resolvedAuthEmail = String(
        userPayload.authEmail || (userPayload.username?.includes('@') ? userPayload.username : ''),
      ).trim();

      if (!password) {
        message.warning('请输入登录密码');
        return;
      }

      if (password.length < 6) {
        message.warning('登录密码长度不能少于 6 位');
        return;
      }

      if (password !== confirmPassword) {
        message.warning('两次输入的登录密码不一致');
        return;
      }

      if (!resolvedAuthEmail) {
        message.warning('请填写登录邮箱，或直接使用邮箱作为用户名');
        return;
      }

      const resp = await createManagedUserApi({
        ...userPayload,
        authEmail: resolvedAuthEmail,
        password,
        roleIds,
      });
      userId = resp?.mdmUser?.id;
      message.success('新用户创建成功');
    }
    
    if (userId && props.currentData?.id) {
      await updateUserRolesApi(userId, roleIds);
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

function ensurePasswordBinding() {
  const authUserId = String(props.currentData?.authUserId || '').trim();
  const authEmail = String(props.currentData?.authEmail || '').trim();
  const username = String(props.currentData?.username || '').trim();

  if (authUserId) {
    return true;
  }

  if (authEmail) {
    return true;
  }

  if (username.includes('@')) {
    return true;
  }

  message.warning('请先维护登录邮箱，再进行密码重置或修改');
  return false;
}

async function handleResetPassword() {
  if (!props.currentData?.id) {
    return;
  }

  if (!ensurePasswordBinding()) {
    return;
  }

  Modal.confirm({
    title: '确认重置密码？',
    content: `将用户 ${props.currentData.nickname || props.currentData.username} 的密码重置为 123456。`,
    okText: '确认重置',
    centered: true,
    async onOk() {
      const result = await manageUserPasswordApi({
        mdmUserId: props.currentData.id,
        newPassword: '123456',
      });
      message.success(
        result?.email
          ? `密码已重置为 123456，认证账号: ${result.email}`
          : '密码已重置为 123456',
      );
    },
  });
}

function openPasswordModal() {
  passwordForm.value = {
    confirmPassword: '',
    newPassword: '',
  };
  passwordModalOpen.value = true;
}

async function handlePasswordSubmit() {
  if (!props.currentData?.id) {
    return;
  }

  if (!ensurePasswordBinding()) {
    return;
  }

  const { newPassword, confirmPassword } = passwordForm.value;

  if (!newPassword) {
    message.warning('请输入新密码');
    return;
  }

  if (newPassword.length < 6) {
    message.warning('新密码长度不能少于 6 位');
    return;
  }

  if (newPassword !== confirmPassword) {
    message.warning('两次输入的密码不一致');
    return;
  }

  try {
    passwordSaving.value = true;
    const result = await manageUserPasswordApi({
      mdmUserId: props.currentData.id,
      newPassword,
    });
    passwordModalOpen.value = false;
    message.success(
      result?.email
        ? `密码已更新，认证账号: ${result.email}`
        : '密码已更新',
    );
  } finally {
    passwordSaving.value = false;
  }
}
</script>

<template>
  <Card 
    class="h-full flex flex-col shadow-sm border-border" 
    :body-style="{ flex: 1, overflow: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column' }"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <div class="w-1 h-4 bg-primary rounded-full"></div>
        <span>{{ currentData?.id ? '编辑用户信息' : '创建新用户' }}</span>
        <Typography.Text v-if="currentData?.id" type="secondary" class="text-[11px] font-normal opacity-60 ml-1">
          (ID: {{ currentData.id }})
        </Typography.Text>
      </div>
    </template>
    
    <template #extra>
      <Space v-if="currentData" :size="8">
        <Tooltip title="重置为 123456">
          <Button @click="handleResetPassword" class="flex items-center justify-center">
            <template #icon><IconifyIcon icon="lucide:key-round" /></template>
          </Button>
        </Tooltip>
        <Button @click="openPasswordModal" class="flex items-center gap-2">
          <template #icon><IconifyIcon icon="lucide:key-square" /></template>
          修改密码
        </Button>
        <div class="w-px h-4 bg-border mx-1"></div>
        <Button @click="handleReset">取消</Button>
        <Button :loading="loading" type="primary" @click="handleSave" class="flex items-center gap-2">
          <template #icon><IconifyIcon icon="lucide:save" /></template>
          保存用户
        </Button>
      </Space>
    </template>

    <div class="flex-1 overflow-hidden flex flex-col pt-2">
      <div 
        v-if="!currentData" 
        class="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background-deep text-gray-400 m-2"
      >
        <IconifyIcon icon="lucide:user-plus" class="text-4xl text-gray-200 mb-4" />
        <div class="text-sm">选一个小伙伴开始维护吧，或者直接创建新人</div>
      </div>
      <div v-else class="flex-1 overflow-auto custom-scrollbar px-2">
        <Form />
      </div>
    </div>

    <Modal
      v-model:open="passwordModalOpen"
      :confirm-loading="passwordSaving"
      title="安全中心 / 修改密码"
      ok-text="确认修改"
      cancel-text="取消"
      centered
      @ok="handlePasswordSubmit"
    >
      <div class="space-y-5 pt-4">
        <div class="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-blue-600 text-xs flex gap-2">
          <IconifyIcon icon="lucide:shield-check" class="flex-shrink-0 mt-0.5" />
          <span>修改密码后，用户下次登录时需使用新密码。请确保已将新密码告知相关人员。</span>
        </div>
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">新密码</div>
          <Input.Password
            v-model:value="passwordForm.newPassword"
            placeholder="请输入新密码，建议包含数字和字母"
            class="rounded-lg py-1.5"
          />
        </div>
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">核对一遍</div>
          <Input.Password
            v-model:value="passwordForm.confirmPassword"
            placeholder="请再次准确输入新密码"
            class="rounded-lg py-1.5"
          />
        </div>
      </div>
    </Modal>
  </Card>
</template>

<style scoped>
:deep(.ant-card) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.ant-card-head) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding: 0 16px;
  min-height: 52px;
}

:deep(.vben-form) {
  padding: 0 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
