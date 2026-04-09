<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { Button, message, Space, Tag } from 'ant-design-vue';

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
  message.success('数据已更新');
  // gridApi.query();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="对系统内部的用户进行分组，以便于进行批量的权限管理和业务隔离。"
    title="用户组管理"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate"> 新增用户组 </Button>
    </template>

    <Form @success="refreshGrid" />
    <AssignUsersDrawer @success="refreshGrid" />

    <div class="flex-1 min-h-0">
      <Grid table-title="用户组列表">
        <template #status="{ row }">
          <Tag :color="row.status ? 'green' : 'red'">
            {{ row.status ? '启用' : '禁用' }}
          </Tag>
        </template>
        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button size="small" type="link" @click="handleAssignUsers(row)">
              分配用户
            </Button>
            <Button danger size="small" type="link" @click="handleDelete(row)">
              删除
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
