<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { Button, message, Space, Tag, Tooltip } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteUserGroupApi, getUserGroupListApi } from '#/api/mdm/user-group';

import { useColumns } from './data';
import AssignUsersModal from './modules/assign-users.vue';
import UserGroupFormModal from './modules/form.vue';

const [Form, formModalApi] = useVbenModal({
  connectedComponent: UserGroupFormModal,
  destroyOnClose: true,
});

const [AssignUsersDrawer, assignUsersDrawerApi] = useVbenDrawer({
  class: 'w-180',
  connectedComponent: AssignUsersModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        return await getUserGroupListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
        });
      },
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

function handleCreate() {
  formModalApi
    .setData({
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

function handleEdit(row: any) {
  formModalApi
    .setData({
      ...row,
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

function handleAssignUsers(row: any) {
  assignUsersDrawerApi
    .setData({
      ...row,
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

async function handleDelete(row: any) {
  try {
    await deleteUserGroupApi(row.id);
    message.success(`已删除用户组: ${row.name}`);
    gridApi.reload();
  } catch {
    message.error('删除失败');
  }
}

function refreshGrid() {
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="p-4 bg-background-deep flex flex-col"
    description="对系统内部的用户进行分组，以便于进行批量的权限管理和业务隔离。"
    title="用户组管理"
  >
    <template #extra>
      <Space :size="12">
        <Tooltip title="刷新列表">
          <Button @click="gridApi.reload()" class="flex items-center justify-center">
            <template #icon><IconifyIcon icon="lucide:rotate-cw" /></template>
          </Button>
        </Tooltip>
        <Button type="primary" @click="handleCreate" class="flex items-center gap-2">
          <template #icon><IconifyIcon icon="lucide:users-round" /></template>
          新增用户组
        </Button>
      </Space>
    </template>

    <Form @success="refreshGrid" />
    <AssignUsersDrawer @success="refreshGrid" />

    <div class="flex-1 min-h-0 mt-4">
      <Grid 
        table-title="用户组列表"
        class="user-group-grid bg-card rounded-2xl shadow-sm overflow-hidden"
      >
        <template #status="{ row }">
          <Tag :bordered="false" :color="row.status ? 'processing' : 'default'" class="m-0 rounded-full px-3 py-0.5">
            <div class="flex items-center gap-1.5 translate-y-[0.5px]">
              <IconifyIcon 
                :icon="row.status ? 'lucide:check-circle-2' : 'lucide:x-circle'" 
                size="14"
              />
              <span class="text-[12px] font-medium leading-none">{{ row.status ? '正常运行' : '已停用' }}</span>
            </div>
          </Tag>
        </template>
        
        <template #action="{ row }">
          <Space :size="4">
            <Tooltip title="编辑详情">
              <Button 
                size="small" 
                type="text" 
                class="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-background-deep hover:text-primary transition-colors"
                @click="handleEdit(row)"
              >
                <template #icon><IconifyIcon icon="lucide:edit-3" size="16" /></template>
              </Button>
            </Tooltip>
            
            <Tooltip title="分配小组成员">
              <Button 
                size="small" 
                type="text" 
                class="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-colors"
                @click="handleAssignUsers(row)"
              >
                <template #icon><IconifyIcon icon="lucide:user-plus" size="16" /></template>
              </Button>
            </Tooltip>

            <Tooltip title="移除此分组">
              <Button 
                danger 
                size="small" 
                type="text" 
                class="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-red-50 transition-colors"
                @click="handleDelete(row)"
              >
                <template #icon><IconifyIcon icon="lucide:trash-2" size="16" /></template>
              </Button>
            </Tooltip>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>

<style scoped>
.user-group-grid :deep(.vxe-grid--form-wrapper) {
  padding: 0;
}

.user-group-grid :deep(.vxe-toolbar) {
  padding: 16px;
  background: transparent;
}

.user-group-grid :deep(.vxe-table) {
  padding: 0 16px 16px;
  background: transparent;
}

:deep(.ant-page-header) {
  padding-bottom: 12px;
}
</style>
