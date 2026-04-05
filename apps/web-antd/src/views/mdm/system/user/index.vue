<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal } from '@vben/common-ui';
import {
  Button,
  message,
  Space,
  Tag,
  Modal,
  Input,
  Tree,
} from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { Plus } from '@vben/icons';
import { h, ref } from 'vue';
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
  console.log('User handleCreate called');
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
    <div class="flex gap-4 flex-1 min-h-0 overflow-hidden">
      <div
        class="w-64 min-h-0 bg-white p-4 rounded shadow-sm border border-gray-100 flex flex-col overflow-hidden"
      >
        <div class="mb-4 text-sm font-bold border-b pb-2">组织架构</div>
        <Tree
          :tree-data="TREE_DATA"
          block-node
          default-expand-all
          @select="(keys, info) => handleStatusFilter(info.node)"
        />
      </div>

      <div
        class="flex-1 min-w-0 min-h-0 flex flex-col bg-white p-4 rounded shadow-sm border border-gray-100"
      >
        <div class="flex justify-end mb-4">
          <Button type="primary" @click="handleCreate"> 新增用户 </Button>
        </div>

        <UserModal @success="() => gridApi.reload()" />

        <div class="flex-1 min-h-0">
          <Grid table-title="用户列表">
            <template #roles="{ row }">
              <Tag v-for="role in row.roles" :key="role" color="blue">{{
                role
              }}</Tag>
            </template>

            <template #status="{ row }">
              <Tag :color="row.status ? 'success' : 'error'">{{
                row.status ? '活动' : '冻结'
              }}</Tag>
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
      </div>
    </div>
  </Page>
</template>
