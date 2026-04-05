<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page } from '@vben/common-ui';
import { Button, message, Space, Tag } from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { MASTER_DATA_ITEMS } from '#/views/mdm/data/shared/master-data';

import { useColumns } from './data';

const MOCK_PERMISSIONS = [
  {
    id: '1',
    name: '数据建模 (Model)',
    code: 'mdm:model',
    type: 'dir',
    path: '/mdm/model',
    children: [
      {
        id: '1-1',
        name: '模型详情 (View)',
        code: 'mdm:model:view',
        type: 'menu',
        path: '/mdm/model/definition',
      },
      {
        id: '1-2',
        name: '模型设计 (Design)',
        code: 'mdm:model:design',
        type: 'api',
        description: '创建、保存、发布模型物理化定义。',
      },
      {
        id: '1-3',
        name: '模型删除 (Delete)',
        code: 'mdm:model:delete',
        type: 'api',
        description: '删除未生效的模型模板。',
      },
    ],
  },
  {
    id: '2',
    name: '主数据管理 (Data)',
    code: 'mdm:data',
    type: 'dir',
    path: '/mdm/data',
    children: [
      ...MASTER_DATA_ITEMS.map((item, index) => ({
        id: `2-${index + 1}`,
        name: `${item.title} (${item.theme})`,
        code: item.permissionCode,
        type: 'menu',
        path: item.path,
        description: item.description,
      })),
      {
        id: `2-${MASTER_DATA_ITEMS.length + 1}`,
        name: '数据分发 (Distribute)',
        code: 'mdm:data:distribute',
        type: 'api',
        description: '下发主数据到第三方系统或平台。',
      },
    ],
  },
];

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_PERMISSIONS,
  height: 'auto',
  treeConfig: {
    transform: true,
    rowField: 'id',
    parentField: 'parentId',
    expandAll: true,
  },
};

const [Grid] = useVbenVxeGrid({
  gridOptions,
});

function handleCreate() {
  message
    .loading('正在部署权限元数据至后端鉴权中心 (Casbin)...', 1)
    .then(() => {
      message.success('新增权限元数据成功');
    });
}

function handleEdit(row: any) {
  message.info(`正在编辑权限 [${row.name}] 的声明规则`);
}

function getTypeColor(type: string) {
  switch (type) {
    case 'dir':
      return 'blue';
    case 'menu':
      return 'green';
    case 'api':
      return 'orange';
    default:
      return 'default';
  }
}

function getTypeText(type: string) {
  switch (type) {
    case 'dir':
      return '目录';
    case 'menu':
      return '页面';
    case 'api':
      return '权限点';
    default:
      return '未知';
  }
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="管理 MDM 系统全局所有的权限点（Permission Nodes）。每一个页面访问、按钮操作或 API 调用均可在此灵活定义，并关联至角色。"
    title="权限点管理"
  >
    <template #extra>
      <Space>
        <Button @click="() => message.info('同步所有 API 路由')">
          反向搜集
        </Button>
        <Button type="primary" @click="handleCreate"> 新增权限 </Button>
      </Space>
    </template>

    <div class="flex-1 min-h-0">
      <Grid table-title="权限一览表 (Permission List)">
        <template #empty>
          <span class="text-gray-400">暂无权限申明</span>
        </template>

        <template #type="{ row }">
          <Tag :color="getTypeColor(row.type)">{{ getTypeText(row.type) }}</Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button
              v-if="row.type === 'dir' || row.type === 'menu'"
              size="small"
              type="link"
            >
              添加下级
            </Button>
            <Button danger size="small" type="link"> 废弃 </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
