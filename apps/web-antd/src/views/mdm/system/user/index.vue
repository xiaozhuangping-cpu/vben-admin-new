<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  message,
  Row,
  Space,
  Tag,
  Tree,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteUserApi, getUserListApi } from '#/api/mdm/user';

import { useColumns } from './data';
import UserFormModal from './modules/form.vue';

const [UserModal, userModalApi] = useVbenModal({
  connectedComponent: UserFormModal,
  destroyOnClose: true,
});

const selectedOrg = ref<string>('');
const orgOptions = ref<string[]>([]);

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
        const result = await getUserListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
          ...(selectedOrg.value ? { org: `eq.${selectedOrg.value}` } : {}),
        });

        const currentOrgs = result.items
          .map((item: any) => item.org)
          .filter((item: string) => !!item);
        orgOptions.value = [...new Set([...orgOptions.value, ...currentOrgs])];

        return result;
      },
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

const treeData = computed(() => [
  {
    title: '全部组织',
    key: '',
    children: orgOptions.value.map((org) => ({
      title: org,
      key: org,
    })),
  },
]);

function handleCreate() {
  userModalApi
    .setData({
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

function handleEdit(row: any) {
  userModalApi
    .setData({
      ...row,
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

async function handleDelete(row: any) {
  try {
    await deleteUserApi(row.id);
    message.success(`已删除用户: ${row.username}`);
    gridApi.reload();
  } catch {
    message.error('删除失败');
  }
}

function handleResetPassword(row: any) {
  message.success(`用户 [${row.username}] 的密码已重置为: Aoyolo@2024`);
}

function handleStatusFilter(node: any) {
  selectedOrg.value = node.key || '';
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="管理 MDM 系统内部的功能访问用户。可细粒度地为用户分配组织节点、功能角色及数据视图（行/列权限），确保核心数据资产的多租户合规性。"
    title="用户管理"
  >
    <Row :gutter="16" class="split-layout">
      <!-- 左侧组织架构 -->
      <Col :span="6" class="split-side">
        <Card
          :body-style="{ padding: '12px' }"
          class="split-card"
          title="组织架构"
        >
          <Tree
            :selected-keys="[selectedOrg]"
            :tree-data="treeData"
            block-node
            default-expand-all
            @select="(keys, info) => handleStatusFilter(info.node)"
          />
        </Card>
      </Col>

      <!-- 右侧用户列表 -->
      <Col :span="18" class="split-main">
        <div class="split-main__content">
          <Grid table-title="用户列表">
            <template #toolbar-tools>
              <Button type="primary" @click="handleCreate"> 新增用户 </Button>
            </template>

            <template #roles="{ row }">
              <Space :size="[6, 6]" wrap>
                <Tag v-for="role in row.roles" :key="role" color="blue">
                  {{ role }}
                </Tag>
              </Space>
            </template>

            <template #status="{ row }">
              <Tag :color="row.status ? 'success' : 'error'">
                {{ row.status ? '活动' : '冻结' }}
              </Tag>
            </template>

            <template #action="{ row }">
              <Space>
                <Button size="small" type="link" @click="handleEdit(row)">
                  编辑
                </Button>
                <Button
                  size="small"
                  type="link"
                  @click="handleResetPassword(row)"
                >
                  重置密码
                </Button>
                <Button
                  danger
                  size="small"
                  type="link"
                  @click="handleDelete(row)"
                >
                  删除
                </Button>
              </Space>
            </template>
          </Grid>
        </div>
      </Col>
    </Row>

    <UserModal @success="() => gridApi.reload()" />
  </Page>
</template>

<style scoped>
.split-layout {
  flex-wrap: nowrap;
  height: 100%;
  min-height: 0;
}

.split-side,
.split-main {
  display: flex;
  min-height: 0;
}

.split-main {
  flex-direction: column;
  min-width: 0;
}

.split-main__content {
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.split-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.split-card :deep(.ant-card-head) {
  flex-shrink: 0;
}

.split-card :deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.text-error {
  color: #ff4d4f;
}
</style>
