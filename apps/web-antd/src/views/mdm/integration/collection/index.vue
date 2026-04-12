<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useColumns, useSearchSchema } from './data';
import CollectionFormModal from './modules/form.vue';

const MOCK_TASKS = [
  {
    frequency: '每小时',
    id: '1',
    lastRun: '2024-03-27 16:00:00',
    sourceSystem: 'Xiaomi IoT Platform',
    status: 'running',
    targetModel: '照明',
    taskName: '米家设备状态同步',
    type: 'API',
  },
  {
    frequency: '每天',
    id: '2',
    lastRun: '2024-03-27 01:00:00',
    sourceSystem: 'Tuya Cloud',
    status: 'stopped',
    targetModel: '全屋传感器',
    taskName: '涂鸦设备元数据同步',
    type: 'Webhook',
  },
  {
    frequency: '每 5 分钟',
    id: '3',
    lastRun: '2024-03-27 18:30:00',
    sourceSystem: 'HomeKit Hub',
    status: 'running',
    targetModel: '安全防护',
    taskName: 'HomeKit 实时日志归集',
    type: 'MQTT',
  },
];

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  running: { color: 'success', label: '启用中' },
  stopped: { color: 'error', label: '已停止' },
};

const [Form, formModalApi] = useVbenModal({
  connectedComponent: CollectionFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_TASKS,
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
  gridOptions: {
    ...gridOptions,
    height: 'auto',
  },
});

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleRun(row: any) {
  message.loading(`正在手动触发任务: ${row.taskName}...`, 1.5).then(() => {
    message.success(`任务 ${row.taskName} 已成功加入队列`);
  });
}

function handleDelete(row: any) {
  message.warning(`删除任务: ${row.taskName}`);
}

function refreshGrid() {
  message.success('更新成功');
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="配置主数据从外部源系统 (ERP, CRM, HRM 等) 的归集策略，支持 ETL、API 及数据库直连方式。"
    title="数据归集任务"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate"> 新增任务 </Button>
    </template>

    <Form @success="refreshGrid" />

    <div class="flex-1 min-h-0">
      <Grid table-title="任务列表">
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
            <Button size="small" type="link" @click="handleRun(row)"
              >立即执行</Button
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
