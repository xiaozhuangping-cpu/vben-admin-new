<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal } from '@vben/common-ui';
import { Button, message, Space, Tag, Modal, Table } from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { h, ref } from 'vue';
import { useColumns } from './data';

const MOCK_VERSIONS = [
  {
    id: '1',
    modelName: '客户主体 (CUSTOMER)',
    version: 'V1.0.2',
    status: 'active',
    publishTime: '2024-03-25 10:00:00',
    publisher: 'Admin',
    remark: '新增重量与图片属性字段',
  },
  {
    id: '2',
    modelName: '客户主体 (CUSTOMER)',
    version: 'V1.0.1',
    status: 'deprecated',
    publishTime: '2024-03-10 09:12:00',
    publisher: '张先生',
    remark: '基础字段定义',
  },
  {
    id: '3',
    modelName: '物料主数据 (MATERIAL)',
    version: 'V2.1.0',
    status: 'active',
    publishTime: '2024-03-28 14:00:00',
    publisher: 'Admin',
    remark: '主数据结构大型变更，支持多单位引用',
  },
];

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_VERSIONS,
  height: 'auto',
};

const [Grid] = useVbenVxeGrid({
  gridOptions,
});

function handleCompare(row: any) {
  message.info(`正在生成版本比对报告: ${row.version}`);
}

function handleRollback(row: any) {
  Modal.confirm({
    title: '确认回滚版本？',
    content: `系统将根据版本 [${row.version}] 还原模型定义，当前生效版本将变为废弃状态。`,
    onOk() {
      message.loading('正在重构底层数据结构...', 1.5).then(() => {
        message.success(`模型已成功回滚至版本: ${row.version}`);
      });
    },
  });
}

function handleViewDefinition(row: any) {
  message.info(`查看 [${row.version}] 的快照定义`);
}
</script>

<template>
  <Page
    auto-content-height
    description="管理主数据模型的全生命周期版本。支持版本比对、旧版本回滚及其历史修订记录的追溯，确保模型变更的可控性。"
    title="模型版本管理"
  >
    <template #extra>
      <Space>
        <Button @click="() => message.info('版本导出')"> 批量导出 </Button>
        <Button type="primary" @click="() => message.info('模型快照')">
          保存当前快照
        </Button>
      </Space>
    </template>

    <Grid table-title="版本列表">
      <template #version="{ row }">
        <Tag color="blue">{{ row.version }}</Tag>
      </template>

      <template #status="{ row }">
        <Tag :color="row.status === 'active' ? 'success' : 'default'">
          {{ row.status === 'active' ? '当前生效' : '历史快照' }}
        </Tag>
      </template>

      <template #action="{ row }">
        <Space>
          <Button size="small" type="link" @click="handleCompare(row)"
            >比对</Button
          >
          <Button size="small" type="link" @click="handleViewDefinition(row)"
            >详情</Button
          >
          <Button
            v-if="row.status !== 'active'"
            size="small"
            type="link"
            danger
            @click="handleRollback(row)"
            >回滚</Button
          >
        </Space>
      </template>
    </Grid>
  </Page>
</template>
