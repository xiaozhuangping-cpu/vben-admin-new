<script lang="ts" setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Select, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  DEFAULT_MASTER_DATA_ITEM,
  MASTER_DATA_ITEM_MAP,
  MASTER_DATA_SELECT_OPTIONS,
} from '../shared/master-data';
import { useColumns, useSearchSchema } from './data';
import DataFormModal from './modules/form.vue';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  invalid: { color: 'default', label: '失效' },
  normal: { color: 'success', label: '正常' },
  pending: { color: 'warning', label: '审核中' },
};

const route = useRoute();
const router = useRouter();

const currentMasterData = computed(() => {
  const matchedItem = MASTER_DATA_ITEM_MAP[String(route.name ?? '')];
  return matchedItem ?? DEFAULT_MASTER_DATA_ITEM;
});

const [Form, formModalApi] = useVbenModal({
  connectedComponent: DataFormModal,
  destroyOnClose: true,
});

const gridOptions = {
  columns: useColumns(String(route.name ?? '')),
  data: currentMasterData.value.records,
  height: 'auto',
  pagerConfig: {
    enabled: true,
    pageSize: 10,
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    search: true,
    zoom: true,
  },
};

const formOptions = {
  schema: useSearchSchema(),
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

function handleCreate() {
  formModalApi
    .setData({
      masterDataTitle: currentMasterData.value.title,
    })
    .open();
}

function handleEdit(row: any) {
  formModalApi
    .setData({
      ...row,
      masterDataTitle: currentMasterData.value.title,
    })
    .open();
}

function handleAudit(row: any) {
  message.info(`提交${currentMasterData.value.title}审核: ${row.entityName}`);
}

function handleHistory(row: any) {
  message.info(
    `查看${currentMasterData.value.title}历史版本: ${row.entityName}`,
  );
}

function handleMasterDataChange(path: unknown) {
  if (typeof path === 'string') {
    router.push(path);
  }
}

function refreshGrid() {
  message.success(`${currentMasterData.value.title}更新成功`);
}

watch(
  currentMasterData,
  (item) => {
    gridApi.setGridOptions({
      columns: useColumns(String(route.name ?? '')),
      data: item.records,
    });
  },
  { immediate: true },
);
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    :description="currentMasterData.description"
    :title="`${currentMasterData.title}主数据`"
  >
    <template #extra>
      <Space>
        <Select
          :options="MASTER_DATA_SELECT_OPTIONS"
          :value="currentMasterData.path"
          placeholder="切换主数据"
          style="width: 260px"
          @change="handleMasterDataChange"
        />
        <Button type="primary" @click="handleCreate">
          新增{{ currentMasterData.title }}
        </Button>
      </Space>
    </template>

    <Form @success="refreshGrid" />

    <div class="flex-1 min-h-0">
      <Grid
        :form-options="formOptions"
        :table-title="`${currentMasterData.title}记录`"
      >
        <template #status="{ row }">
          <Tag :color="STATUS_MAP[row.status]?.color">
{{
            STATUS_MAP[row.status]?.label
          }}
</Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button size="small" type="link" @click="handleEdit(row)">
编辑
</Button>
            <Button size="small" type="link" @click="handleAudit(row)">
审核
</Button>
            <Button size="small" type="link" @click="handleHistory(row)">
历史
</Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Page>
</template>
