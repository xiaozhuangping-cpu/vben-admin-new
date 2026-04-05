<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal } from '@vben/common-ui';
import {
  Button,
  message,
  Space,
  Tag,
  Modal,
  Progress,
  Alert,
} from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { Plus, RotateCw } from '@vben/icons';
import { h, ref } from 'vue';
import { useColumns } from './data';
import DistributionFormModal from './modules/form.vue';

const MOCK_DISTRIBUTIONS = [
  {
    id: '1',
    targetSystem: 'SAP ERP',
    model: '物料主数据',
    syncType: 'realtime',
    status: 'online',
    lastSync: '2024-04-01 12:00:23',
    successRate: 98,
  },
  {
    id: '2',
    targetSystem: 'Salesforce CRM',
    model: '客户主体',
    syncType: 'delta',
    status: 'paused',
    lastSync: '2024-03-31 23:30:10',
    successRate: 100,
  },
  {
    id: '3',
    targetSystem: '电商中台',
    model: '物料主数据',
    syncType: 'cron',
    status: 'error',
    lastSync: '2024-04-01 02:00:00',
    successRate: 85,
  },
];

const [Form, formModalApi] = useVbenModal({
  connectedComponent: DistributionFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_DISTRIBUTIONS,
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

function handleSyncNow(row: any) {
  message
    .loading(`正在分发 [${row.model}] 数据至 [${row.targetSystem}]...`, 1.5)
    .then(() => {
      message.success('分发指令已下发成功。');
    });
}

function handleToggleStatus(row: any) {
  message.info(`分发任务状态变更: ${row.targetSystem}`);
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="实现主数据向外围系统（ERP, CRM, PLM等）的自动化分发策略。支持实时推送、定时同步及多条件分发，减少数据孤岛，确保业务系统的数据一致性。"
    title="数据分发管理"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">
        <Plus class="size-4" /> 新增分发任务
      </Button>
    </template>

    <div class="mb-4">
      <Alert
        message="分发监控警报：检测到电商中台连接超时 (HTTP 504)，增量任务将延后 10 分钟重试。"
        type="error"
        show-icon
      />
    </div>

    <Form @success="() => Grid.reload()" />

    <div class="flex-1 min-h-0">
      <Grid table-title="分发任务配置">
        <template #syncType="{ row }">
          <Tag v-if="row.syncType === 'realtime'" color="cyan">实时推送</Tag>
          <Tag v-else-if="row.syncType === 'cron'" color="orange">定时任务</Tag>
          <Tag v-else color="blue">增量推送</Tag>
        </template>

        <template #status="{ row }">
          <Tag
            :color="
              row.status === 'online'
                ? 'success'
                : row.status === 'error'
                  ? 'error'
                  : 'default'
            "
          >
            {{
              row.status === 'online'
                ? '正在分发'
                : row.status === 'error'
                  ? '分发异常'
                  : '暂停同步'
            }}
          </Tag>
        </template>

        <template #rate="{ row }">
          <Progress
            :percent="row.successRate"
            size="small"
            :status="row.successRate < 90 ? 'exception' : 'normal'"
          />
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleSyncNow(row)">
              手动触发
            </Button>
            <Button size="small" type="link" @click="handleEdit(row)">
              编辑
            </Button>
            <Button size="small" type="link" @click="handleToggleStatus(row)">
              {{ row.status === 'online' ? '暂停' : '启用' }}
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
