<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, h, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Card,
  DatePicker,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  cloneDistributionSchemeApi,
  createDistributionTaskApi,
  deleteDistributionSchemeApi,
  deleteDistributionTargetApi,
  dispatchDistributionTasksApi,
  getDistributionSchemeListApi,
  getDistributionTargetListApi,
  getDistributionTaskListApi,
  getDistributionTaskLogListApi,
  testDistributionTargetConnectionApi,
  toggleDistributionSchemeStatusApi,
} from '#/api/mdm/distribution';
import { getModelDefinitionListApi } from '#/api/mdm/model-definition';

import {
  useLogColumns,
  useSchemeColumns,
  useTargetColumns,
  useTaskColumns,
} from './columns';
import SchemeFormModal from './modules/scheme-form.vue';
import TargetFormModal from './modules/target-form.vue';

type DistributionSection = 'logs' | 'schemes' | 'targets' | 'tasks';

defineOptions({ name: 'MdmIntegrationDistribution' });

const route = useRoute();
const router = useRouter();

const SECTION_META: Record<
  DistributionSection,
  { actionLabel: string; description: string; pageTitle: string }
> = {
  logs: {
    actionLabel: '刷新日志',
    description: '查看分发执行日志，支持按级别、结果和时间筛选并导出。',
    pageTitle: '执行日志',
  },
  schemes: {
    actionLabel: '新增方案',
    description: '维护分发方案，控制分发方式、目标与触发规则。',
    pageTitle: '分发方案',
  },
  targets: {
    actionLabel: '新增目标',
    description: '维护分发目标系统，配置认证、请求方式和连接信息。',
    pageTitle: '分发目标',
  },
  tasks: {
    actionLabel: '刷新任务',
    description: '查看分发任务执行情况，支持失败重试和任务导出。',
    pageTitle: '分发任务',
  },
};

const targetTypeMap: Record<string, { color: string; label: string }> = {
  database: { color: 'purple', label: '数据库' },
  http: { color: 'blue', label: 'HTTP API' },
  mq: { color: 'orange', label: '消息队列' },
};

const authTypeMap: Record<string, { color: string; label: string }> = {
  basic: { color: 'geekblue', label: 'Basic Auth' },
  bearer: { color: 'cyan', label: 'Bearer' },
  header: { color: 'gold', label: 'Header' },
  none: { color: 'default', label: '无认证' },
};

const schemeStatusMap: Record<string, { color: string; label: string }> = {
  disabled: { color: 'default', label: '停用' },
  draft: { color: 'processing', label: '草稿' },
  enabled: { color: 'success', label: '启用' },
};

const dispatchModeMap: Record<string, { color: string; label: string }> = {
  cron: { color: 'orange', label: '定时分发' },
  manual: { color: 'default', label: '手工触发' },
  realtime: { color: 'cyan', label: '实时分发' },
};

const taskStatusMap: Record<string, { color: string; label: string }> = {
  cancelled: { color: 'default', label: '已取消' },
  failed: { color: 'error', label: '失败' },
  pending: { color: 'warning', label: '待执行' },
  running: { color: 'processing', label: '执行中' },
  success: { color: 'success', label: '成功' },
};

const logLevelMap: Record<string, { color: string; label: string }> = {
  error: { color: 'error', label: '错误' },
  info: { color: 'processing', label: '信息' },
  warning: { color: 'warning', label: '警告' },
};

const failedTasksOnly = ref(false);
const activeSection = ref<DistributionSection>('targets');
const logKeywordFilter = ref('');
const logLevelFilter = ref<string>();
const logResultFilter = ref<string>();
const logDateRange = ref<string[]>([]);
const taskDefinitionFilter = ref<string>();
const taskStatusFilter = ref<string>();
const taskTargetFilter = ref<string>();
const taskDateRange = ref<string[]>([]);
const definitionOptions = ref<Array<{ label: string; value: string }>>([]);
const targetOptions = ref<Array<{ label: string; value: string }>>([]);
const [TargetForm, targetFormModalApi] = useVbenModal({
  connectedComponent: TargetFormModal,
  destroyOnClose: true,
});

const [SchemeForm, schemeFormModalApi] = useVbenModal({
  connectedComponent: SchemeFormModal,
  destroyOnClose: true,
});

function resolveSectionFromRouteName(name?: string): DistributionSection {
  switch (String(name || '')) {
    case 'MdmIntegrationDistributionLogs': {
      return 'logs';
    }
    case 'MdmIntegrationDistributionSchemes': {
      return 'schemes';
    }
    case 'MdmIntegrationDistributionTasks': {
      return 'tasks';
    }
    default: {
      return 'targets';
    }
  }
}

function getTaskQueryParams(page = 1, pageSize = 10) {
  let statusFilter = {};
  if (failedTasksOnly.value) {
    statusFilter = { status: 'eq.failed' };
  } else if (taskStatusFilter.value) {
    statusFilter = { status: `eq.${taskStatusFilter.value}` };
  }

  return {
    page,
    pageSize,
    ...statusFilter,
    ...(taskDefinitionFilter.value
      ? { definition_id: `eq.${taskDefinitionFilter.value}` }
      : {}),
    ...(taskTargetFilter.value
      ? { target_id: `eq.${taskTargetFilter.value}` }
      : {}),
    ...(taskDateRange.value[0]
      ? { createdAtFrom: taskDateRange.value[0] }
      : {}),
    ...(taskDateRange.value[1] ? { createdAtTo: taskDateRange.value[1] } : {}),
  };
}

function getLogQueryParams(page = 1, pageSize = 10) {
  let resultFilter = {};
  if (logResultFilter.value === 'success') {
    resultFilter = { success: 'eq.true' };
  } else if (logResultFilter.value === 'failed') {
    resultFilter = { success: 'eq.false' };
  }

  return {
    page,
    pageSize,
    ...resultFilter,
    ...(logKeywordFilter.value.trim()
      ? { message: `ilike.%${logKeywordFilter.value.trim()}%` }
      : {}),
    ...(logLevelFilter.value ? { level: `eq.${logLevelFilter.value}` } : {}),
    ...(logDateRange.value[0] ? { createdAtFrom: logDateRange.value[0] } : {}),
    ...(logDateRange.value[1] ? { createdAtTo: logDateRange.value[1] } : {}),
  };
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<unknown[]>,
) {
  const headerLine = headers.map((item) => escapeCsvCell(item)).join(',');
  const bodyLines = rows.map((row) =>
    row.map((item) => escapeCsvCell(item)).join(','),
  );
  const blob = new Blob([`\uFEFF${[headerLine, ...bodyLines].join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatExportTime() {
  return new Date().toISOString().slice(0, 19).replaceAll(':', '-');
}

function formatLogResultLabel(success?: boolean | null) {
  if (success === true) {
    return '成功';
  }
  if (success === false) {
    return '失败';
  }
  return '未知';
}

function formatPreviewContent(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '无';
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

function buildTestResultContent(
  statusText: string,
  content: string,
  messageText?: string,
) {
  const sections = [statusText];

  if (messageText) {
    sections.push(messageText);
  }

  sections.push(content);

  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      },
    },
    [
      ...sections.slice(0, -1).map((item, index) =>
        h(
          'div',
          {
            key: `meta-${index}`,
            style: {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            },
          },
          item,
        ),
      ),
      h(
        'pre',
        {
          style: {
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: '6px',
            margin: 0,
            maxHeight: '360px',
            overflow: 'auto',
            padding: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          },
        },
        sections.at(-1) || '',
      ),
    ],
  );
}

async function handleExportTasks() {
  const result = await getDistributionTaskListApi(getTaskQueryParams(1, 5000));
  if (result.items.length === 0) {
    message.info('当前筛选条件下没有可导出的分发任务。');
    return;
  }

  downloadCsv(
    `mdm-distribution-tasks-${formatExportTime()}.csv`,
    [
      '浠诲姟ID',
      '鏂规鍚嶇О',
      '鏁版嵁妯″瀷',
      '鍒嗗彂鐩爣',
      '浠诲姟绫诲瀷',
      '瑙﹀彂鏂瑰紡',
      '执行状态',
      '鍏宠仈璁板綍ID',
      '閲嶈瘯娆℃暟',
      '鍒涘缓鏃堕棿',
      '开始时间',
      '瀹屾垚鏃堕棿',
      '閿欒淇℃伅',
    ],
    result.items.map((item: any) => [
      item.id,
      item.schemeName,
      item.definitionName,
      item.targetName,
      item.operationType,
      item.triggerMode,
      item.status,
      item.recordId,
      item.retryCount,
      item.createdAt,
      item.startedAt,
      item.finishedAt,
      item.errorMessage,
    ]),
  );

  message.success(`已导出 ${result.items.length} 条分发任务。`);
}

async function handleExportLogs() {
  const result = await getDistributionTaskLogListApi(
    getLogQueryParams(1, 5000),
  );
  if (result.items.length === 0) {
    message.info('当前筛选条件下没有可导出的执行日志。');
    return;
  }

  downloadCsv(
    `mdm-distribution-logs-${formatExportTime()}.csv`,
    [
      '鏃ュ織ID',
      '浠诲姟鎽樿',
      '绾у埆',
      '鎵ц缁撴灉',
      '鏃ュ織鍐呭',
      '璁板綍鏃堕棿',
    ],
    result.items.map((item: any) => [
      item.id,
      item.taskSummary,
      item.level,
      formatLogResultLabel(item.success),
      item.message,
      item.createdAt,
    ]),
  );

  message.success(`已导出 ${result.items.length} 条执行日志。`);
}

const targetGridOptions: VxeGridProps<any> = {
  columns: useTargetColumns(),
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getDistributionTargetListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
        }),
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const schemeGridOptions: VxeGridProps<any> = {
  columns: useSchemeColumns(),
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getDistributionSchemeListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
        }),
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const taskGridOptions: VxeGridProps<any> = {
  columns: useTaskColumns(),
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getDistributionTaskListApi(
          getTaskQueryParams(page.currentPage, page.pageSize),
        ),
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const logGridOptions: VxeGridProps<any> = {
  columns: [
    ...useLogColumns(),
    {
      field: 'action',
      title: '操作',
      width: 120,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ],
  height: 620,
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getDistributionTaskLogListApi(
          getLogQueryParams(page.currentPage, page.pageSize),
        ),
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const [TargetGrid, targetGridApi] = useVbenVxeGrid({
  gridOptions: targetGridOptions,
});

const [SchemeGrid, schemeGridApi] = useVbenVxeGrid({
  gridOptions: schemeGridOptions,
});

const [TaskGrid, taskGridApi] = useVbenVxeGrid({
  gridOptions: taskGridOptions,
});

const [LogGrid, logGridApi] = useVbenVxeGrid({
  gridOptions: logGridOptions,
});

const currentSectionMeta = computed(() => SECTION_META[activeSection.value]);

async function loadDefinitionOptions() {
  const result = await getModelDefinitionListApi({
    page: 1,
    pageSize: 1000,
    status: 'eq.published',
  });

  definitionOptions.value = result.items.map((item: any) => ({
    label: item.code ? `${item.name} (${item.code})` : item.name,
    value: String(item.id),
  }));
}

async function loadTargetOptions() {
  const result = await getDistributionTargetListApi({
    page: 1,
    pageSize: 1000,
    status: 'eq.true',
  });

  targetOptions.value = result.items.map((item: any) => ({
    label: item.name,
    value: String(item.id),
  }));
}

async function reloadLookups() {
  await Promise.all([loadDefinitionOptions(), loadTargetOptions()]);
}

function openCreateByCurrentSection() {
  if (activeSection.value === 'targets') {
    handleCreateTarget();
    return;
  }

  if (activeSection.value === 'schemes') {
    handleCreateScheme();
    return;
  }

  if (activeSection.value === 'tasks') {
    taskGridApi.reload();
    return;
  }

  logGridApi.reload();
}

function handleCreateTarget() {
  targetFormModalApi
    .setData({
      authConfig: {},
      onSuccess: async () => {
        await loadTargetOptions();
        targetGridApi.reload();
      },
    })
    .open();
}

function handleEditTarget(row: any) {
  targetFormModalApi
    .setData({
      ...row,
      onSuccess: async () => {
        await loadTargetOptions();
        targetGridApi.reload();
      },
    })
    .open();
}

async function handleDeleteTarget(row: any) {
  await deleteDistributionTargetApi(row.id);
  await loadTargetOptions();
  targetGridApi.reload();
  message.success(`已删除分发目标：${row.name}`);
}

async function handleTestTarget(row: any) {
  try {
    const result = await testDistributionTargetConnectionApi({
      target: row,
    });

    const statusText = result?.status
      ? `HTTP ${result.status}`
      : '未返回状态码';
    const content = formatPreviewContent(
      result?.responsePayload ?? result?.rawResponse ?? result,
    );

    if (result?.success === false) {
      Modal.error({
        title: `连接测试失败：${row.name}`,
        content: buildTestResultContent(
          statusText,
          content,
          result?.message || '目标系统返回失败结果。',
        ),
        width: 720,
      });
      return;
    }

    Modal.success({
      title: `连接测试成功：${row.name}`,
      content: buildTestResultContent(statusText, content),
      width: 720,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '测试连接时发生未知异常。';
    Modal.error({
      title: `连接测试出错：${row.name}`,
      content: errorMessage,
      width: 640,
    });
  }
}

function handleCreateScheme() {
  if (definitionOptions.value.length === 0) {
    message.warning('暂无已发布模型，暂时无法创建分发方案。');
    return;
  }

  if (targetOptions.value.length === 0) {
    message.warning('请先创建至少一个分发目标。');
    return;
  }

  schemeFormModalApi
    .setData({
      definitionOptions: definitionOptions.value,
      onSuccess: () => {
        schemeGridApi.reload();
      },
      targetOptions: targetOptions.value,
      triggerEvents: ['create', 'update'],
    })
    .open();
}

function handleEditScheme(row: any) {
  schemeFormModalApi
    .setData({
      ...row,
      definitionOptions: definitionOptions.value,
      onSuccess: () => {
        schemeGridApi.reload();
      },
      targetOptions: targetOptions.value,
    })
    .open();
}

async function handleDeleteScheme(row: any) {
  await deleteDistributionSchemeApi(row.id);
  schemeGridApi.reload();
  taskGridApi.reload();
  message.success(`已删除分发方案：${row.name}`);
}

async function handleCloneScheme(row: any) {
  const cloned = await cloneDistributionSchemeApi(row);
  schemeGridApi.reload();
  message.success(`已复制分发方案：${cloned?.name || row.name}`);
}

async function handleToggleSchemeStatus(row: any) {
  const nextStatus = row.status === 'enabled' ? 'disabled' : 'enabled';
  await toggleDistributionSchemeStatusApi(row.id, nextStatus);
  schemeGridApi.reload();
  message.success(
    nextStatus === 'enabled'
      ? `已启用分发方案：${row.name}`
      : `已停用分发方案：${row.name}`,
  );
}

async function handleTriggerScheme(row: any) {
  const task = await createDistributionTaskApi({
    definitionId: row.definitionId,
    operationType: 'full_sync',
    schemeId: row.id,
    targetId: row.targetId,
    triggerMode: 'manual',
  });

  if (task?.id) {
    await dispatchDistributionTasksApi({
      taskIds: [String(task.id)],
      triggerMode: 'manual',
    }).catch((error) => {
      console.error('dispatch task failed', error);
      message.warning('任务已创建，但执行失败，请到执行日志中查看详情。');
    });
  }

  taskGridApi.reload();
  logGridApi.reload();
  message.success(`已创建分发任务：${row.name}`);
}

async function handleRetryTask(row: any) {
  await dispatchDistributionTasksApi({
    taskIds: [String(row.id)],
    triggerMode: 'manual',
  });
  taskGridApi.reload();
  logGridApi.reload();
  message.success('任务已重新执行。');
}

async function handleRetryFailedTasks() {
  const result = await getDistributionTaskListApi({
    page: 1,
    pageSize: 1000,
    status: 'eq.failed',
  });

  const taskIds = result.items
    .map((item: any) => String(item.id || ''))
    .filter(Boolean);

  if (taskIds.length === 0) {
    message.info('当前没有失败任务可重试。');
    return;
  }

  await dispatchDistributionTasksApi({
    taskIds,
    triggerMode: 'manual',
  });

  taskGridApi.reload();
  logGridApi.reload();
  message.success(`已批量重试 ${taskIds.length} 个失败任务。`);
}

function handleResetTaskFilters() {
  failedTasksOnly.value = false;
  taskDateRange.value = [];
  taskDefinitionFilter.value = undefined;
  taskStatusFilter.value = undefined;
  taskTargetFilter.value = undefined;
  taskGridApi.reload();
}

function handleResetLogFilters() {
  logDateRange.value = [];
  logKeywordFilter.value = '';
  logLevelFilter.value = undefined;
  logResultFilter.value = undefined;
  logGridApi.reload();
}

function handleOpenLogDetail(row: any) {
  router.push({
    name: 'MdmIntegrationDistributionLogDetail',
    params: { id: String(row.id) },
  });
}

watch(
  () => route.name,
  (name) => {
    activeSection.value = resolveSectionFromRouteName(String(name || ''));
  },
  { immediate: true },
);

watch(failedTasksOnly, () => {
  if (failedTasksOnly.value) {
    taskStatusFilter.value = 'failed';
  } else if (taskStatusFilter.value === 'failed') {
    taskStatusFilter.value = undefined;
  }

  if (activeSection.value === 'tasks') {
    taskGridApi.reload();
  }
});

watch([taskDefinitionFilter, taskStatusFilter, taskTargetFilter], () => {
  if (failedTasksOnly.value && taskStatusFilter.value !== 'failed') {
    failedTasksOnly.value = false;
  }

  if (activeSection.value === 'tasks') {
    taskGridApi.reload();
  }
});

watch(taskDateRange, () => {
  if (activeSection.value === 'tasks') {
    taskGridApi.reload();
  }
});

watch(activeSection, (value) => {
  if (value === 'targets') {
    targetGridApi.reload();
    return;
  }

  if (value === 'schemes') {
    schemeGridApi.reload();
    return;
  }

  if (value === 'tasks') {
    taskGridApi.reload();
    return;
  }

  logGridApi.reload();
});

watch([logKeywordFilter, logLevelFilter, logResultFilter], () => {
  if (activeSection.value === 'logs') {
    logGridApi.reload();
  }
});

watch(logDateRange, () => {
  if (activeSection.value === 'logs') {
    logGridApi.reload();
  }
});

onMounted(async () => {
  await reloadLookups();
});
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col gap-4"
    :title="currentSectionMeta.pageTitle"
    :description="currentSectionMeta.description"
  >
    <template #extra>
      <Space>
        <Button @click="reloadLookups">
          <template #icon>
            <IconifyIcon icon="lucide:rotate-cw" />
          </template>
          刷新选项
        </Button>
        <Button type="primary" @click="openCreateByCurrentSection">
          <template #icon>
            <IconifyIcon icon="lucide:plus" />
          </template>
          {{ currentSectionMeta.actionLabel }}
        </Button>
      </Space>
    </template>

    <Alert
      type="info"
      show-icon
      message="当前版本已支持分发目标、分发方案、字段映射、手工触发、自动入队、任务追踪与执行日志。"
    />

    <TargetForm />
    <SchemeForm />

    <template v-if="activeSection === 'targets'">
      <Card :bordered="false">
        <TargetGrid table-title="分发目标列表">
          <template #targetType="{ row }">
            <Tag :color="targetTypeMap[row.targetType]?.color">
              {{ targetTypeMap[row.targetType]?.label || row.targetType }}
            </Tag>
          </template>

          <template #authType="{ row }">
            <Tag :color="authTypeMap[row.authType]?.color">
              {{ authTypeMap[row.authType]?.label || row.authType }}
            </Tag>
          </template>

          <template #status="{ row }">
            <Tag :color="row.status ? 'success' : 'default'">
              {{ row.status ? '启用' : '停用' }}
            </Tag>
          </template>

          <template #action="{ row }">
            <Space>
              <Button size="small" type="link" @click="handleTestTarget(row)">
                测试连接
              </Button>
              <Button size="small" type="link" @click="handleEditTarget(row)">
                编辑
              </Button>
              <Popconfirm
                title="确认删除该分发目标吗？"
                @confirm="handleDeleteTarget(row)"
              >
                <Button danger size="small" type="link">删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </TargetGrid>
      </Card>
    </template>

    <template v-else-if="activeSection === 'schemes'">
      <div class="flex flex-col gap-4">
        <Card :bordered="false">
          <Alert
            type="success"
            show-icon
            message="分发方案决定把哪个已发布模型，以什么方式，分发到哪个目标。"
          />
          <div class="mt-4">
            <SchemeGrid table-title="分发方案列表">
              <template #dispatchMode="{ row }">
                <Tag :color="dispatchModeMap[row.dispatchMode]?.color">
                  {{
                    dispatchModeMap[row.dispatchMode]?.label || row.dispatchMode
                  }}
                </Tag>
              </template>

              <template #schemeStatus="{ row }">
                <Tag :color="schemeStatusMap[row.status]?.color">
                  {{ schemeStatusMap[row.status]?.label || row.status }}
                </Tag>
              </template>

              <template #action="{ row }">
                <Space>
                  <Button
                    size="small"
                    type="link"
                    @click="handleTriggerScheme(row)"
                  >
                    手工触发
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    @click="handleCloneScheme(row)"
                  >
                    复制
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    @click="handleToggleSchemeStatus(row)"
                  >
                    {{ row.status === 'enabled' ? '停用' : '启用' }}
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    @click="handleEditScheme(row)"
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确认删除该分发方案吗？"
                    @confirm="handleDeleteScheme(row)"
                  >
                    <Button danger size="small" type="link">删除</Button>
                  </Popconfirm>
                </Space>
              </template>
            </SchemeGrid>
          </div>
        </Card>
      </div>
    </template>

    <template v-else-if="activeSection === 'tasks'">
      <Card :bordered="false">
        <div class="mb-4 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-4">
            <Typography.Text type="secondary">
              支持按模型、目标、状态筛选任务，并可对失败任务进行重试与导出。
            </Typography.Text>
            <Space>
              <Button
                :type="failedTasksOnly ? 'primary' : 'default'"
                @click="failedTasksOnly = !failedTasksOnly"
              >
                {{ failedTasksOnly ? '查看全部任务' : '仅看失败任务' }}
              </Button>
              <Button @click="handleExportTasks">导出任务</Button>
              <Popconfirm
                title="确认批量重试当前失败任务吗？"
                @confirm="handleRetryFailedTasks"
              >
                <Button>批量重试失败任务</Button>
              </Popconfirm>
            </Space>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <DatePicker.RangePicker
              v-model:value="taskDateRange"
              class="w-72"
              show-time
              value-format="YYYY-MM-DD HH:mm:ss"
            />
            <Select
              v-model:value="taskDefinitionFilter"
              allow-clear
              class="w-56"
              placeholder="按数据模型筛选"
              :options="definitionOptions"
            />
            <Select
              v-model:value="taskTargetFilter"
              allow-clear
              class="w-56"
              placeholder="按分发目标筛选"
              :options="targetOptions"
            />
            <Select
              v-model:value="taskStatusFilter"
              allow-clear
              class="w-40"
              placeholder="按状态筛选"
              :options="
                Object.entries(taskStatusMap).map(([value, meta]) => ({
                  label: meta.label,
                  value,
                }))
              "
            />
            <Button @click="handleResetTaskFilters">重置筛选</Button>
          </div>
        </div>

        <TaskGrid table-title="任务队列">
          <template #taskStatus="{ row }">
            <Tag :color="taskStatusMap[row.status]?.color">
              {{ taskStatusMap[row.status]?.label || row.status }}
            </Tag>
          </template>

          <template #action="{ row }">
            <Space>
              <Button
                size="small"
                type="link"
                :disabled="row.status === 'running'"
                @click="handleRetryTask(row)"
              >
                重试
              </Button>
            </Space>
          </template>
        </TaskGrid>
      </Card>
    </template>

    <template v-else>
      <Card :bordered="false">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <DatePicker.RangePicker
            v-model:value="logDateRange"
            class="w-72"
            show-time
            value-format="YYYY-MM-DD HH:mm:ss"
          />
          <Input
            v-model:value="logKeywordFilter"
            allow-clear
            class="w-72"
            placeholder="按日志内容关键字筛选"
          />
          <Select
            v-model:value="logLevelFilter"
            allow-clear
            class="w-40"
            placeholder="按级别筛选"
            :options="
              Object.entries(logLevelMap).map(([value, meta]) => ({
                label: meta.label,
                value,
              }))
            "
          />
          <Select
            v-model:value="logResultFilter"
            allow-clear
            class="w-40"
            placeholder="按结果筛选"
            :options="[
              { label: '成功', value: 'success' },
              { label: '失败', value: 'failed' },
            ]"
          />
          <Button @click="handleExportLogs">导出日志</Button>
          <Button @click="handleResetLogFilters">重置筛选</Button>
        </div>

        <LogGrid table-title="日志列表">
          <template #logLevel="{ row }">
            <Tag :color="logLevelMap[row.level]?.color">
              {{ logLevelMap[row.level]?.label || row.level }}
            </Tag>
          </template>

          <template #logResult="{ row }">
            <Tag v-if="row.success === true" color="success">成功</Tag>
            <Tag v-else-if="row.success === false" color="error">失败</Tag>
            <Tag v-else color="default">未知</Tag>
          </template>
          <template #action="{ row }">
            <Button size="small" type="link" @click="handleOpenLogDetail(row)">
              详情
            </Button>
          </template>
        </LogGrid>
      </Card>
    </template>
  </Page>
</template>
