<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert, Transfer } from 'ant-design-vue';

import { updateUserGroupApi } from '#/api/mdm/user-group';
import { getAssignableUserListApi } from '#/api/mdm/user-member';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);
const loading = ref(false);
const dataSource = ref<{ description?: string; key: string; title: string }[]>(
  [],
);
const targetKeys = ref<string[]>([]);

const title = computed(() => {
  const name = currentData.value?.name ?? '';
  return name ? `分配用户 - ${name}` : '分配用户';
});

const [Drawer, drawerApi] = useVbenDrawer({
  placement: 'right',
  title: '',
  confirmText: '保存分配',
  onConfirm: async () => {
    if (!currentData.value?.id) {
      return;
    }
    drawerApi.lock();
    try {
      await updateUserGroupApi(currentData.value.id, {
        ...currentData.value,
        userIds: targetKeys.value,
      });
      drawerApi.close();
      currentData.value?.onSuccess?.();
      emit('success');
    } finally {
      drawerApi.lock(false);
    }
  },
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return;
    }
    const data = drawerApi.getData<any>() || {};
    currentData.value = data;
    targetKeys.value = data.userIds ?? [];

    loading.value = true;
    try {
      const users = await getAssignableUserListApi();
      dataSource.value = users.map((user) => ({
        description: user.username,
        key: user.id,
        title: user.nickname || user.label,
      }));
    } finally {
      loading.value = false;
    }
  },
});
</script>

<template>
  <Drawer :title="title">
    <div class="flex h-full flex-col px-6 py-5">
      <Alert
        class="mb-4"
        message="左侧为可分配用户，右侧为当前已加入该用户组的用户。"
        show-icon
        type="info"
      />
      <Transfer
        v-model:target-keys="targetKeys"
        :data-source="dataSource"
        :disabled="loading"
        :list-style="{ height: '460px', width: '100%' }"
        :operations="['加入', '移出']"
        :render="(item) => item.title"
        :show-search="true"
        class="assign-transfer"
      />
    </div>
  </Drawer>
</template>

<style scoped>
.assign-transfer:deep(.ant-transfer) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 16px;
  width: 100%;
}

.assign-transfer:deep(.ant-transfer-list) {
  width: 100%;
  min-width: 0;
  height: 460px;
}

.assign-transfer:deep(.ant-transfer-list-body) {
  height: calc(100% - 40px);
}
</style>
