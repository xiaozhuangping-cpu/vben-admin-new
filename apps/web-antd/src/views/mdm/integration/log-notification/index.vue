<script lang="ts" setup>
import type { LogNotificationRule } from '#/api/mdm/log-notification';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createLogNotificationRuleApi,
  deleteLogNotificationRuleApi,
  getLogNotificationRuleListApi,
  updateLogNotificationRuleApi,
} from '#/api/mdm/log-notification';
import { getUserGroupListApi } from '#/api/mdm/user-group';

defineOptions({ name: 'MdmIntegrationLogNotificationPage' });

const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const rules = ref<LogNotificationRule[]>([]);
const groupOptions = ref<Array<{ label: string; value: string }>>([]);
const editingId = ref('');

const formState = reactive<LogNotificationRule>({
  category: 'distribution',
  channel: 'site_message',
  groupIds: [],
  level: 'error',
  remark: '',
  status: true,
});

const categoryMap = {
  collection: { color: 'blue', label: '归集日志' },
  distribution: { color: 'purple', label: '分发日志' },
} as const;

const levelMap = {
  error: { color: 'error', label: '错误' },
  info: { color: 'processing', label: '信息' },
  warning: { color: 'warning', label: '警告' },
} as const;

const channelMap = {
  dingtalk: { color: 'gold', label: '钉钉消息' },
  site_message: { color: 'success', label: '站内消息' },
} as const;

const columns = computed(() => [
  { dataIndex: 'category', key: 'category', title: '日志分类', width: 140 },
  { dataIndex: 'level', key: 'level', title: '日志级别', width: 120 },
  { dataIndex: 'channel', key: 'channel', title: '提醒方式', width: 140 },
  { dataIndex: 'groupNames', key: 'groupNames', title: '接收组' },
  { dataIndex: 'status', key: 'status', title: '状态', width: 100 },
  { dataIndex: 'remark', key: 'remark', title: '备注' },
  {
    dataIndex: 'action',
    key: 'action',
    title: '操作',
    width: 180,
    fixed: 'right',
  },
]);

function resetForm() {
  editingId.value = '';
  formState.category = 'distribution';
  formState.channel = 'site_message';
  formState.groupIds = [];
  formState.level = 'error';
  formState.remark = '';
  formState.status = true;
}

function openCreate() {
  resetForm();
  modalOpen.value = true;
}

function openEdit(rule: LogNotificationRule) {
  editingId.value = String(rule.id || '');
  formState.category = rule.category;
  formState.channel = rule.channel;
  formState.groupIds = [...rule.groupIds];
  formState.level = rule.level;
  formState.remark = rule.remark ?? '';
  formState.status = rule.status;
  modalOpen.value = true;
}

async function loadGroups() {
  const result = await getUserGroupListApi({
    page: 1,
    pageSize: 1000,
    status: 'eq.true',
  });

  groupOptions.value = result.items.map((item: any) => ({
    label: item.name,
    value: String(item.id),
  }));
}

async function loadRules() {
  loading.value = true;
  try {
    const result = await getLogNotificationRuleListApi({
      page: 1,
      pageSize: 200,
    });
    rules.value = result.items;
  } catch (error: any) {
    message.error(error?.message || '加载日志提醒配置失败');
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (formState.groupIds.length === 0) {
    message.warning('请至少选择一个接收组');
    return;
  }

  saving.value = true;
  try {
    const payload: LogNotificationRule = {
      category: formState.category,
      channel: formState.channel,
      groupIds: [...formState.groupIds],
      level: formState.level,
      remark: formState.remark ?? '',
      status: formState.status,
    };

    if (editingId.value) {
      await updateLogNotificationRuleApi(editingId.value, payload);
      message.success('日志提醒配置已更新');
    } else {
      await createLogNotificationRuleApi(payload);
      message.success('日志提醒配置已创建');
    }

    modalOpen.value = false;
    resetForm();
    await loadRules();
  } catch (error: any) {
    message.error(error?.message || '保存日志提醒配置失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(rule: LogNotificationRule) {
  try {
    await deleteLogNotificationRuleApi(String(rule.id));
    message.success('日志提醒配置已删除');
    await loadRules();
  } catch (error: any) {
    message.error(error?.message || '删除日志提醒配置失败');
  }
}

onMounted(async () => {
  await Promise.all([loadGroups(), loadRules()]);
});
</script>

<template>
  <Page
    auto-content-height
    content-class="p-4"
    description="按照日志分类、日志级别和提醒方式配置接收组，日志入库后会按规则动态命中并发出提醒。"
    title="日志提醒配置"
  >
    <template #extra>
      <Space>
        <Button @click="loadRules">
          <template #icon>
            <IconifyIcon icon="lucide:rotate-cw" />
          </template>
          刷新
        </Button>
        <Button type="primary" @click="openCreate">
          <template #icon>
            <IconifyIcon icon="lucide:plus" />
          </template>
          新增配置
        </Button>
      </Space>
    </template>

    <Card :bordered="false">
      <Table
        :columns="columns"
        :data-source="rules"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1100 }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'category'">
            <Tag :color="categoryMap[record.category]?.color">
              {{ categoryMap[record.category]?.label || record.category }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'level'">
            <Tag :color="levelMap[record.level]?.color">
              {{ levelMap[record.level]?.label || record.level }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'channel'">
            <Tag :color="channelMap[record.channel]?.color">
              {{ channelMap[record.channel]?.label || record.channel }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'groupNames'">
            <span>{{ (record.groupNames || []).join('、') || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status ? 'success' : 'default'">
              {{ record.status ? '启用' : '停用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button size="small" type="link" @click="openEdit(record)">
修改
</Button>
              <Popconfirm
                title="确认删除该日志提醒配置吗？"
                @confirm="handleDelete(record)"
              >
                <Button danger size="small" type="link">删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="modalOpen"
      :confirm-loading="saving"
      :title="editingId ? '修改日志提醒配置' : '新增日志提醒配置'"
      width="640px"
      @cancel="resetForm"
      @ok="handleSubmit"
    >
      <Form layout="vertical">
        <Form.Item label="日志分类" required>
          <Select
            v-model:value="formState.category"
            :options="[
              { label: '归集日志', value: 'collection' },
              { label: '分发日志', value: 'distribution' },
            ]"
          />
        </Form.Item>
        <Form.Item label="日志级别" required>
          <Select
            v-model:value="formState.level"
            :options="[
              { label: '错误', value: 'error' },
              { label: '信息', value: 'info' },
              { label: '警告', value: 'warning' },
            ]"
          />
        </Form.Item>
        <Form.Item label="提醒方式" required>
          <Select
            v-model:value="formState.channel"
            :options="[
              { label: '站内消息', value: 'site_message' },
              { label: '钉钉消息', value: 'dingtalk' },
            ]"
          />
        </Form.Item>
        <Form.Item label="接收组" required>
          <Select
            v-model:value="formState.groupIds"
            mode="multiple"
            placeholder="请选择接收组"
            :options="groupOptions"
          />
        </Form.Item>
        <Form.Item label="备注">
          <Input.TextArea
            v-model:value="formState.remark"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            placeholder="补充说明该规则的用途，例如生产环境失败告警。"
          />
        </Form.Item>
        <Form.Item label="启用状态">
          <Switch v-model:checked="formState.status" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
