<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

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

import { useColumns } from './data';
import UserFormModal from './modules/form.vue';

const SURNAMES = ['张', '王', '李', '赵', '钱', '孙', '周', '吴', '郑', '王'];
const NAMES = ['强', '伟', '芳', '娜', '敏', '静', '杰', '涛', '辉', '磊'];
const DEPARTMENTS = [
  'IoT 研发部',
  '硬件供应链',
  '智能算法组',
  '质量测试中心',
  '产品运营部',
];
const ROLE_TEMPLATES = [
  '系统管理员',
  '模型设计者',
  '数据审核员',
  '设备接入专家',
  '安全审计员',
];

const MOCK_USERS = Array.from({ length: 30 }).map((_, index) => {
  const surname = SURNAMES[index % 10];
  const name = NAMES[(index * 3) % 10];
  const isFemale = index % 3 === 0;
  const nickname = `${surname}${name}${isFemale ? '女士' : '先生'}`;

  return {
    id: `${index + 1}`,
    username: `user_${1000 + index}`,
    nickname,
    org: DEPARTMENTS[index % 5],
    roles: [ROLE_TEMPLATES[index % 5]],
    status: index % 8 !== 0,
    lastLogin: `2024-04-${(index % 5) + 10} ${10 + (index % 5)}:30:15`,
  };
});

const TREE_DATA = [
  {
    title: '某某集团',
    key: '0-0',
    children: [
      { title: '研发中心', key: '0-0-1' },
      { title: '财务部', key: '0-0-2' },
      { title: '业务中心', key: '0-0-3' },
    ],
  },
];

const [UserModal, userModalApi] = useVbenModal({
  connectedComponent: UserFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_USERS,
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    ...gridOptions,
    height: 'auto',
  },
});

function handleCreate() {
  message.info('正在打开新增用户弹窗...');
  userModalApi.setData({}).open();
}

function handleEdit(row: any) {
  userModalApi.setData(row).open();
}

function handleResetPassword(row: any) {
  message.success(`用户 [${row.username}] 的密码已重置为: Aoyolo@2024`);
}

function handleStatusFilter(node: any) {
  message.info(`过滤组织: ${node.title}`);
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
            :tree-data="TREE_DATA"
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
              <Tag v-for="role in row.roles" :key="role" color="blue">
                {{ role }}
              </Tag>
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
                  @click="() => message.warning('确认注销该用户吗？')"
                >
                  注销
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
