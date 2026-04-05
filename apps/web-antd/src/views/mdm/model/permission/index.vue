<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal, useVbenDrawer } from '@vben/common-ui';
import {
  Button,
  message,
  Space,
  Tag,
  Tabs,
  Table,
  Checkbox,
} from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { Plus, Settings } from '@vben/icons';
import { useColumns } from './data';
import PermissionFormModal from './modules/form.vue';
import { ref } from 'vue';

const MOCK_PERMISSIONS = [
  {
    id: '1',
    targetType: '角色',
    targetName: '业务部负责人',
    model: '物料主数据',
    scope: '全部数据',
    rule: 'ALL',
    status: true,
  },
  {
    id: '2',
    targetType: '组织',
    targetName: '财务部',
    model: '客户主体',
    scope: '自定义 SQL',
    rule: 'model.org_id IN (100, 201)',
    status: true,
  },
];

const MOCK_FIELDS = [
  { field: 'ID', title: '标识 ID', read: true, write: false, hidden: false },
  { field: 'CODE', title: '编码', read: true, write: true, hidden: false },
  { field: 'NAME', title: '名称', read: true, write: true, hidden: false },
  { field: 'PRICE', title: '单价', read: false, write: false, hidden: true },
  { field: 'COST', title: '成本', read: false, write: false, hidden: true },
];

const [Form, formModalApi] = useVbenModal({
  connectedComponent: PermissionFormModal,
  destroyOnClose: true,
});

const [FieldDrawer, fieldDrawerApi] = useVbenDrawer({
  title: '列级字段权限配置',
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_PERMISSIONS,
};

const [Grid] = useVbenVxeGrid({
  gridOptions,
});

const selectedPerm = ref<any>(null);

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleFieldAuth(row: any) {
  selectedPerm.value = row;
  fieldDrawerApi.open();
}

function handleDelete(row: any) {
  message.warning(`删除权限配置: ${row.id}`);
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="配置主数据在行级（数据范围）与列级（字段可见性）的访问权限。区别于系统功能权限，这确保不同角色仅能看到其授权范围内的主数据详情。"
    title="数据权限"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">
        <Plus class="size-4" /> 新增规则
      </Button>
    </template>

    <Form @success="() => Grid.reload()" />

    <FieldDrawer>
      <div class="p-4">
        <div class="mb-4">
          授权对象: <Tag color="blue">{{ selectedPerm?.targetName }}</Tag> |
          模型: <Tag color="orange">{{ selectedPerm?.model }}</Tag>
        </div>
        <Table
          :columns="[
            { title: '字段名称', dataIndex: 'title' },
            {
              title: '查看 (R)',
              dataIndex: 'read',
              slots: { default: 'read' },
            },
            {
              title: '编辑 (W)',
              dataIndex: 'write',
              slots: { default: 'write' },
            },
            {
              title: '隐藏 (H)',
              dataIndex: 'hidden',
              slots: { default: 'hidden' },
            },
          ]"
          :data-source="MOCK_FIELDS"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template
              v-if="['read', 'write', 'hidden'].includes(column.dataIndex)"
            >
              <Checkbox v-model:checked="record[column.dataIndex]" />
            </template>
          </template>
        </Table>
      </div>
    </FieldDrawer>

    <div class="flex-1 min-h-0">
      <Grid table-title="数据权限表">
        <template #status="{ row }">
          <Tag :color="row.status ? 'success' : 'error'">{{
            row.status ? '生效' : '失效'
          }}</Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleFieldAuth(row)"
              >字段权限</Button
            >
            <Button size="small" type="link" @click="handleEdit(row)"
              >编辑</Button
            >
            <Button danger size="small" type="link" @click="handleDelete(row)"
              >删除</Button
            >
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
