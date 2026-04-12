<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Select, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { ArrowUpToLine, Plus, SvgDownloadIcon } from '@vben/icons';

import { useColumns } from './data';
import FieldFormModal from './modules/form.vue';
import ImportModal from './modules/import.vue';
import GroupingModal from './modules/grouping.vue';

const MOCK_FIELDS = [
  {
    code: 'F_BRAND',
    dataType: 'String',
    id: '1',
    length: 64,
    name: '所属品牌',
    status: true,
  },
  {
    code: 'F_PROTOCOL',
    dataType: 'String',
    id: '2',
    length: 32,
    name: '通信协议',
    status: true,
  },
  {
    code: 'F_POWER',
    dataType: 'Number',
    id: '3',
    length: 10,
    name: '额定功率 (W)',
    precision: 1,
    status: true,
  },
  {
    code: 'F_MAC_ADDR',
    dataType: 'String',
    id: '4',
    length: 17,
    name: 'MAC 地址',
    status: true,
  },
  {
    code: 'F_FIRMWARE',
    dataType: 'String',
    id: '5',
    length: 32,
    name: '当前固件版本',
    status: true,
  },
];

const DATA_TYPE_COLOR: Record<string, string> = {
  Date: 'cyan',
  File: 'purple',
  Image: 'magenta',
  Number: 'blue',
  String: 'green',
  Time: 'orange',
};

const [Form, formModalApi] = useVbenModal({
  connectedComponent: FieldFormModal,
  destroyOnClose: true,
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_FIELDS,
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
  gridOptions: {
    ...gridOptions,
    height: 'auto',
  },
});

const [Import, importModalApi] = useVbenModal({
  connectedComponent: ImportModal,
});

const [Grouping, groupingModalApi] = useVbenModal({
  connectedComponent: GroupingModal,
});

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleDelete(row: any) {
  message.warning(`删除字段: ${row.name}`);
}

function handleImport() {
  importModalApi.open();
}

function handleExport() {
  message.success('模板导出下载已开始');
}

function handleGrouping() {
  groupingModalApi.open();
}

function refreshGrid() {
  message.success('更新成功');
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="为主数据模型配置具体的业务字段，定义其数据类型、长度、精度及启用状态。支持批量导入、分组管理及增量发布。"
    title="字段管理"
  >
    <template #extra>
      <Space>
        <Select
          :options="[
            { label: '控制器 (CONTROLLER)', value: 'ctrl' },
            { label: '环境传感器 (SENSOR)', value: 'sensor' },
            { label: '照明 (LIGHTING)', value: 'light' },
          ]"
          placeholder="当前模型: 控制器"
          style="width: 240px"
        />
        <Button @click="handleGrouping"> 分组管理 </Button>
        <Button @click="handleImport">
          <ArrowUpToLine class="size-4" /> 导入字段
        </Button>
        <Button @click="handleExport">
          <SvgDownloadIcon class="size-4" /> 导出模板
        </Button>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-4" /> 新增字段
        </Button>
      </Space>
    </template>

    <Form @success="refreshGrid" />
    <Import />
    <Grouping />

    <div class="flex-1 min-h-0">
      <Grid table-title="字段列表">
        <template #dataType="{ row }">
          <Tag :color="DATA_TYPE_COLOR[row.dataType] || 'default'">
            {{ row.dataType }}
          </Tag>
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
            <Button danger size="small" type="link" @click="handleDelete(row)"
              >删除</Button
            >
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
