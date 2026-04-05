<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal } from '@vben/common-ui';
import { Button, message, Space, Tag, Alert } from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { Plus } from '@vben/icons';
import { useColumns } from './data';
import NumberingFormModal from './modules/form.vue';

const MOCK_RULES = [
  {
    id: '1',
    model: '成品家具 (FINISH)',
    prefix: 'FURN',
    rule: 'FURN-YYYYMM-0001',
    seqLength: 6,
    currentValue: 'FURN-202404-000012',
  },
  {
    id: '2',
    model: '核心配件 (HARDWARE)',
    prefix: 'HW',
    rule: 'HW-000001',
    seqLength: 8,
    currentValue: 'HW-00000852',
  },
];

const [Form, formModalApi] = useVbenModal({
  connectedComponent: NumberingFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_RULES,
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
};

const [Grid] = useVbenVxeGrid({
  gridOptions: {
    ...gridOptions,
    height: 'auto',
  },
});

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleReset(row: any) {
  message.info(`流水号重置: ${row.model}`);
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="为主数据定义全生命周期内的唯一编码规则。支持灵活配置固定前缀、日期变量及自动递增的流水号，确保业务记录的唯一性。"
    title="编码管理"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">
        <Plus class="size-4" /> 新增规则
      </Button>
    </template>

    <div class="mb-4">
      <Alert
        message="提示：变更编码规则可能会导致已有数据的关联失效，请在业务空窗期进行并确认旧数据的兼容性。"
        type="warning"
        show-icon
      />
    </div>

    <Form @success="() => Grid.reload()" />

    <div class="flex-1 min-h-0">
      <Grid table-title="编码定义">
        <template #preview="{ row }">
          <Tag color="purple">{{ row.currentValue }}</Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)"
              >编辑</Button
            >
            <Button size="small" type="link" @click="handleReset(row)"
              >重置流水</Button
            >
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
