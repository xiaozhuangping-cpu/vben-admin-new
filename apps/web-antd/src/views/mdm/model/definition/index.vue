<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';

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
import { Ellipsis, Plus } from '@vben/icons';

import { useColumns } from './data';
import ModelFormModal from './modules/form.vue';
import AuthModal from './modules/auth.vue';
import VersionModal from './modules/version.vue';

const THEME_TREE_DATA = [
  {
    key: '0-0',
    title: '智能家具 (FURNITURE)',
    children: [
      { key: '0-0-0', title: '智能睡床' },
      { key: '0-0-1', title: '电动沙发' },
      { key: '0-0-2', title: '人体工学椅' },
    ],
  },
  {
    key: '0-1',
    title: '智能家电 (APPLIANCE)',
    children: [
      { key: '0-1-0', title: '扫地机器人' },
      { key: '0-1-1', title: '环境调节器' },
    ],
  },
  {
    key: '0-2',
    title: '传感感知 (iot)',
    children: [
      { key: '0-2-0', title: '视觉传感器' },
      { key: '0-2-1', title: '环境监测仪' },
    ],
  },
];

const PRODUCT_MODELS = [
  { name: '智能洗地机 X9 Pro', code: 'WASH_X9_P', table: 'MDM_SCRUBBER_X9' },
  {
    name: '毫米波雷达人体感应器',
    code: 'RADAR_MMW_01',
    table: 'MDM_SENSOR_RADAR',
  },
  {
    name: '全向智能窗帘电机',
    code: 'CURTAIN_M_02',
    table: 'MDM_MOTOR_CURTAIN',
  },
  { name: '嵌入式 8 键触控屏', code: 'PANEL_LCD_8', table: 'MDM_PANEL_TOUCH' },
  { name: '智能变频冷风扇', code: 'FAN_FREQ_AC', table: 'MDM_DEVICE_FAN' },
  { name: '指纹猫眼智能门锁', code: 'LOCK_EYE_05', table: 'MDM_LOCK_SECURITY' },
  {
    name: '直饮水滤芯监测仪',
    code: 'WATER_FILTER_A',
    table: 'MDM_FILTER_WATCH',
  },
];

const MOCK_MODELS = Array.from({ length: 40 }).map((_, index) => {
  const base = PRODUCT_MODELS[index % PRODUCT_MODELS.length];
  return {
    id: `${index + 1}`,
    code: index < PRODUCT_MODELS.length ? base.code : `${base.code}_${index}`,
    name:
      index < PRODUCT_MODELS.length
        ? base.name
        : `${base.name} Gen.${Math.floor(index / 7)}`,
    tableName: index < PRODUCT_MODELS.length ? base.table : `${base.table}_EXT`,
    version: `v${Math.floor(index / 5) + 1}.${index % 5}.0`,
    type: ['normal', 'composite', 'inherited', 'related'][index % 4],
    status: ['draft', 'published', 'revision', 'archived'][index % 4],
    isAudit: index % 2 === 0,
    org:
      index % 3 === 0
        ? '智能清洁部'
        : index % 3 === 1
          ? '智能控制部'
          : 'iot感知中心',
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
