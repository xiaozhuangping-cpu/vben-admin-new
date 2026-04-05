<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal } from '@vben/common-ui';
import {
  Button,
  message,
  Space,
  Tag,
  Modal,
  Table,
  Input,
} from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { h, ref } from 'vue';
import { useColumns, useAuditDetailColumns } from './data';

const MOCK_AUDITS = [
  {
    id: 'REQ-F01',
    model: '成品家具',
    operation: 'update',
    submitter: '李仓库',
    submitTime: '2024-04-01 10:20:00',
    status: 'pending',
    remark: '修改北欧布艺沙发长高尺寸',
    details: [
      { field: '高度', oldValue: '850mm', newValue: '900mm' },
      { field: '备注', oldValue: '无', newValue: '2024新款增加加固支撑' },
    ],
  },
  {
    id: 'REQ-M02',
    model: '原材料',
    operation: 'create',
    submitter: '王采购',
    submitTime: '2024-04-01 11:45:00',
    status: 'pending',
    remark: '新增板材: 缅甸花梨-AA级',
    details: [
      { field: '板材编码', oldValue: '空', newValue: 'WD-HUALI-001' },
      { field: '密度', oldValue: '空', newValue: '0.82g/cm³' },
    ],
  },
];

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_AUDITS,
};

const [Grid] = useVbenVxeGrid({
  gridOptions: {
    ...gridOptions,
    height: 'auto',
  },
});

const selectedAudit = ref<any>(null);
const [AuditModal, auditModalApi] = useVbenModal({
  title: '数据变更审核',
});

function handleOpenAudit(row: any) {
  selectedAudit.value = row;
  auditModalApi.open();
}

function handleApprove(row: any) {
  Modal.confirm({
    title: '确认通过审批？',
    content: `审核通过后，变更将实时应用到 [${row.model}] 主数据库。`,
    onOk() {
      message.success(`已核准审批单: ${row.id}`);
      auditModalApi.close();
    },
  });
}

function handleReject(row: any) {
  Modal.confirm({
    title: '驳回申请？',
    content: h('div', [
      h('p', '请输入驳回理由:'),
      h(Input.TextArea, { placeholder: '如: 数据不完整，请补充证明人' }),
    ]),
    onOk() {
      message.warning(`已驳回审批单: ${row.id}`);
      auditModalApi.close();
    },
  });
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="对主数据的创建、修改与失效申请进行集中化合规审计。只有经过授权的审核流程，数据变更才会最终生效进入黄金记录库。"
    title="数据审核中心"
  >
    <AuditModal>
      <div class="p-6">
        <div class="mb-4 flex justify-between">
          <div>
            单据号: <span class="font-bold">{{ selectedAudit?.id }}</span>
          </div>
          <div>
            申请人:
            <span class="text-blue-600">{{ selectedAudit?.submitter }}</span>
          </div>
        </div>
        <Table
          :columns="useAuditDetailColumns()"
          :data-source="selectedAudit?.details"
          :pagination="false"
        />

        <div class="mt-8 flex justify-end gap-4">
          <Button danger @click="() => handleReject(selectedAudit)">
            驳回申请
          </Button>
          <Button type="primary" @click="() => handleApprove(selectedAudit)">
            核准通过
          </Button>
        </div>
      </div>
    </AuditModal>

    <div class="flex-1 min-h-0">
      <Grid table-title="待办审核任务">
        <template #operation="{ row }">
          <Tag :color="row.operation === 'create' ? 'success' : 'processing'">
            {{ row.operation === 'create' ? '新增' : '更新' }}
          </Tag>
        </template>

        <template #status="{ row }">
          <Tag color="warning">待审核</Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button
              size="small"
              type="primary"
              ghost
              @click="handleOpenAudit(row)"
            >
              审核详情
            </Button>
            <Button
              size="small"
              type="link"
              @click="() => message.info('查看关联流转日志')"
            >
              日志
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
