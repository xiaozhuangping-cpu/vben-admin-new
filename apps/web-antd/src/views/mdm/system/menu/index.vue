<script lang="ts" setup>
import { Page } from '@vben/common-ui';
import {
  Button,
  message,
  Space,
  Modal,
  Row,
  Col,
  Card,
  Tree,
  Input,
  Empty,
  Typography,
  Tooltip,
  Tag,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { ref, onMounted, computed } from 'vue';
import { processRawModules } from '#/utils/route-scanner';
import { 
  getMenuListApi, 
  deleteMenuApi 
} from '#/api/mdm/rbac-menu';
import FormModule from './modules/form.vue';

const allMenus = ref<any[]>([]);
const treeData = ref<any[]>([]);
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);
const searchValue = ref('');
const currentData = ref<any>(null);
const loading = ref(false);

const pageMap = import.meta.glob('/src/views/**/*.vue');
const allRouteCandidates = processRawModules(pageMap);
const componentOptions = allRouteCandidates.map((c) => ({
  label: c.relative,
  value: c.component,
}));

function buildTree(list: any[], parentId: string | null = null): any[] {
  const children = list.filter((item) => {
    if (parentId === null) {
      return !item.parent_id;
    }
    return item.parent_id === parentId;
  });

  return children
    .map((item) => ({
      ...item,
      key: item.id,
      title: item.title,
      children: buildTree(list, item.id),
      isLeaf: list.filter((child) => child.parent_id === item.id).length === 0,
    }))
    .sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
}

async function fetchList() {
  try {
    loading.value = true;
    const resp = await getMenuListApi();
    const items = Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : [];

    allMenus.value = items;
    treeData.value = buildTree(allMenus.value);
    
    if (expandedKeys.value.length === 0) {
      expandedKeys.value = allMenus.value.map((i) => i.id);
    }
  } catch (err) {
    message.error('加载菜单列表失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchList();
});

function handleSelect(keys: any[], info: any) {
  if (keys.length > 0) {
    currentData.value = { ...info.node.dataRef };
  } else {
    currentData.value = null;
  }
}

function handleAddChild() {
  if (!selectedKeys.value.length) {
    message.warning('请先在左侧选择一个父级菜单');
    return;
  }
  currentData.value = { 
    parent_id: selectedKeys.value[0],
    status: true,
    keep_alive: true,
    order_no: (allMenus.value.filter(m => m.parent_id === selectedKeys.value[0]).length + 1) * 10
  };
}

function handleAddRoot() {
  currentData.value = { 
    parent_id: null,
    status: true,
    keep_alive: true,
    order_no: (allMenus.value.filter(m => !m.parent_id).length + 1) * 10
  };
  selectedKeys.value = [];
}

async function handleDelete() {
  if (!selectedKeys.value.length) return;
  const menuId = selectedKeys.value[0];

  Modal.confirm({
    title: '确认删除？',
    content: '删除当前菜单将同步移除其所有下级菜单及关联权限配置，是否继续？',
    okType: 'danger',
    centered: true,
    async onOk() {
      await deleteMenuApi(menuId);
      message.success('删除成功');
      selectedKeys.value = [];
      currentData.value = null;
      await fetchList();
    },
  });
}

async function handleFormSuccess() {
  currentData.value = null;
  selectedKeys.value = [];
  await fetchList();
}

function handleFormCancel() {
  currentData.value = null;
  selectedKeys.value = [];
}

const filteredTreeData = computed(() => {
  if (!searchValue.value) return treeData.value;
  const filter = (nodes: any[]): any[] => {
    return nodes
      .filter((node) => {
        const match = node.title?.toLowerCase().includes(searchValue.value.toLowerCase());
        const childrenMatch = node.children && filter(node.children).length > 0;
        return match || childrenMatch;
      })
      .map((node) => ({
        ...node,
        children: node.children ? filter(node.children) : [],
      }));
  };
  return filter(treeData.value);
});
</script>

<template>
  <Page
    auto-content-height
    content-class="p-4 bg-background-deep flex flex-col"
    description="通过左侧树形结构管理菜单层级。点击节点进行编辑，支持自动识别项目组件路径并生成路由配置。"
    title="导航菜单维护"
  >
    <template #extra>
      <Space :size="12">
        <Tooltip title="刷新数据">
          <Button @click="fetchList" class="flex items-center justify-center">
            <template #icon><IconifyIcon icon="lucide:rotate-cw" /></template>
          </Button>
        </Tooltip>
        <Button danger :disabled="!selectedKeys.length" @click="handleDelete" class="flex items-center gap-2">
          <template #icon><IconifyIcon icon="lucide:trash-2" /></template>
          删除
        </Button>
        <Button type="primary" @click="handleAddRoot" class="flex items-center gap-2">
          <template #icon><IconifyIcon icon="lucide:plus" /></template>
          新增顶级
        </Button>
      </Space>
    </template>

    <Row :gutter="16" class="flex-1 min-h-0">
      <!-- 左侧：菜单树 -->
      <Col :span="8" class="h-full">
        <Card 
          class="h-full flex flex-col border-border" 
          :body-style="{ flex: 1, overflow: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column' }"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 bg-primary rounded-full"></div>
              <span>架构 / 菜单树</span>
              <Tag class="ml-auto" :bordered="false" color="blue">{{ allMenus.length }} 项</Tag>
            </div>
          </template>

          <div class="px-1 mb-4">
            <Input.Search
              v-model:value="searchValue"
              placeholder="搜标题/路径..."
              allow-clear
              class="search-input"
            >
              <template #prefix><IconifyIcon icon="lucide:search" class="text-gray-400" /></template>
            </Input.Search>
          </div>
          
          <div class="flex-1 overflow-auto custom-scrollbar pr-1">
            <div class="rounded-2xl border border-border p-2 bg-background min-h-[400px]">
              <Tree
                v-if="treeData.length"
                v-model:expanded-keys="expandedKeys"
                v-model:selected-keys="selectedKeys"
                :tree-data="filteredTreeData"
                block-node
                class="menu-tree"
                @select="handleSelect"
              >
                <template #title="{ title, dataRef, selected }">
                  <div class="flex items-center justify-between py-1 px-1 group/item">
                    <div class="flex items-center gap-2 min-w-0">
                      <div 
                        class="w-6 h-6 flex items-center justify-center rounded-lg"
                        :class="selected ? 'text-primary bg-primary/10' : 'text-gray-400'"
                      >
                        <IconifyIcon 
                          v-if="dataRef.component === 'BasicLayout' || (dataRef.children && dataRef.children.length > 0)" 
                          icon="lucide:folder" 
                          size="16" 
                        />
                        <IconifyIcon v-else icon="lucide:file-code-2" size="16" />
                      </div>
                      <span :class="{ 'font-semibold text-primary': selected, 'text-foreground': !selected }" class="truncate">
                        {{ title }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1">
                      <IconifyIcon 
                        icon="lucide:plus" 
                        class="text-gray-300 hover:text-primary transition-colors cursor-pointer opacity-0 group-hover/item:opacity-100" 
                        @click.stop="() => { selectedKeys = [dataRef.id]; currentData = dataRef; handleAddChild(); }"
                      />
                    </div>
                  </div>
                </template>
              </Tree>
              <Empty v-else-if="!loading" description="暂无菜单，请点击新增" class="mt-20" />
              <div v-else class="text-center py-20">
                <IconifyIcon icon="lucide:loader-2" class="text-2xl text-primary animate-spin" />
                <div class="text-gray-400 mt-2 text-sm">数据同步中...</div>
              </div>
            </div>
          </div>

          <div class="pt-4 mt-auto">
            <Button block type="dashed" class="rounded-xl h-10 border-primary/30 text-primary hover:bg-accent hover:border-primary/50" @click="handleAddChild" :disabled="!selectedKeys.length">
              <template #icon><IconifyIcon icon="lucide:plus" /></template> 在选中项下新增子节点
            </Button>
            <div v-if="!selectedKeys.length" class="text-center text-[10px] text-gray-400 mt-2">
              <IconifyIcon icon="lucide:info" size="12" class="inline mr-1" />
              请先在上方树中选择一个目标节点
            </div>
          </div>
        </Card>
      </Col>

      <!-- 右侧：编辑表单 -->
      <Col :span="16" class="h-full">
        <FormModule 
          :menu-data="treeData" 
          :component-options="componentOptions" 
          :route-candidates="allRouteCandidates"
          :current-data="currentData" 
          class="border-border"
          @success="handleFormSuccess" 
          @cancel="handleFormCancel" 
        />
      </Col>
    </Row>
  </Page>
</template>

<style scoped>
:deep(.ant-card) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.ant-card-head) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding: 0 16px;
  min-height: 52px;
}

:deep(.ant-card-head-title) {
  padding: 14px 0;
  font-size: 15px;
  font-weight: 600;
}

.search-input :deep(.ant-input-affix-wrapper) {
  @apply rounded-xl bg-background-deep border-border px-3 py-1.5;
}

.search-input :deep(.ant-input-affix-wrapper-focused) {
  @apply bg-card border-primary ring-2 ring-primary/10;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.ant-tree-node-content-wrapper) {
  border-radius: 12px !important;
  transition: all 0.2s !important;
  padding: 2px 4px !important;
}

:deep(.ant-tree-node-selected) {
  background-color: #eff6ff !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

:deep(.ant-tree-switcher) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.menu-tree :deep(.ant-tree-treenode) {
  padding-bottom: 4px !important;
}
</style>
