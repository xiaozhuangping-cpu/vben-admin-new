<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Space, Table, Tag } from 'ant-design-vue';

import { getModelVersionListApi } from '#/api/mdm/model-definition';
import { formatDateTime } from '#/utils/date';

const columns = [
  {
    title: '版本号',
    dataIndex: 'versionLabel',
    key: 'versionLabel',
    width: 120,
  },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作类型', dataIndex: 'actionType', key: 'actionType', width: 140 },
  { title: '发布时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '数据表', dataIndex: 'tableName', key: 'tableName', width: 220 },
  { title: '操作', key: 'action', width: 120 },
];

const loading = ref(false);
const versions = ref<any[]>([]);

const [Modal, modalApi] = useVbenModal({
  title: '版本历史追溯',
  footer: false,
  modalProps: {
    width: 980,
  },
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData<any>() || {};
    if (!data.id) {
      versions.value = [];
      return;
    }
    loading.value = true;
    try {
      versions.value = await getModelVersionListApi(data.id);
    } finally {
      loading.value = false;
    }
  },
});
</script>

<template>
  <Modal>
    <div class="p-4">
      <Table
        :columns="columns"
        :data-source="versions"
        :loading="loading"
        :pagination="false"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'published' ? 'green' : 'default'">
              {{ record.status }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small">查看定义</Button>
            </Space>
          </template>
        </template>
      </Table>
    </div>
  </Modal>
</template>
