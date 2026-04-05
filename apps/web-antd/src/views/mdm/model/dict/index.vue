<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { Page, useVbenModal, useVbenDrawer } from '@vben/common-ui';
import { Button, message, Space, Tag, Drawer, Table } from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { Plus } from '@vben/icons';
import { useColumns, useItemColumns } from './data';
import DictFormModal from './modules/form.vue';
import { ref } from 'vue';

const MOCK_DICTS = [
  {
    id: '1',
    code: 'ioT_PROTOCOL',
    name: '通信协议',
    type: 'system',
    itemsCount: 6,
    remark: '设备连接协议标准',
  },
  {
    id: '2',
    code: 'DEVICE_BRAND',
    name: '生态品牌',
    type: 'business',
    itemsCount: 12,
    remark: '支持接入的主流智能家居品牌',
  },
  {
    id: '3',
    code: 'SENSOR_TYPE',
    name: '传感器类型',
    type: 'material',
    itemsCount: 8,
    remark: '环境感知组件分类',
  },
];

const MOCK_ITEMS = [
  { label: 'Zigbee 3.0', value: 'Zigbee', sort: 1, status: true },
  { label: 'Matter (Over WiFi)', value: 'Matter', sort: 2, status: true },
  { label: 'Bluetooth Mesh', value: 'BLE', sort: 3, status: true },
];

const [Form, formModalApi] = useVbenModal({
  connectedComponent: DictFormModal,
  destroyOnClose: true,
});

const [ItemDrawer, itemDrawerApi] = useVbenDrawer({
  title: '字典条目管理',
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  data: MOCK_DICTS,
};

const [Grid] = useVbenVxeGrid({
  gridOptions: {
    ...gridOptions,
    height: 'auto',
  },
});

const selectedDict = ref<any>(null);

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: any) {
  formModalApi.setData(row).open();
}

function handleManageItems(row: any) {
  selectedDict.value = row;
  itemDrawerApi.open();
}

function handleDelete(row: any) {
  message.warning(`删除字典: ${row.name}`);
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="管理系统中通用的枚举值与下拉选项（状态、类型、等级等）。支持分级管理与中英文翻译，为数据录入阶段提供规范的取值范围。"
    title="数据字典"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">
        <Plus class="size-4" /> 新增字典
      </Button>
    </template>

    <Form @success="() => Grid.reload()" />

    <ItemDrawer>
      <div class="p-4">
        <div class="flex justify-between items-center mb-4">
          <div>
            当前字典:
            <Tag color="blue"
              >{{ selectedDict?.name }} ({{ selectedDict?.code }})</Tag
            >
          </div>
          <Button type="primary" size="small">
            <Plus class="size-4" /> 新增条目
          </Button>
        </div>
        <Table
          :columns="useItemColumns()"
          :data-source="MOCK_ITEMS"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Tag :color="record.status ? 'success' : 'error'">{{
                record.status ? '启用' : '禁用'
              }}</Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button type="link" size="small">编辑</Button>
                <Button type="link" danger size="small">删除</Button>
              </Space>
            </template>
          </template>
        </Table>
      </div>
    </ItemDrawer>

    <div class="flex-1 min-h-0">
      <Grid table-title="字典分类">
        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleManageItems(row)"
              >条目</Button
            >
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
