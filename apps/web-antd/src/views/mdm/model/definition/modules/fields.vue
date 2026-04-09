<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';

import { Alert, Button, message, Space, Table, Tag } from 'ant-design-vue';

import {
  deleteModelFieldApi,
  getModelFieldListApi,
} from '#/api/mdm/model-definition';

import FieldFormModal from './field-form.vue';

const emit = defineEmits(['success']);

const loading = ref(false);
const currentData = ref<any>(null);
const fields = ref<any[]>([]);

const columns = [
  { dataIndex: 'name', key: 'name', title: '字段名称' },
  { dataIndex: 'code', key: 'code', title: '字段编码', width: 150 },
  { dataIndex: 'dataType', key: 'dataType', title: '数据类型', width: 120 },
  { dataIndex: 'length', key: 'length', title: '长度', width: 90 },
  { dataIndex: 'sort', key: 'sort', title: '排序', width: 90 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 100 },
  { key: 'action', title: '操作', width: 150 },
];

const [FieldForm, fieldFormModalApi] = useVbenModal({
  connectedComponent: FieldFormModal,
  destroyOnClose: true,
});

const title = computed(() => {
  const name = currentData.value?.name ?? '';
  return name ? `字段配置 - ${name}` : '字段配置';
});

const isPublished = computed(() => currentData.value?.status === 'published');

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
  if (isPublished.value) {
    message.warning('已发布模型不可直接维护字段，请先升级生成草稿版本。');
    return;
  }
  fieldFormModalApi
    .setData({
      ...row,
      definitionId: currentData.value.id,
      onSuccess: () => loadFields(),
    })
    .open();
}

async function handleDelete(row: any) {
  if (isPublished.value) {
    message.warning('已发布模型不可直接删除字段，请先升级生成草稿版本。');
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
        <Button :disabled="isPublished" type="primary" @click="openFieldForm()">
          新增字段
        </Button>
      </div>

      <Alert
        v-if="isPublished"
        class="mb-4"
        message="当前模型已发布，字段结构已锁定。请返回列表点击“升级”后，在新草稿版本中维护字段。"
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
            <template v-if="column.key === 'dataType'">
              <Tag color="blue">{{ record.dataType }}</Tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <Tag :color="record.status ? 'green' : 'default'">
                {{ record.status ? '启用' : '停用' }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button
                  :disabled="isPublished"
                  size="small"
                  type="link"
                  @click="openFieldForm(record)"
                >
                  编辑
                </Button>
                <Button
                  :disabled="isPublished"
                  danger
                  size="small"
                  type="link"
                  @click="handleDelete(record)"
                >
                  删除
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
