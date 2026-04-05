<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal } from '@vben/common-ui';
import { Button, message, Space, Tag } from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { Plus } from '@vben/icons';
import { useColumns } from './data';
import RelationshipFormModal from './modules/form.vue';

const MOCK_RELATIONSHIPS = [
  {
    id: '1',
    sourceModel: '客户主体 (CUSTOMER)',
    targetModel: '联系人 (CONTACT)',
    type: '1:N',
    sourceField: 'ID',
    targetField: 'CUST_ID',
    remark: '一个客户可以有多个联系人',
  },
  {
    id: '2',
    sourceModel: '物料主数据 (MATERIAL)',
    targetModel: '计量单位 (UOM)',
    type: 'N:1',
    sourceField: 'UOM_ID',
    targetField: 'ID',
    remark: '物料关联基本单位',
  },
];

const [Form, formModalApi] = useVbenModal({
  connectedComponent: RelationshipFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_RELATIONSHIPS,
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const [Grid] = useVbenVxeGrid({
  gridOptions,
});

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleDelete(row: any) {
  message.warning(`删除关系: ${row.id}`);
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="管理主数据模型之间的逻辑关联（一对一、一对多等），为数据维护阶段的级联操作与关联录入提供依据。"
    title="模型关系"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">
        <Plus class="size-4" /> 新增关系
      </Button>
    </template>

    <Form @success="() => Grid.reload()" />

    <div class="flex-1 min-h-0">
      <Grid table-title="关系列表">
        <template #type="{ row }">
          <Tag color="cyan">{{ row.type }}</Tag>
        </template>

        <template #action="{ row }">
          <Space>
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
