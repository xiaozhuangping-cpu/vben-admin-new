<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space, Table, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteDictApi,
  deleteDictItemApi,
  getDictItemListApi,
  getDictListApi,
} from '#/api/mdm/dict';

import { useColumns, useItemColumns } from './data';
import DictFormModal from './modules/form.vue';
import DictItemFormModal from './modules/item-form.vue';

const selectedDict = ref<any>(null);
const itemLoading = ref(false);
const itemRows = ref<any[]>([]);

const [Form, formModalApi] = useVbenModal({
  connectedComponent: DictFormModal,
  destroyOnClose: true,
});

const [ItemForm, itemFormModalApi] = useVbenModal({
  connectedComponent: DictItemFormModal,
  destroyOnClose: true,
});

const [ItemDrawer, itemDrawerApi] = useVbenDrawer({
  title: '字典条目管理',
});

const gridOptions: VxeGridProps<any> = {
  columns: useColumns(),
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getDictListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
        }),
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

async function loadItems() {
  if (!selectedDict.value?.id) {
    itemRows.value = [];
    return;
  }
  itemLoading.value = true;
  try {
    itemRows.value = await getDictItemListApi(selectedDict.value.id);
  } finally {
    itemLoading.value = false;
  }
}

function refreshGrid() {
  gridApi.reload();
}

function handleCreate() {
  formModalApi
    .setData({
      onSuccess: refreshGrid,
    })
    .open();
}

function handleEdit(row: any) {
  formModalApi
    .setData({
      ...row,
      onSuccess: refreshGrid,
    })
    .open();
}

async function handleManageItems(row: any) {
  selectedDict.value = row;
  itemDrawerApi.open();
  await loadItems();
}

function handleCreateItem() {
  itemFormModalApi
    .setData({
      dictId: selectedDict.value.id,
      onSuccess: loadItems,
    })
    .open();
}

function handleEditItem(row: any) {
  itemFormModalApi
    .setData({
      ...row,
      dictId: selectedDict.value.id,
      onSuccess: loadItems,
    })
    .open();
}

function handleDelete(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await deleteDictApi(row.id);
        message.success(`已删除字典: ${row.name}`);
        refreshGrid();
      } catch {
        message.error('删除字典失败');
      }
    },
    title: `是否删除字典 ${row.name}？`,
  });
}

function handleDeleteItem(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await deleteDictItemApi(row.id);
        message.success(`已删除条目: ${row.name}`);
        await loadItems();
        refreshGrid();
      } catch {
        message.error('删除条目失败');
      }
    },
    title: `是否删除条目 ${row.name}？`,
  });
}
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="管理系统级和业务级字典定义，所有枚举类下拉值统一从后台数据库读取。"
    title="数据字典"
  >
    <template #extra>
      <Button type="primary" @click="handleCreate">
        <Plus class="size-4" /> 新增字典
      </Button>
    </template>

    <Form @success="refreshGrid" />
    <ItemForm @success="loadItems" />

    <ItemDrawer>
      <div class="p-4">
        <div class="mb-4 flex items-center justify-between">
          <div>
            当前字典:
            <Tag color="blue">
{{ selectedDict?.name }} ({{ selectedDict?.code }})
</Tag>
          </div>
          <Button type="primary" size="small" @click="handleCreateItem">
            <Plus class="size-4" /> 新增条目
          </Button>
        </div>
        <Table
          :columns="useItemColumns()"
          :data-source="itemRows"
          :loading="itemLoading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Tag :color="record.status ? 'success' : 'default'">
{{
                record.status ? '启用' : '禁用'
              }}
</Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button type="link" size="small" @click="handleEditItem(record)">
编辑
</Button>
                <Button
                  type="link"
                  danger
                  size="small"
                  @click="handleDeleteItem(record)"
                  >
删除
</Button>
              </Space>
            </template>
          </template>
        </Table>
      </div>
    </ItemDrawer>

    <div class="min-h-0 flex-1">
      <Grid table-title="字典分类">
        <template #systemFlag="{ row }">
          <Tag :color="row.systemFlag ? 'processing' : 'default'">
            {{ row.systemFlag ? '是' : '否' }}
          </Tag>
        </template>

        <template #status="{ row }">
          <Tag :color="row.status ? 'success' : 'default'">
            {{ row.status ? '启用' : '禁用' }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleManageItems(row)">
条目
</Button>
            <Button size="small" type="link" @click="handleEdit(row)">
编辑
</Button>
            <Button danger size="small" type="link" @click="handleDelete(row)">
删除
</Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
