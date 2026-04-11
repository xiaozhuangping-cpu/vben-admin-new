<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { Alert, Button, message, Space, Table, Tag } from 'ant-design-vue';

import {
  deleteModelFieldApi,
  getModelFieldListApi,
  updateModelFieldEnabledApi,
} from '#/api/mdm/model-definition';

import FieldFormModal from './field-form.vue';

const emit = defineEmits(['success']);

const loading = ref(false);
const currentData = ref<any>(null);
const fields = ref<any[]>([]);

const fieldTypeMap: Record<string, string> = {
  attachment: '附件',
  boolean: '布尔',
  date: '日期',
  int4: '整数',
  dict: '\u5B57\u5178',
  numeric: '数值',
  relation_master: '\u5173\u8054\u4E3B\u6570\u636E',
  text: '长文本',
  timestamptz: '日期时间',
  varchar: '短文本',
};

const columns = [
  { dataIndex: 'name', key: 'name', title: '字段名称' },
  { dataIndex: 'code', key: 'code', title: '字段编码', width: 150 },
  { dataIndex: 'dataType', key: 'dataType', title: '数据类型', width: 120 },
  { dataIndex: 'length', key: 'length', title: '长度', width: 90 },
  {
    dataIndex: 'validationRuleName',
    key: 'validationRuleName',
    title: '校验规则',
    width: 160,
  },
  { dataIndex: 'sort', key: 'sort', title: '排序', width: 90 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 100 },
  { key: 'action', title: '操作', width: 210 },
];

const [FieldForm, fieldFormModalApi] = useVbenModal({
  connectedComponent: FieldFormModal,
  destroyOnClose: true,
});

const title = computed(() => {
  const name = currentData.value?.name ?? '';
  return name ? `字段配置 - ${name}` : '字段配置';
});

const canAddOrEdit = computed(() =>
  ['draft', 'revised'].includes(currentData.value?.status),
);
const canDelete = computed(() => currentData.value?.status === 'draft');

async function loadFields() {
  if (!currentData.value?.id) {
    fields.value = [];
    return;
  }
  loading.value = true;
  try {
    fields.value = await getModelFieldListApi(currentData.value.id);
  } finally {
    loading.value = false;
  }
}

function openFieldForm(row?: any) {
  if (row?.systemField) {
    message.warning('系统默认字段不允许编辑维护。');
    return;
  }
  if (!canAddOrEdit.value) {
    message.warning('当前状态不可直接维护字段，请先发起升级。');
    return;
  }
  fieldFormModalApi
    .setData({
      ...row,
      definitionId: currentData.value.id,
      definitionStatus: currentData.value.status,
      onSuccess: () => loadFields(),
    })
    .open();
}

async function handleDelete(row: any) {
  if (row.systemField) {
    message.warning('系统默认字段不允许删除。');
    return;
  }
  if (!canDelete.value) {
    message.warning('只有草稿状态才允许删除字段。');
    return;
  }
  try {
    await deleteModelFieldApi(row.id);
    message.success(`已删除字段: ${row.name}`);
    await loadFields();
    emit('success');
  } catch {
    message.error('删除字段失败');
  }
}

async function handleToggleEnabled(row: any, status: boolean) {
  if (row.systemField) {
    message.warning('系统默认字段不允许启用或禁用。');
    return;
  }
  if (!canAddOrEdit.value) {
    message.warning('当前状态不可调整字段启停用。');
    return;
  }

  try {
    await updateModelFieldEnabledApi(row.id, status);
    message.success(status ? '字段已启用' : '字段已禁用');
    await loadFields();
  } catch {
    message.error(status ? '启用失败' : '禁用失败');
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[92vw] max-w-[1280px]',
  contentClass: 'overflow-hidden',
  placement: 'right',
  footer: false,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return;
    }
    currentData.value = drawerApi.getData<any>() || {};
    await loadFields();
  },
});
</script>

<template>
  <Drawer :title="title">
    <div class="flex h-full flex-col px-6 py-5">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="text-sm font-medium">
            为当前数据模型维护字段结构，发布时将按这些字段动态生成业务表。
          </div>
          <div class="text-text-secondary mt-1 text-xs">
            已发布模型不可直接新增、编辑或删除字段；如需调整，请先执行“升级”生成新草稿版本。
          </div>
        </div>
        <Button
          :disabled="!canAddOrEdit"
          type="primary"
          @click="openFieldForm()"
        >
          新增字段
        </Button>
      </div>

      <Alert
        v-if="!canAddOrEdit"
        class="mb-4"
        message="当前模型不是草稿/升级状态，字段结构已锁定。请返回列表发起升级后再维护字段。"
        show-icon
        type="warning"
      />

      <div
        class="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background"
      >
        <Table
          :columns="columns"
          :data-source="fields"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 980, y: 'calc(100vh - 280px)' }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <Space>
                <span>{{ record.name }}</span>
                <Tag v-if="record.systemField" color="gold">系统</Tag>
              </Space>
            </template>
            <template v-else-if="column.key === 'dataType'">
              <Tag color="blue">
                {{ fieldTypeMap[record.dataType] ?? record.dataType }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <Tag :color="record.status ? 'green' : 'default'">
                {{ record.status ? '启用' : '停用' }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button
                  :disabled="!canAddOrEdit || record.systemField"
                  size="small"
                  type="link"
                  @click="openFieldForm(record)"
                >
                  编辑
                </Button>
                <Button
                  v-if="canDelete && !record.systemField"
                  danger
                  size="small"
                  type="link"
                  @click="handleDelete(record)"
                >
                  删除
                </Button>
                <Button
                  v-if="canAddOrEdit && !record.systemField && !record.status"
                  size="small"
                  type="link"
                  @click="handleToggleEnabled(record, true)"
                >
                  启用
                </Button>
                <Button
                  v-if="canAddOrEdit && !record.systemField && record.status"
                  size="small"
                  type="link"
                  @click="handleToggleEnabled(record, false)"
                >
                  禁用
                </Button>
              </Space>
            </template>
          </template>
        </Table>
      </div>
    </div>

    <FieldForm @success="loadFields" />
  </Drawer>
</template>
