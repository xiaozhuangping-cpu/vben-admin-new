<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal } from '@vben/common-ui';
import {
  Button,
  message,
  Space,
  Tag,
  Row,
  Col,
  Card,
  Tree,
} from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { Plus } from '@vben/icons';
import { useColumns } from './data';
import RuleFormModal from './modules/form.vue';

const MOCK_RULES = [
  {
    id: '1',
    model: '客户主体 (CUSTOMER)',
    field: 'EMAIL',
    name: '邮箱格式校验',
    type: 'regex',
    rule: '^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$',
    msg: '请输入有效的电子邮箱地址',
    status: true,
  },
  {
    id: '2',
    model: '物料主数据 (MATERIAL)',
    field: 'CODE',
    name: '编码唯一性',
    type: 'unique',
    rule: 'Global.Unique',
    msg: '该物料编码已存在',
    status: true,
  },
  {
    id: '3',
    model: '基础信息 (BASE)',
    field: 'WEIGHT',
    name: '重量范围',
    type: 'range',
    rule: '[0, 1000]',
    msg: '重量必须在 0 到 1000 之间',
    status: false,
  },
];

const THEME_TREE = [
  { title: '客户主题', key: 'customer' },
  { title: '物料主题', key: 'material' },
  { title: '员工主题', key: 'employee' },
];

const [Form, formModalApi] = useVbenModal({
  connectedComponent: RuleFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_RULES,
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
};

const [Grid] = useVbenVxeGrid({
  gridOptions,
});

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleDelete(row: any) {
  message.warning(`删除校验规则: ${row.name}`);
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="为模型字段配置校验规则（正则表达式、唯一性、范围等），在数据录入阶段进行前置拦截，确保主数据的准确性与合法性。"
    title="校验规则"
  >
    <Row :gutter="16" class="split-layout">
      <Col :span="5" class="split-side">
        <Card title="主题树" class="split-card">
          <Tree :tree-data="THEME_TREE" default-expand-all />
        </Card>
      </Col>
      <Col :span="19" class="split-main">
        <div class="split-main__content">
          <Grid table-title="规则定义">
            <template #toolbar-tools>
              <Button type="primary" @click="handleCreate">
                <Plus class="size-4" /> 新增规则
              </Button>
            </template>

            <template #type="{ row }">
              <Tag color="blue">{{ row.type.toUpperCase() }}</Tag>
            </template>

            <template #status="{ row }">
              <Tag :color="row.status ? 'success' : 'error'">
                {{ row.status ? '启用' : '禁用' }}
              </Tag>
            </template>

            <template #action="{ row }">
              <Space>
                <Button size="small" type="link" @click="handleEdit(row)"
                  >编辑</Button
                >
                <Button
                  danger
                  size="small"
                  type="link"
                  @click="handleDelete(row)"
                  >删除</Button
                >
              </Space>
            </template>
          </Grid>
        </div>
      </Col>
    </Row>

    <Form @success="() => Grid.reload()" />
  </Page>
</template>

<style scoped>
.split-layout {
  flex-wrap: nowrap;
  height: 100%;
  min-height: 0;
}

.split-side,
.split-main {
  display: flex;
  min-height: 0;
}

.split-main {
  flex-direction: column;
  min-width: 0;
}

.split-main__content {
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.split-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.split-card :deep(.ant-card-head) {
  flex-shrink: 0;
}

.split-card :deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
