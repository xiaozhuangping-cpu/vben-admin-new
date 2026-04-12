<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert, Transfer, Button, Tag } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { updateUserGroupApi } from '#/api/mdm/user-group';
import { getAssignableUserListApi } from '#/api/mdm/user-member';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);
const loading = ref(false);
const dataSource = ref<{ description?: string; key: string; title: string, username: string }[]>(
  [],
);
const targetKeys = ref<string[]>([]);

const title = computed(() => {
  const name = currentData.value?.name ?? '';
  return name ? `管理成员: ${name}` : '分配小组成员';
});

const [Drawer, drawerApi] = useVbenDrawer({
  placement: 'right',
  title: '',
  confirmText: '应用更改',
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
        username: user.username,
        key: user.id,
        title: user.nickname || user.username,
      }));
    } finally {
      loading.value = false;
    }
  },
});
</script>

<template>
  <Drawer :title="title" class="assign-users-drawer">
    <div class="flex h-full flex-col px-6 py-5 bg-background-deep/30">
      <div 
        class="mb-6 bg-blue-50/40 border border-blue-100/50 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
      >
        <div class="p-2 bg-blue-500 rounded-lg text-white">
          <IconifyIcon icon="lucide:info" size="20" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-blue-900 mb-0.5">操作说明</div>
          <div class="text-[12px] text-blue-700/80 leading-relaxed">
            左侧为全系统可分配的成员名册。将用户移至右侧即可加入此小组，左移则代表移除权限。
          </div>
        </div>
      </div>

      <div class="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-1">
        <Transfer
          v-model:target-keys="targetKeys"
          :data-source="dataSource"
          :disabled="loading"
          :list-style="{ height: '100%', width: '100%' }"
          :show-search="true"
          class="assign-transfer h-full"
        >
          <template #render="item">
            <div class="flex items-center gap-3 py-1">
              <div 
                class="w-8 h-8 rounded-full bg-background-deep flex items-center justify-center text-[11px] font-bold text-primary/70"
              >
                {{ item.title.charAt(0).toUpperCase() }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-semibold truncate text-foreground">{{ item.title }}</span>
                <span class="text-[10px] text-gray-400 truncate">{{ item.username }}</span>
              </div>
            </div>
          </template>

          <template #children="{ direction, selectedKeys, onItemSelect }">
            <div 
              v-if="loading && direction === 'left'" 
              class="flex flex-col items-center justify-center h-full text-gray-400 gap-2"
            >
              <IconifyIcon icon="lucide:loader-2" class="animate-spin text-2xl" />
              <span class="text-xs">加载名册中...</span>
            </div>
          </template>
        </Transfer>
      </div>
      
      <div class="mt-5 flex items-center justify-between px-2">
        <div class="flex items-center gap-2 text-[12px] text-gray-400">
          <IconifyIcon icon="lucide:users" size="14" />
          <span>当前已选中 <span class="text-primary font-bold">{{ targetKeys.length }}</span> 位小组成员</span>
        </div>
        <div v-if="targetKeys.length > 0" class="flex -space-x-2">
           <div 
            v-for="i in Math.min(targetKeys.length, 5)" 
            :key="i"
            class="w-6 h-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-500"
          >
            ?
          </div>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.assign-users-drawer :deep(.ant-drawer-body) {
  padding: 0;
}

.assign-transfer:deep(.ant-transfer) {
  display: flex !important;
  flex-direction: row;
  height: 100%;
  width: 100%;
}

.assign-transfer:deep(.ant-transfer-list) {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
}

.assign-transfer:deep(.ant-transfer-list:first-child) {
  border-right: 1px solid rgba(0, 0, 0, 0.04);
}

.assign-transfer:deep(.ant-transfer-operation) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
}

.assign-transfer:deep(.ant-transfer-operation .ant-btn) {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 0;
}

.assign-transfer:deep(.ant-transfer-list-header) {
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding: 12px 16px;
}

.assign-transfer:deep(.ant-transfer-list-search) {
  padding: 12px 16px;
}

.assign-transfer:deep(.ant-transfer-list-content-item) {
  padding: 8px 16px;
  transition: all 0.2s;
}

.assign-transfer:deep(.ant-transfer-list-content-item:hover) {
  background-color: rgba(var(--primary-rgb), 0.04) !important;
}
</style>
