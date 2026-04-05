<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { Table, Tag, Button, Space } from 'ant-design-vue';

const columns = [
  { title: '版本号', dataIndex: 'version', key: 'version' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '发布人', dataIndex: 'creator', key: 'creator' },
  { title: '发布时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '操作', key: 'action' },
];

const mockVersions = [
  {
    version: 'V1.0.2',
    status: '生效中',
    creator: 'Admin',
    createdAt: '2024-03-15 10:00:00',
    remark: '新增重量及图片属性',
  },
  {
    version: 'V1.0.1',
    status: '已废弃',
    creator: '张先生',
    createdAt: '2024-03-01 09:00:00',
    remark: '初始定义版本',
  },
];

const [Modal, modalApi] = useVbenModal({
  title: '版本历史追溯',
  footer: false,
});
</script>

<template>
  <Modal>
    <div class="p-4">
      <Table :columns="columns" :data-source="mockVersions" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === '生效中' ? 'green' : 'default'">
              {{ record.status }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small">查看定义</Button>
              <Button type="link" size="small" v-if="record.status !== '生效中'"
                >回滚</Button
              >
            </Space>
          </template>
        </template>
      </Table>
    </div>
  </Modal>
</template>
