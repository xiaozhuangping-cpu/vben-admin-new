<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';
import { Ellipsis, Plus } from '@vben/icons';

import {
  Button,
  Card,
  Col,
  Dropdown,
  Menu,
  message,
  Row,
  Space,
  Tag,
  Tree,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { useColumns } from './data';
import AuthModal from './modules/auth.vue';
import ModelFormModal from './modules/form.vue';
import VersionModal from './modules/version.vue';

const THEME_TREE_DATA = [
  {
    key: 'marketing',
    title: '一、营销类主数据',
    children: [
      { key: 'marketing-01', title: '1、电商平台' },
      { key: 'marketing-02', title: '2、电商店铺' },
    ],
  },
  {
    key: 'supply-chain',
    title: '二、供应链主数据',
    children: [
      { key: 'supply-01', title: '1、供应商' },
      { key: 'supply-02', title: '2、公司主体' },
    ],
  },
  {
    key: 'finance',
    title: '三、财务类主数据',
    children: [
      { key: 'finance-01', title: '1、币种' },
      { key: 'finance-02', title: '2、汇率' },
      { key: 'finance-03', title: '3、费用项目' },
      { key: 'finance-04', title: '4、支付渠道' },
    ],
  },
  {
    key: 'admin',
    title: '四、行政类主数据',
    children: [
      { key: 'admin-01', title: '1、组织机构' },
      { key: 'admin-02', title: '2、员工' },
      { key: 'admin-03', title: '3、账号' },
    ],
  },
  {
    key: 'general',
    title: '五、通用类主数据',
    children: [
      { key: 'general-01', title: '1、国家' },
      { key: 'general-02', title: '2、地区' },
      { key: 'general-03', title: '3、仓库' },
      { key: 'general-04', title: '4、物流渠道' },
    ],
  },
];

const MASTER_DATA_ITEMS = [
  {
    code: 'MDM_EPLATFORM',
    name: '电商平台',
    org: '营销中心',
    table: 'mdm_e_platform',
  },
  {
    code: 'MDM_ESTORE',
    name: '电商店铺',
    org: '营销中心',
    table: 'mdm_e_store',
  },
  {
    code: 'MDM_SUPPLIER',
    name: '供应商',
    org: '供应链部',
    table: 'mdm_supplier',
  },
  {
    code: 'MDM_LEGAL_ENTITY',
    name: '公司主体',
    org: '集团财务',
    table: 'mdm_legal_entity',
  },
  {
    code: 'MDM_CURRENCY',
    name: '币种',
    org: '财务中心',
    table: 'mdm_currency',
  },
  {
    code: 'MDM_EXRATE',
    name: '汇率',
    org: '财务中心',
    table: 'mdm_exchange_rate',
  },
  {
    code: 'MDM_EXPENSE_ITEM',
    name: '费用项目',
    org: '财务中心',
    table: 'mdm_expense_item',
  },
  {
    code: 'MDM_PAYMENT_CH',
    name: '支付渠道',
    org: '财务中心',
    table: 'mdm_payment_channel',
  },
  {
    code: 'MDM_ORG',
    name: '组织机构',
    org: '行政人力',
    table: 'mdm_organization',
  },
  {
    code: 'MDM_EMPLOYEE',
    name: '员工',
    org: '行政人力',
    table: 'mdm_employee',
  },
  {
    code: 'MDM_ACCOUNT',
    name: '账号',
    org: '信息技术',
    table: 'mdm_account',
  },
  { code: 'MDM_COUNTRY', name: '国家', org: '通用支撑', table: 'mdm_country' },
  { code: 'MDM_REGION', name: '地区', org: '通用支撑', table: 'mdm_region' },
  {
    code: 'MDM_WAREHOUSE',
    name: '仓库',
    org: '供应链部',
    table: 'mdm_warehouse',
  },
  {
    code: 'MDM_LOGISTICS_CH',
    name: '物流渠道',
    org: '供应链部',
    table: 'mdm_logistics_channel',
  },
];

const MOCK_MODELS = MASTER_DATA_ITEMS.map((item, index) => {
  return {
    code: item.code,
    id: `${index + 1}`,
    isAudit: true,
    name: item.name,
    org: item.org,
    status: ['draft', 'published', 'revision', 'archived'][index % 4],
    tableName: item.table,
    type: ['normal', 'composite', 'inherited', 'related'][index % 4],
    version: 'v1.0.0',
  };
});

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  archived: { color: 'default', label: '已归档' },
  draft: { color: 'warning', label: '草稿' },
  published: { color: 'success', label: '已发布' },
  revision: { color: 'processing', label: '修订中' },
};

const TYPE_MAP: Record<string, { color: string; label: string }> = {
  composite: { color: 'purple', label: '组合' },
  inherited: { color: 'cyan', label: '继承' },
  normal: { color: 'blue', label: '普通' },
  related: { color: 'orange', label: '关联' },
};

const [Form, formModalApi] = useVbenModal({
  connectedComponent: ModelFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_MODELS,
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const [Grid] = useVbenVxeGrid({
  gridOptions,
});

const [Version, versionModalApi] = useVbenModal({
  connectedComponent: VersionModal,
});

const [Auth, authModalApi] = useVbenModal({
  connectedComponent: AuthModal,
});

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleConfigFields(row: any) {
  message.info(`管理字段: ${row.name}`);
}

function handleAuthorize(row: any) {
  authModalApi.setData(row).open();
}

function handleVersionHistory(row: any) {
  versionModalApi.setData(row).open();
}

function handleDelete(row: any) {
  message.warning(`删除模型: ${row.name}`);
}

function handleThemeAction(action: string) {
  message.info(`主题操作: ${action}`);
}

function refreshGrid() {
  message.success('更新成功');
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="在选定的主题下定义主数据模型，包括模型结构、版本状态及其关联关系。支持模型生命周期管理、字段分组配置及对外接口同步。"
    title="模型管理"
  >
    <Row :gutter="16" class="split-layout">
      <!-- 左侧主题树 -->
      <Col :span="6" class="split-side">
        <Card
          :body-style="{ padding: '12px' }"
          class="split-card"
          title="数据主题"
        >
          <template #extra>
            <Space>
              <Button
                size="small"
                type="link"
                @click="handleThemeAction('新增')"
              >
                <Plus class="size-4" />
              </Button>
            </Space>
          </template>
          <Tree :tree-data="THEME_TREE_DATA" default-expand-all />
        </Card>
      </Col>

      <!-- 右侧模型列表 -->
      <Col :span="18" class="split-main">
        <div class="split-main__content">
          <Grid table-title="详情列表">
            <template #toolbar-tools>
              <Button type="primary" @click="handleCreate"> 新增模型 </Button>
            </template>

            <template #type="{ row }">
              <Tag :color="TYPE_MAP[row.type]?.color">
                {{ TYPE_MAP[row.type]?.label }}
              </Tag>
            </template>

            <template #status="{ row }">
              <Tag :color="STATUS_MAP[row.status]?.color">
                {{ STATUS_MAP[row.status]?.label }}
              </Tag>
            </template>

            <template #action="{ row }">
              <Space>
                <Button size="small" type="link" @click="handleEdit(row)">
                  编辑
                </Button>
                <Button
                  size="small"
                  type="link"
                  @click="handleConfigFields(row)"
                >
                  字段
                </Button>
                <Dropdown>
                  <Button size="small" type="link">
                    更多 <Ellipsis class="size-4" />
                  </Button>
                  <template #overlay>
                    <Menu>
                      <Menu.Item @click="handleAuthorize(row)">
                        授权管理
                      </Menu.Item>
                      <Menu.Item @click="handleVersionHistory(row)">
                        版本历史
                      </Menu.Item>
                      <Menu.Item class="text-error" @click="handleDelete(row)">
                        删除
                      </Menu.Item>
                    </Menu>
                  </template>
                </Dropdown>
              </Space>
            </template>
          </Grid>
        </div>
      </Col>
    </Row>

    <Form @success="refreshGrid" />
    <Auth />
    <Version />
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

.text-error {
  color: #ff4d4f;
}
</style>
