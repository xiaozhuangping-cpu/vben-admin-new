<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import type { VxeGridProps } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import {
  Button,
  Card,
  Col,
  message,
  Modal,
  Row,
  Space,
  Tag,
  Tree,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getThemeListApi } from '#/api/mdm/theme';
import {
  deleteValidationRuleApi,
  getValidationRuleListApi,
} from '#/api/mdm/validation-rule';

import { useColumns } from './data';
import RuleFormModal from './modules/form.vue';

const themeTree = ref<any[]>([{ title: '全部主题', key: 'all' }]);
const selectedThemeId = ref<string>('all');

const [Form, formModalApi] = useVbenModal({
  connectedComponent: RuleFormModal,
  destroyOnClose: true,
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
        await getValidationRuleListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
          ...(selectedThemeId.value === 'all'
            ? {}
            : { theme_id: `eq.${selectedThemeId.value}` }),
        }),
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

function handleCreate() {
  formModalApi
    .setData({
      onSuccess: () => gridApi.reload(),
      themeId:
        selectedThemeId.value === 'all' ? undefined : selectedThemeId.value,
    })
    .open();
}

function handleEdit(row: any) {
  formModalApi
    .setData({
      ...row,
      onSuccess: () => gridApi.reload(),
    })
    .open();
}

function handleDelete(row: any) {
  Modal.confirm({
    async onOk() {
      try {
        await deleteValidationRuleApi(row.id);
        message.success(`已删除校验规则: ${row.name}`);
        gridApi.reload();
      } catch {
        message.error('删除校验规则失败');
      }
    },
    title: `是否删除校验规则 ${row.name}？`,
  });
}

function handleTreeSelect(keys: Key[]) {
  selectedThemeId.value = String(keys[0] ?? 'all');
  gridApi.reload();
}

async function loadThemes() {
  const { items } = await getThemeListApi({ pageSize: 1000 });
  themeTree.value = [
    { title: '全部主题', key: 'all' },
    ...items.map((item: any) => ({
      title: item.name,
      key: item.id,
    })),
  ];
}

loadThemes();
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
          <Tree
            :selected-keys="[selectedThemeId]"
            :tree-data="themeTree"
            default-expand-all
            @select="handleTreeSelect"
          />
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
              <Tag color="blue">{{ row.ruleType.toUpperCase() }}</Tag>
            </template>

            <template #status="{ row }">
              <Tag :color="row.status ? 'success' : 'default'">
                {{ row.status ? '启用' : '禁用' }}
              </Tag>
            </template>

            <template #action="{ row }">
              <Space>
                <Button size="small" type="link" @click="handleEdit(row)">
编辑
</Button>
                <Button
                  danger
                  size="small"
                  type="link"
                  @click="handleDelete(row)"
                  >
删除
</Button>
              </Space>
            </template>
          </Grid>
        </div>
      </Col>
    </Row>

    <Form @success="() => gridApi.reload()" />
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
