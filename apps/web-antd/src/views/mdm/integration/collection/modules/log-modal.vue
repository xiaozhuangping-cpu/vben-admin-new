<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenModal } from '@vben/common-ui';

import { Alert, Button, Card, Empty, Table, Tag } from 'ant-design-vue';

import {
  getCollectionTaskLogListApi,
  getCollectionTaskRunListApi,
} from '#/api/mdm/collection';

const currentTask = ref<any>(null);
const loading = ref(false);
const runs = ref<any[]>([]);
const logs = ref<any[]>([]);
const router = useRouter();

const title = computed(() =>
  currentTask.value?.name ? `执行日志 - ${currentTask.value.name}` : '执行日志',
);

const runColumns = [
  { dataIndex: 'createdAt', key: 'createdAt', title: '创建时间', width: 180 },
  {
    dataIndex: 'triggerMode',
    key: 'triggerMode',
    title: '触发方式',
    width: 110,
  },
  { dataIndex: 'status', key: 'status', title: '执行状态', width: 110 },
  { dataIndex: 'startedAt', key: 'startedAt', title: '开始时间', width: 180 },
  { dataIndex: 'finishedAt', key: 'finishedAt', title: '完成时间', width: 180 },
  { dataIndex: 'errorMessage', key: 'errorMessage', title: '错误信息' },
];

const logColumns = [
  { dataIndex: 'createdAt', key: 'createdAt', title: '记录时间', width: 180 },
  { dataIndex: 'runSummary', key: 'runSummary', title: '执行批次', width: 160 },
  { dataIndex: 'level', key: 'level', title: '级别', width: 100 },
  { dataIndex: 'message', key: 'message', title: '日志内容' },
  { dataIndex: 'action', key: 'action', title: '操作', width: 100 },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'failed': {
      return 'error';
    }
    case 'pending': {
      return 'warning';
    }
    case 'running': {
      return 'processing';
    }
    case 'success': {
      return 'success';
    }
    default: {
      return 'default';
    }
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case 'error': {
      return 'error';
    }
    case 'warning': {
      return 'warning';
    }
    default: {
      return 'processing';
    }
  }
}

function handleOpenDetail(record: any) {
  modalApi.close();
  router.push({
    name: 'MdmIntegrationCollectionLogDetail',
    params: { id: String(record.id) },
  });
}

async function loadData() {
  if (!currentTask.value?.id) {
    runs.value = [];
    logs.value = [];
    return;
  }

  loading.value = true;
  try {
    const [runResult, logResult] = await Promise.all([
      getCollectionTaskRunListApi({
        page: 1,
        pageSize: 20,
        task_id: `eq.${currentTask.value.id}`,
      }),
      getCollectionTaskLogListApi({
        page: 1,
        pageSize: 100,
        task_id: `eq.${currentTask.value.id}`,
      }),
    ]);

    runs.value = runResult.items;
    logs.value = logResult.items;
  } finally {
    loading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    currentTask.value = modalApi.getData<any>() || null;
    loadData();
  },
});
</script>

<template>
  <Modal :title="title" class="w-[1100px]">
    <div class="p-4">
      <Alert
        show-icon
        type="info"
        message="这里展示该归集任务最近的执行批次和日志明细。"
      />

      <div class="mt-4 flex flex-col gap-4">
        <Card size="small" title="执行批次">
          <template v-if="runs.length > 0">
            <Table
              :columns="runColumns"
              :data-source="runs"
              :loading="loading"
              :pagination="false"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <Tag :color="getStatusColor(record.status)">
                    {{ record.status }}
                  </Tag>
                </template>
              </template>
            </Table>
          </template>
          <Empty v-else description="暂无执行批次" />
        </Card>

        <Card size="small" title="日志明细">
          <template v-if="logs.length > 0">
            <Table
              :columns="logColumns"
              :data-source="logs"
              :loading="loading"
              :pagination="false"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'level'">
                  <Tag :color="getLevelColor(record.level)">
                    {{ record.level }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'action'">
                  <Button
                    type="link"
                    size="small"
                    @click="handleOpenDetail(record)"
                  >
                    详情
                  </Button>
                </template>
              </template>
            </Table>
          </template>
          <Empty v-else description="暂无日志明细" />
        </Card>
      </div>
    </div>
  </Modal>
</template>
