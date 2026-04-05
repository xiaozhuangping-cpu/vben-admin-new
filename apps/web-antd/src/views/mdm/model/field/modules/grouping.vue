<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { Table, Button, Space, Input, message } from 'ant-design-vue';
import { ref } from 'vue';
import { Plus } from '@vben/icons';

const columns = [
  { title: '组名', dataIndex: 'name', key: 'name' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '字段数', dataIndex: 'count', key: 'count' },
  { title: '操作', key: 'action' },
];

const mockGroups = ref([
  {
    id: '1',
    name: '基础属性',
    description: '包含编码、名称等核心字段',
    count: 5,
  },
  {
    id: '2',
    name: '拓展信息',
    description: '用于展示业务特定的额外数据',
    count: 12,
  },
]);

const [Modal, modalApi] = useVbenModal({
  title: '字段分组管理',
  footer: false,
});

function handleAddGroup() {
  message.info('新增分组配置');
}
</script>

<template>
  <Modal>
    <div class="p-4">
      <div class="flex justify-between items-center mb-4">
        <Input.Search placeholder="搜索分组..." style="width: 200px" />
        <Button type="primary" @click="handleAddGroup">
          <Plus class="size-4" /> 新增分组
        </Button>
      </div>
      <Table :columns="columns" :data-source="mockGroups" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small">编辑</Button>
              <Button type="link" size="small" danger>删除</Button>
            </Space>
          </template>
        </template>
      </Table>
    </div>
  </Modal>
</template>
