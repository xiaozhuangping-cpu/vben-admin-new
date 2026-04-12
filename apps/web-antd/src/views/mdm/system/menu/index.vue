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
  Tooltip,
  Tag,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { ref, onMounted, computed } from 'vue';
import {
  getAllMasterDataItems,
  loadDynamicMasterDataItems,
} from '#/views/mdm/data/shared/master-data';
import { processRawModules } from '#/utils/route-scanner';
import { 
  createMenuApi,
  getMenuListApi, 
  deleteMenuApi,
  updateMenuApi,
} from '#/api/mdm/rbac-menu';
import FormModule from './modules/form.vue';

const allMenus = ref<any[]>([]);
const treeData = ref<any[]>([]);
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);
const searchValue = ref('');
const currentData = ref<any>(null);
const loading = ref(false);
const sortSaving = ref(false);
const syncingDynamicMenus = ref(false);

const pageMap = import.meta.glob('/src/views/**/*.vue');
const allRouteCandidates = processRawModules(pageMap);
const componentOptions = allRouteCandidates.map((c) => ({
  label: `${c.title} | ${c.path}`,
  value: c.component,
}));

function isAutoManagedMenu(item: any) {
  return (
    String(item?.name || '') === 'MdmDataMaintenance' ||
    String(item?.name || '').startsWith('MdmDataDynamic')
  );
}

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
      autoManaged: isAutoManagedMenu(item),
      key: item.id,
      title: item.title,
      children: buildTree(list, item.id),
      isLeaf: list.filter((child) => child.parent_id === item.id).length === 0,
    }))
    .sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
}

function cloneTree(nodes: any[]): any[] {
  return nodes.map((node) => ({
    ...node,
    children: cloneTree(node.children || []),
  }));
}

function removeNodeById(nodes: any[], id: string): any | null {
  for (const [index, node] of nodes.entries()) {
    if (node.id === id) {
      const [removed] = nodes.splice(index, 1);
      return removed;
    }
    const removed = removeNodeById(node.children || [], id);
    if (removed) {
      return removed;
    }
  }
  return null;
}

function findNodeById(nodes: any[], id: string): any | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findNodeById(node.children || [], id);
    if (found) {
      return found;
    }
  }
  return null;
}

function appendChildNode(targetNode: any, childNode: any, insertAtTop = false) {
  targetNode.children ||= [];
  if (insertAtTop) {
    targetNode.children.unshift(childNode);
  } else {
    targetNode.children.push(childNode);
  }
}

function findParentChildren(
  nodes: any[],
  id: string,
): { index: number; siblings: any[] } | null {
  for (const [index, node] of nodes.entries()) {
    if (node.id === id) {
      return { index, siblings: nodes };
    }
    const found = findParentChildren(node.children || [], id);
    if (found) {
      return found;
    }
  }
  return null;
}

function containsDescendant(nodes: any[], id: string): boolean {
  return nodes.some(
    (node) => node.id === id || containsDescendant(node.children || [], id),
  );
}

function normalizeTree(nodes: any[], parentId: string | null = null): any[] {
  return nodes.map((node, index) => {
    const children = normalizeTree(node.children || [], node.id);
    return {
      ...node,
      children,
      isLeaf: children.length === 0,
      order_no: (index + 1) * 10,
      parent_id: parentId,
    };
  });
}

function flattenTree(nodes: any[]): any[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children || [])]);
}

async function syncDynamicMaintenanceMenus(existingMenus: any[]) {
  await loadDynamicMasterDataItems(true);
  const dynamicItems = getAllMasterDataItems().filter((item) => item.dynamic);
  if (dynamicItems.length === 0) {
    return false;
  }

  let maintenanceRoot =
    existingMenus.find((item) => item.name === 'MdmDataMaintenance') ||
    existingMenus.find(
      (item) =>
        item.parent_id === null &&
        item.path === '/mdm/data' &&
        ['MdmData', 'MdmDataMaintenance'].includes(String(item.name || '')),
    ) ||
    existingMenus.find(
      (item) => item.parent_id === null && item.title === '主数据维护',
    );

  if (!maintenanceRoot) {
    syncingDynamicMenus.value = true;
    try {
      await createMenuApi({
        component: 'BasicLayout',
        hide_menu: false,
        icon: 'lucide:database-zap',
        keep_alive: false,
        name: 'MdmDataMaintenance',
        order_no: 110,
        parent_id: null,
        path: '/mdm/data',
        status: true,
        title: '主数据维护',
      });
    } finally {
      syncingDynamicMenus.value = false;
    }
    return true;
  }

  const maintenanceRootId = String(maintenanceRoot.id || '');
  if (!maintenanceRootId) {
    return false;
  }

  const tasks: Promise<any>[] = [];
  const shouldUpdateRoot =
    maintenanceRoot.name !== 'MdmDataMaintenance' ||
    maintenanceRoot.title !== '主数据维护' ||
    maintenanceRoot.path !== '/mdm/data' ||
    maintenanceRoot.parent_id !== null ||
    maintenanceRoot.component !== 'BasicLayout';

  if (shouldUpdateRoot) {
    tasks.push(
      updateMenuApi(maintenanceRootId, {
        component: 'BasicLayout',
        icon: maintenanceRoot.icon || 'lucide:database-zap',
        keep_alive: false,
        name: 'MdmDataMaintenance',
        parent_id: null,
        path: '/mdm/data',
        status: true,
        title: '主数据维护',
      }),
    );
  }

  const existingMap = new Map(
    existingMenus.map((item) => [String(item.name || ''), item]),
  );
  const siblingMenus = existingMenus
    .filter((item) => item.parent_id === maintenanceRootId)
    .sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
  let nextOrder =
    siblingMenus.reduce((max, item) => Math.max(max, item.order_no || 0), 0) ||
    0;

  for (const item of dynamicItems) {
    const existing = existingMap.get(item.routeName);
    if (existing) {
      const shouldUpdate =
        existing.title !== item.title ||
        existing.path !== item.path ||
        existing.parent_id !== maintenanceRootId ||
        existing.component !== 'mdm/data/maintenance/index.vue' ||
        existing.keep_alive !== true ||
        existing.status !== true;

      if (shouldUpdate) {
        tasks.push(
          updateMenuApi(String(existing.id), {
            component: 'mdm/data/maintenance/index.vue',
            keep_alive: true,
            parent_id: maintenanceRootId,
            path: item.path,
            status: true,
            title: item.title,
          }),
        );
      }
      continue;
    }

    nextOrder += 10;
    tasks.push(
      createMenuApi({
        component: 'mdm/data/maintenance/index.vue',
        hide_menu: false,
        keep_alive: true,
        name: item.routeName,
        order_no: nextOrder,
        parent_id: maintenanceRootId,
        path: item.path,
        status: true,
        title: item.title,
      }),
    );
  }

  if (tasks.length === 0) {
    return false;
  }

  syncingDynamicMenus.value = true;
  try {
    await Promise.all(tasks);
    return true;
  } finally {
    syncingDynamicMenus.value = false;
  }
}

async function fetchList() {
  try {
    loading.value = true;
    let resp = await getMenuListApi();
    if (Array.isArray(resp) && (await syncDynamicMaintenanceMenus(resp))) {
      resp = await getMenuListApi();
    }
    const items = Array.isArray(resp) ? resp : [];

    allMenus.value = items;
    treeData.value = buildTree(allMenus.value);
    if (currentData.value?.id) {
      currentData.value =
        allMenus.value.find((item) => item.id === currentData.value.id) ?? null;
    }
    
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
  const parentId = selectedKeys.value[0];
  if (!parentId) {
    message.warning('请先在左侧选择一个父级菜单');
    return;
  }
  if (currentData.value?.autoManaged) {
    message.warning('动态主数据菜单仅支持排序，不支持新增子节点。');
    return;
  }
  currentData.value = { 
    parent_id: parentId,
    status: true,
    keep_alive: true,
    order_no: (allMenus.value.filter(m => m.parent_id === parentId).length + 1) * 10
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
  const menuId = selectedKeys.value[0];
  if (!menuId) return;
  if (currentData.value?.autoManaged) {
    message.warning('动态主数据菜单由系统自动维护，可拖拽排序但不支持删除。');
    return;
  }

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

async function handleDrop(info: any) {
  if (searchValue.value || loading.value || sortSaving.value) {
    message.warning('当前状态下暂不支持拖拽，请稍后再试。');
    return;
  }

  const dragId = String(info?.dragNode?.id || info?.dragNode?.key || '');
  const dropId = String(info?.node?.id || info?.node?.key || '');
  if (!dragId || !dropId || dragId === dropId) {
    return;
  }

  const draftTree = cloneTree(treeData.value);
  const draggedNode = removeNodeById(draftTree, dragId);
  if (!draggedNode) {
    return;
  }

  if (containsDescendant(draggedNode.children || [], dropId)) {
    message.warning('不能把节点拖动到自己的下级菜单中。');
    return;
  }

  if (!info.dropToGap) {
    const targetNode = findNodeById(draftTree, dropId);
    if (!targetNode) {
      return;
    }
    appendChildNode(targetNode, draggedNode);
    expandedKeys.value = [...new Set([...expandedKeys.value, dropId])];
  } else {
    const targetNode = findNodeById(draftTree, dropId);
    const targetHasChildren = (targetNode?.children?.length ?? 0) > 0;
    const dropPosList = String(info?.node?.pos || '').split('-');
    const relativeDropPosition =
      info.dropPosition - Number(dropPosList.at(-1) || 0);

    if (
      targetNode &&
      targetHasChildren &&
      info?.node?.expanded &&
      relativeDropPosition === 1
    ) {
      appendChildNode(targetNode, draggedNode, true);
      expandedKeys.value = [...new Set([...expandedKeys.value, dropId])];
    } else {
      const target = findParentChildren(draftTree, dropId);
      if (!target) {
        return;
      }
      const insertIndex =
        relativeDropPosition > 0 ? target.index + 1 : target.index;
      target.siblings.splice(insertIndex, 0, draggedNode);
    }
  }

  const normalizedTree = normalizeTree(draftTree);
  const nextMenus = flattenTree(normalizedTree);
  const previousMap = new Map(
    allMenus.value.map((item) => [
      item.id,
      {
        order_no: item.order_no ?? 0,
        parent_id: item.parent_id ?? null,
      },
    ]),
  );
  const changedMenus = nextMenus.filter((item) => {
    const previous = previousMap.get(item.id);
    return (
      (previous?.parent_id ?? null) !== (item.parent_id ?? null) ||
      (previous?.order_no ?? 0) !== (item.order_no ?? 0)
    );
  });

  if (changedMenus.length === 0) {
    return;
  }

  try {
    sortSaving.value = true;
    for (const item of changedMenus) {
      await updateMenuApi(String(item.id), {
        order_no: item.order_no,
        parent_id: item.parent_id,
      });
    }
    await fetchList();
    message.success('菜单排序已更新');
  } catch (error) {
    console.error(error);
    message.error('菜单排序保存失败');
    await fetchList();
  } finally {
    sortSaving.value = false;
  }
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
    description="通过左侧树形结构管理菜单层级。支持拖拽排序、调整父子关系，并自动识别项目组件路径生成路由配置。"
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
                :draggable="!searchValue && !sortSaving"
                :tree-data="filteredTreeData"
                block-node
                class="menu-tree"
                @drop="handleDrop"
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
                      <IconifyIcon
                        icon="lucide:grip-vertical"
                        class="text-gray-300"
                        size="14"
                      />
                      <span :class="{ 'font-semibold text-primary': selected, 'text-foreground': !selected }" class="truncate">
                        {{ title }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1">
                      <IconifyIcon 
                        v-if="!dataRef.autoManaged"
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
            <div class="mt-3 px-1 text-xs text-gray-400">
              {{
                searchValue
                  ? '搜索中已关闭拖拽排序，请先清空搜索条件。'
                  : sortSaving
                    ? '正在保存拖拽结果...'
                    : syncingDynamicMenus
                      ? '正在同步动态主数据菜单...'
                      : '可直接拖动节点调整顺序和层级。'
              }}
            </div>
          </div>

          <div class="pt-4 mt-auto">
            <Button block type="dashed" class="rounded-xl h-10 border-primary/30 text-primary hover:bg-accent hover:border-primary/50" @click="handleAddChild" :disabled="!selectedKeys.length || currentData?.autoManaged">
              <template #icon><IconifyIcon icon="lucide:plus" /></template> 在选中项下新增子节点
            </Button>
            <div v-if="!selectedKeys.length || currentData?.autoManaged" class="text-center text-[10px] text-gray-400 mt-2">
              <IconifyIcon icon="lucide:info" size="12" class="inline mr-1" />
              {{
                currentData?.autoManaged
                  ? '动态主数据菜单仅支持排序，不支持新增子节点。'
                  : '请先在上方树中选择一个目标节点'
              }}
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
