<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page } from '@vben/common-ui';
import { Button, message, Space, Tag } from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { h, ref } from 'vue';
import { useColumns } from './data';

const MOCK_MENUS = [
  {
    id: '1',
    title: '仪表盘 | Dashboard',
    icon: 'lucide:layout-dashboard',
    path: '/dashboard',
    order: 10,
    visible: true,
    keepAlive: true,
    children: [
      {
        id: '1-1',
        title: '概览',
        icon: 'lucide:cpu',
        path: '/dashboard/overview',
        order: 1,
        visible: true,
        keepAlive: true,
      },
      {
        id: '1-2',
        title: '工作台',
        icon: 'lucide:home',
        path: '/dashboard/workspace',
        order: 2,
        visible: true,
        keepAlive: true,
      },
    ],
  },
  {
    id: '2',
    title: '主数据建模 | Model',
    icon: 'lucide:database',
    path: '/mdm/model',
    order: 100,
    visible: true,
    keepAlive: true,
    children: [
      {
        id: '2-1',
        title: '数据主题',
        path: '/mdm/model/theme',
        order: 1,
        visible: true,
        keepAlive: true,
      },
      {
        id: '2-2',
        title: '模型定义',
        path: '/mdm/model/definition',
        order: 2,
        visible: true,
        keepAlive: true,
      },
      {
        id: '2-3',
        title: '字段映射',
        path: '/mdm/model/field',
        order: 3,
        visible: true,
        keepAlive: true,
      },
    ],
  },
  {
    id: '3',
    title: '系统管理 | System',
    icon: 'lucide:settings',
    path: '/mdm/system',
    order: 500,
    visible: true,
    keepAlive: true,
    children: [
      {
        id: '3-1',
        title: '人员账号',
        path: '/mdm/system/user',
        order: 1,
        visible: true,
        keepAlive: true,
      },
      {
        id: '3-2',
        title: '角色权限',
        path: '/mdm/system/role',
        order: 2,
        visible: true,
        keepAlive: true,
      },
    ],
  },
];

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_MENUS,
  height: 'auto',
  treeConfig: {
    transform: true,
    rowField: 'id',
    parentField: 'parentId',
    expandAll: true,
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

function handleEdit(row: any) {
  message.info(`正在修改 [${row.title}] 的菜单路径与图标定义`);
}

function handleAddChild(row: any) {
  message
    .loading(`正在为父级菜单 [${row.title}] 添加子级条目...`, 1)
    .then(() => {
      message.success('子菜单条目追加成功');
    });
}
</script>

<template>
  <Page
    auto-content-height
    description="管理 MDM 系统侧边菜单的可见性、标题、图标及排序。可一键开启/关闭菜单项、控制路由缓存及其权限映射。"
    title="菜单管理"
  >
    <template #extra>
      <Space>
        <Button
          @click="
            () => message.info('同步路由树到后端菜单数据字典 (Casbin_Menu)...')
          "
        >
          自动搜集路由
        </Button>
        <Button type="primary" @click="() => message.info('保存当前菜单顺序')">
          保存排序
        </Button>
      </Space>
    </template>

    <Grid table-title="导航配置 (Navigation Config)">
      <template #empty>
        <span class="text-gray-400">暂无菜单配置记录</span>
      </template>

      <template #icon="{ row }">
        <Tag v-if="row.icon" color="cyan">{{ row.icon }}</Tag>
        <span v-else class="text-gray-400 italic">None</span>
      </template>

      <template #visible="{ row }">
        <Tag :color="row.visible ? 'success' : 'error'">{{
          row.visible ? '显示' : '隐藏'
        }}</Tag>
      </template>

      <template #keepAlive="{ row }">
        <Tag :color="row.keepAlive ? 'success' : 'default'">{{
          row.keepAlive ? '活跃' : '普通'
        }}</Tag>
      </template>

      <template #action="{ row }">
        <Space>
          <Button size="small" type="link" @click="handleEdit(row)">
            编辑
          </Button>
          <Button size="small" type="link" @click="handleAddChild(row)">
            下级
          </Button>
          <Button danger size="small" type="link"> 删除 </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
