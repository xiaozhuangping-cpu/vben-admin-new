<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Alert, Button, Card, Descriptions, Empty, Tag } from 'ant-design-vue';

import { getDistributionTaskLogDetailApi } from '#/api/mdm/distribution';
import { formatDateTime } from '#/utils/date';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const detail = ref<any>(null);

const title = computed(() =>
  detail.value?.task?.schemeName
    ? `分发日志详情 - ${detail.value.task.schemeName}`
    : '分发日志详情',
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

function getStatusColor(status?: string) {
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
    detail.value = await getDistributionTaskLogDetailApi(id);
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
    description="查看分发日志、任务状态和请求响应载荷。"
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
          message="当前页面展示分发日志的完整上下文，包括所属任务、目标系统、请求体和响应体。"
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
              <Tag :color="getLevelColor(detail.level)">{{ detail.level }}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="执行结果">
              <Tag
                :color="
                  detail.success === false
                    ? 'error'
                    : detail.success === true
                      ? 'success'
                      : 'default'
                "
              >
                {{
                  detail.success === true
                    ? '成功'
                    : detail.success === false
                      ? '失败'
                      : '未知'
                }}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="方案名称">
              {{ detail.task?.schemeName || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="目标系统">
              {{ detail.task?.targetName || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="模型名称">
              {{ detail.task?.definitionName || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="任务状态">
              <Tag :color="getStatusColor(detail.task?.status)">
                {{ detail.task?.status || '-' }}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="日志消息" :span="2">
              {{ detail.message || '-' }}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card :bordered="false" :loading="loading" title="任务信息">
          <Descriptions :column="2" bordered size="small">
            <Descriptions.Item label="任务ID">
              {{ detail.task?.id || detail.taskId || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="操作类型">
              {{ detail.task?.operationType || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="触发方式">
              {{ detail.task?.triggerMode || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="重试次数">
              {{ detail.task?.retryCount ?? '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {{ formatDateTime(detail.task?.startedAt) }}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {{ formatDateTime(detail.task?.finishedAt) }}
            </Descriptions.Item>
            <Descriptions.Item label="错误信息" :span="2">
              {{ detail.task?.errorMessage || '-' }}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card :bordered="false" :loading="loading" title="请求载荷">
          <pre class="whitespace-pre-wrap break-all">{{
            formatJson(detail.requestPayload)
          }}</pre>
        </Card>

        <Card :bordered="false" :loading="loading" title="响应载荷">
          <pre class="whitespace-pre-wrap break-all">{{
            formatJson(detail.responsePayload)
          }}</pre>
        </Card>
      </div>
    </template>

    <Card v-else :bordered="false">
      <Empty description="未找到分发日志详情" />
    </Card>
  </Page>
</template>
