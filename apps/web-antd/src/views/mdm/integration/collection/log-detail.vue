<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Alert, Button, Card, Descriptions, Empty, Tag } from 'ant-design-vue';

import { getCollectionTaskLogDetailApi } from '#/api/mdm/collection';
import { formatDateTime } from '#/utils/date';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const detail = ref<any>(null);

const title = computed(() =>
  detail.value?.task?.name
    ? `归集日志详情 - ${detail.value.task.name}`
    : '归集日志详情',
);

function formatJson(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getLevelColor(level?: string) {
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

function getRunStatusColor(status?: string) {
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

async function loadDetail() {
  const id = String(route.params.id || '');
  if (!id) {
    detail.value = null;
    return;
  }

  loading.value = true;
  try {
    detail.value = await getCollectionTaskLogDetailApi(id);
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.id,
  () => {
    loadDetail();
  },
);

onMounted(() => {
  loadDetail();
});
</script>

<template>
  <Page
    auto-content-height
    content-class="p-4"
    description="查看归集日志、批次状态与完整明细。"
    :title="title"
  >
    <template #extra>
      <Button @click="router.back()">返回</Button>
    </template>

    <template v-if="detail">
      <div class="flex flex-col gap-4">
        <Alert
          show-icon
          type="info"
          message="当前页面展示归集日志的完整上下文，包括所属任务、执行批次和详细 JSON。"
        />

        <Card :bordered="false" :loading="loading" title="基础信息">
          <Descriptions :column="2" bordered size="small">
            <Descriptions.Item label="日志ID">
{{
              detail.id
            }}
</Descriptions.Item>
            <Descriptions.Item label="记录时间">
              {{ formatDateTime(detail.createdAt) }}
            </Descriptions.Item>
            <Descriptions.Item label="日志级别">
              <Tag :color="getLevelColor(detail.level)">
                {{ detail.level }}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="所属任务">
              {{ detail.task?.name || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="运行批次">
              {{ detail.run?.id || detail.runId || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="批次状态">
              <Tag :color="getRunStatusColor(detail.run?.status)">
                {{ detail.run?.status || '-' }}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="触发方式">
              {{ detail.run?.triggerMode || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="日志消息">
              {{ detail.message || '-' }}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card :bordered="false" :loading="loading" title="批次明细">
          <Descriptions :column="2" bordered size="small">
            <Descriptions.Item label="开始时间">
              {{ formatDateTime(detail.run?.startedAt) }}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {{ formatDateTime(detail.run?.finishedAt) }}
            </Descriptions.Item>
            <Descriptions.Item label="错误信息" :span="2">
              {{ detail.run?.errorMessage || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="结果摘要" :span="2">
              <pre class="whitespace-pre-wrap break-all">{{
                formatJson(detail.run?.resultSummary)
              }}</pre>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card :bordered="false" :loading="loading" title="日志明细">
          <pre class="whitespace-pre-wrap break-all">{{
            formatJson(detail.detail)
          }}</pre>
        </Card>
      </div>
    </template>

    <Card v-else :bordered="false">
      <Empty description="未找到归集日志详情" />
    </Card>
  </Page>
</template>
