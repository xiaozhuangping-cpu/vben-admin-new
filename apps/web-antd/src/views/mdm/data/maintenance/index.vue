<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, Card, message, Select, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useColumns, useSearchSchema } from './data';
import DataFormModal from './modules/form.vue';

const MOCK_RECORDS = [
  {
    createBy: 'admin',
    createTime: '2024-03-24 10:00:00',
    entityCode: 'DEV_LIGHT_001',
    entityName: '智领系列-吸顶灯 L1',
    id: '1',
    status: 'normal',
    version: 'v1.0.0',
  },
  {
    createBy: 'iot_svc',
    createTime: '2024-03-25 14:20:00',
    entityCode: 'DEV_SNSR_002',
    entityName: '全屋环境传感器 S2',
    id: '2',
    status: 'pending',
    version: 'v1.1.2',
  },
  {
    createBy: 'system',
    createTime: '2024-03-26 09:15:00',
    entityCode: 'DEV_LOCK_003',
    entityName: '方舟智能门锁 X1',
    id: '3',
    status: 'normal',
    version: 'v1.0.1',
  },
];

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  invalid: { color: 'default', label: '失效' },
  normal: { color: 'success', label: '正常' },
  pending: { color: 'warning', label: '审核中' },
};

const [Form, formModalApi] = useVbenModal({
  connectedComponent: DataFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_RECORDS,
  formConfig: {
    schema: useSearchSchema(),
  },
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

function handleAudit(row: any) {
  message.info(`审核变更: ${row.entityName}`);
}

function handleHistory(row: any) {
  message.info(`查看历史版本: ${row.entityName}`);
}

function refreshGrid() {
  message.success('更新成功');
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="在各主数据模型下对数据进行增删改查。支持版本历史追踪及数据质量审核。"
    title="主数据维护"
  >
    <template #extra>
      <Space>
        <Select
          :options="[
            { label: '智能设备 (DEVICES)', value: 'device' },
            { label: '配件与耗材 (PARTS)', value: 'part' },
            { label: '生态服务商 (PARTNERS)', value: 'partner' },
          ]"
          placeholder="切换主数据模型"
          style="width: 160px"
        />
        <Button type="primary" @click="handleCreate"> 新增记录 </Button>
      </Space>
    </template>

    <Form @success="refreshGrid" />

    <div class="flex-1 min-h-0">
      <Grid table-title="主数据记录">
        <template #status="{ row }">
          <Tag :color="STATUS_MAP[row.status]?.color">{{
            STATUS_MAP[row.status]?.label
          }}</Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)"
              >编辑</Button
            >
            <Button size="small" type="link" @click="handleAudit(row)"
              >审核</Button
            >
            <Button size="small" type="link" @click="handleHistory(row)"
              >历史</Button
            >
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
