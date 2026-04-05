<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal } from '@vben/common-ui';
import {
  Button,
  message,
  Space,
  Tag,
  Modal,
  Tabs,
  TabPane,
} from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { h, ref } from 'vue';
import { useColumns } from './data';
import RoleFormModal from './modules/form.vue';

const ROLE_DATA = [
  {
    name: '超级管理员',
    code: 'super_admin',
    desc: '拥有全系统最高权限，负责初始化系统配置。',
  },
  {
    name: 'IoT 设备架构师',
    code: 'iot_arch',
    desc: '负责定义全景智能家居设备的元数据标准。',
  },
  {
    name: '安全审计专员',
    code: 'security_auditor',
    desc: '负责监控用户授权及敏感主数据访问日志。',
  },
  {
    name: '多租户管理员',
    code: 'tenant_admin',
    desc: '负责跨组织的数据逻辑隔离与共享规则维护。',
  },
  {
    name: '主数据运营专家',
    code: 'mdm_expert',
    desc: '负责主数据的质量校验、清洗及全流程分发。',
  },
  {
    name: '固件版本分析师',
    code: 'ota_analyst',
    desc: '负责管理智能硬件各个版本的兼容性数据模型。',
  },
  {
    name: '供应链协同员',
    code: 'supply_chain',
    desc: '负责同步物料清单 (BOM) 至主数据平台。',
  },
];

const MOCK_ROLES = Array.from({ length: 20 }).map((_, index) => {
  const base = ROLE_DATA[index % ROLE_DATA.length];
  return {
    id: `${index + 1}`,
    name:
      index < ROLE_DATA.length
        ? base.name
        : `${base.name}_${Math.floor(index / ROLE_DATA.length)}`,
    code: index < ROLE_DATA.length ? base.code : `${base.code}_${index}`,
    description: base.desc,
    status: true,
    creator: 'System_Init',
    createTime: '2024-01-01 09:00:00',
  };
});

const [RoleModal, roleModalApi] = useVbenModal({
  connectedComponent: RoleFormModal,
  destroyOnClose: false,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_ROLES,
  height: 'auto',
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

const handleAuth = (row: any) => {
  message.info(`正在开启 [${row.name}] 的权限矩阵配置界面`);
};

function handleCreate() {
  console.log('Role handleCreate called');
  message.info('正在打开新增角色弹窗...');
  roleModalApi.setData({}).open();
}

function handleEdit(row: any) {
  roleModalApi.setData(row).open();
}

function handleDelete(row: any) {
  Modal.confirm({
    title: '确认删除角色？',
    content: `删除后，已关联 [${row.name}] 的用户将失去相应权限，请谨慎操作。`,
    onOk() {
      message.success(`角色 [${row.name}] 已成功移除`);
    },
  });
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="管理 MDM 系统内部的功能角色。通过角色可以将权限点（读、写、审、发）批量分配给用户，实现灵活的访问控制。"
    title="角色管理"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate"> 新增角色 </Button>
    </template>

    <RoleModal @success="() => gridApi.reload()" />

    <div class="flex-1 min-h-0">
      <Grid table-title="角色列表">
        <template #empty>
          <span class="text-gray-400">暂无角色记录</span>
        </template>

        <template #status="{ row }">
          <Tag :color="row.status ? 'success' : 'error'">{{
            row.status ? '已启用' : '已禁用'
          }}</Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleAuth(row)">
              授权
            </Button>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button
              danger
              size="small"
              type="link"
              @click="() => handleDelete(row)"
            >
              删除
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
