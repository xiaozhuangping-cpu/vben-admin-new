<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import { Page } from '@vben/common-ui';
import {
  Button,
  message,
  Space,
  Modal,
  Row,
  Col,
  Card,
  List,
  Input,
  Empty,
  Tag,
  Form,
  Radio,
  Tree,
  Tooltip,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { ref, onMounted, computed } from 'vue';
import {
  createRoleApi,
  deleteRoleApi,
  getRoleListApi,
  getRoleMenusApi,
  setRoleMenusApi,
  updateRoleApi,
} from '#/api/mdm/rbac-role';
import { getMenuListApi } from '#/api/mdm/rbac-menu';

const allRoles = ref<any[]>([]);
const allMenus = ref<any[]>([]);
const loading = ref(false);
const menuLoading = ref(false);
const savingMenus = ref(false);
const searchValue = ref('');
const selectedRoleId = ref<string | null>(null);
const currentData = ref<any>(null);
const roleModalOpen = ref(false);
const roleModalSaving = ref(false);
const roleFormRef = ref();
const roleFormState = ref<any>({
  code: '',
  description: '',
  home_path: undefined,
  name: '',
  status: true,
});
const targetMenuKeys = ref<string[]>([]);
const menuTreeExpandedKeys = ref<string[]>([]);
const READONLY_ROLE_CODES = new Set(['super_admin']);

async function fetchList() {
  try {
    loading.value = true;
    const resp = await getRoleListApi({
      page: 1,
      pageSize: 1000,
    });
    allRoles.value = Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.data)
        ? resp.data
        : [];
    // 默认选中第一个角色
    if (allRoles.value.length > 0 && !selectedRoleId.value) {
      handleSelect(allRoles.value[0]);
    }
  } catch (err) {
    message.error('加载角色列表失败');
  } finally {
    loading.value = false;
  }
}

async function fetchMenus() {
  try {
    const resp = await getMenuListApi();
    allMenus.value = Array.isArray(resp) ? resp : [];
    menuTreeExpandedKeys.value = allMenus.value.map((item: any) => item.id);
  } catch (error) {
    console.error(error);
    message.error('加载菜单列表失败');
  }
}

onMounted(() => {
  fetchList();
  fetchMenus();
});

const filteredRoles = computed(() => {
  if (!searchValue.value) return allRoles.value;
  const s = searchValue.value.toLowerCase();
  return allRoles.value.filter(
    (r) => 
      r.name?.toLowerCase().includes(s) || 
      r.code?.toLowerCase().includes(s)
  );
});

function handleSelect(role: any) {
  selectedRoleId.value = role.id;
  currentData.value = { ...role };
  loadRoleMenus(role.id);
}

function handleAddRole() {
  roleFormState.value = {
    code: '',
    description: '',
    home_path: undefined,
    name: '',
    status: true,
  };
  roleModalOpen.value = true;
}

function handleEditRole(role: any) {
  if (isReadonlyRole(role)) {
    message.warning('超级管理员为系统内置角色，默认只读');
    return;
  }

  roleFormState.value = {
    code: role.code ?? '',
    description: role.description ?? '',
    home_path: role.home_path ?? undefined,
    id: role.id,
    name: role.name ?? '',
    status: role.status ?? true,
  };
  roleModalOpen.value = true;
}

async function handleDelete(role: any) {
  if (isReadonlyRole(role)) {
    message.warning('超级管理员为系统内置角色，默认只读');
    return;
  }

  Modal.confirm({
    title: '确认删除角色？',
    content: `删除 [${role.name}] 可能导致关联用户失去权限，是否继续？`,
    okType: 'danger',
    centered: true,
    async onOk() {
      await deleteRoleApi(role.id);
      message.success('角色已移除');
      if (selectedRoleId.value === role.id) {
        currentData.value = null;
        selectedRoleId.value = null;
      }
      fetchList();
    },
  });
}

async function handleRoleSubmit() {
  try {
    if (isReadonlyRole(roleFormState.value)) {
      message.warning('超级管理员为系统内置角色，默认只读');
      return;
    }

    await roleFormRef.value?.validate();
    roleModalSaving.value = true;

    const payload = {
      code: roleFormState.value.code,
      description: roleFormState.value.description ?? '',
      home_path: roleFormState.value.home_path || null,
      name: roleFormState.value.name,
      status: roleFormState.value.status,
    };

    const savedRole = roleFormState.value.id
      ? await updateRoleApi(roleFormState.value.id, payload)
      : await createRoleApi(payload);

    await fetchList();

    if (savedRole?.id) {
      handleSelect(savedRole);
    }

    roleModalOpen.value = false;
    message.success(roleFormState.value.id ? '角色更新成功' : '角色创建成功');
  } catch (error) {
    console.error(error);
  } finally {
    roleModalSaving.value = false;
  }
}

function handleRoleModalCancel() {
  roleModalOpen.value = false;
}

const roleModalTitle = computed(() =>
  roleFormState.value?.id ? '编辑角色' : '新增角色',
);

function isReadonlyRole(role?: any) {
  return Boolean(role?.code && READONLY_ROLE_CODES.has(String(role.code)));
}

const selectedRoleReadonly = computed(() => isReadonlyRole(currentData.value));

const menuMap = computed(
  () => new Map(allMenus.value.map((item: any) => [item.id, item])),
);

const menuTreeData = computed(() => {
  const listToTree = (parentId: null | string = null): any[] => {
    return allMenus.value
      .filter((item: any) =>
        parentId === null ? !item.parent_id : item.parent_id === parentId,
      )
      .map((item: any) => ({
        key: item.id,
        path: item.path,
        title: item.title,
        children: listToTree(item.id),
      }));
  };

  return listToTree();
});

const selectedMenuItems = computed(() => {
  return targetMenuKeys.value
    .map((key) => menuMap.value.get(key))
    .filter(Boolean);
});

const selectedHomePath = computed(() => currentData.value?.home_path || '');

async function handleUpdateHomePath(path: string | null) {
  if (selectedRoleReadonly.value) return;
  if (!currentData.value?.id) return;

  const hide = message.loading('正在同步首页配置...', 0);
  try {
    const payload = {
      code: currentData.value.code,
      description: currentData.value.description ?? '',
      home_path: path || null,
      name: currentData.value.name,
      status: currentData.value.status,
    };
    await updateRoleApi(currentData.value.id, payload);
    
    // 同步本地状态
    currentData.value = {
      ...currentData.value,
      home_path: path || null,
    };
    
    // 更新左侧列表数据，避免切换角色后数据不一致
    const roleInList = allRoles.value.find(r => r.id === currentData.value.id);
    if (roleInList) {
      roleInList.home_path = path || null;
    }

    message.success('首页配置已实时更新');
  } catch (error) {
    console.error(error);
  } finally {
    hide();
  }
}

function resolveMenuHomePath(menu: any) {
  if (menu.component === 'BasicLayout' || menu.component === 'IFrame') {
    return null;
  }
  return menu.path;
}

/**
 * 判断是否为真正的首页（处理多个菜单指向同一路径的情况）
 */
function isActualHome(item: any) {
  if (!selectedHomePath.value || selectedHomePath.value !== resolveMenuHomePath(item)) {
    return false;
  }

  const samePathItems = selectedMenuItems.value.filter(
    (m) => resolveMenuHomePath(m) === selectedHomePath.value,
  );

  if (samePathItems.length <= 1) return true;

  // 优先级：路径最长的（通常是子级）、或者 ID 最小的作为后备
  const maxLen = Math.max(...samePathItems.map((m) => (m.path || '').length));
  if ((item.path || '').length < maxLen) return false;

  return item.id === samePathItems.find((m) => (m.path || '').length === maxLen)?.id;
}

function canUseAsHome(menu: any) {
  const targetPath = resolveMenuHomePath(menu);

  return Boolean(menu && !menu.hide_menu && targetPath);
}

async function loadRoleMenus(roleId?: string) {
  if (!roleId) {
    targetMenuKeys.value = [];
    return;
  }

  try {
    menuLoading.value = true;
    targetMenuKeys.value = await getRoleMenusApi(roleId);
  } catch (error) {
    console.error(error);
    message.error('加载角色菜单失败');
  } finally {
    menuLoading.value = false;
  }
}

async function handleSaveRoleMenus() {
  if (!selectedRoleId.value || !currentData.value?.id) {
    message.warning('请先在左侧选择一个角色');
    return;
  }

  if (selectedRoleReadonly.value) {
    message.warning('超级管理员为系统内置角色，默认只读');
    return;
  }

  try {
    savingMenus.value = true;
    await setRoleMenusApi(currentData.value.id, targetMenuKeys.value);
    await updateRoleApi(currentData.value.id, {
      code: currentData.value.code,
      description: currentData.value.description ?? '',
      home_path: currentData.value.home_path || null,
      name: currentData.value.name,
      status: currentData.value.status,
    });
    await fetchList();
    message.success('菜单授权已保存');
  } catch (error) {
    console.error(error);
  } finally {
    savingMenus.value = false;
  }
}

function handleMenuTreeCheck(
  checked:
    | Key[]
    | {
        checked: Key[];
        halfChecked: Key[];
      },
) {
  if (selectedRoleReadonly.value) {
    return;
  }

  const keys = Array.isArray(checked) ? checked : checked.checked;
  targetMenuKeys.value = keys.map((item) => String(item));
  const currentHomePath = currentData.value?.home_path;
  if (
    currentHomePath &&
    !targetMenuKeys.value
      .map((key) => menuMap.value.get(key))
      .some(
        (menu) =>
          canUseAsHome(menu) && resolveMenuHomePath(menu) === currentHomePath,
      )
  ) {
    currentData.value.home_path = null;
  }
}

function removeSelectedMenu(menuId: string) {
  if (selectedRoleReadonly.value) {
    return;
  }

  targetMenuKeys.value = targetMenuKeys.value.filter((id) => id !== menuId);
  const removedMenu = menuMap.value.get(menuId);
  if (
    resolveMenuHomePath(removedMenu) &&
    currentData.value?.home_path === resolveMenuHomePath(removedMenu)
  ) {
    currentData.value.home_path = null;
  }
}
</script>

<template>
  <Page
    auto-content-height
    content-class="p-4 bg-background-deep flex flex-col"
    description="配置系统角色及其对应的功能权限。左侧管理角色，右侧进行菜单授权与属性配置。"
    title="角色权限管理"
  >
    <template #extra>
      <Space :size="12">
        <Tooltip title="刷新列表">
          <Button @click="fetchList" class="flex items-center justify-center">
            <template #icon><IconifyIcon icon="lucide:rotate-cw" /></template>
          </Button>
        </Tooltip>
        <Button type="primary" @click="handleAddRole" class="flex items-center gap-2">
          <template #icon><IconifyIcon icon="lucide:shield-plus" /></template>
          新增角色
        </Button>
      </Space>
    </template>

    <Row :gutter="16" class="flex-1 min-h-0">
      <!-- 左侧：角色列表 -->
      <Col :span="8" class="h-full">
        <Card
          class="h-full flex flex-col border-border"
          :body-style="{ flex: 1, overflow: 'hidden', padding: '12px', display: 'flex', flexDirection: 'column' }"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 bg-primary rounded-full"></div>
              <span>角色名册</span>
              <Tag class="ml-auto" :bordered="false" color="blue">{{ filteredRoles.length }} 项</Tag>
            </div>
          </template>

          <div class="px-1 mb-4">
            <Input
              v-model:value="searchValue"
              placeholder="搜索角色名/编码..."
              allow-clear
              class="search-input"
            >
              <template #prefix><IconifyIcon icon="lucide:search" class="text-gray-400" /></template>
            </Input>
          </div>
          
          <div class="flex-1 overflow-auto custom-scrollbar pr-1">
            <List
              v-if="filteredRoles.length"
              item-layout="horizontal"
              :data-source="filteredRoles"
              class="role-list"
              :split="false"
            >
              <template #renderItem="{ item }">
                <div
                  class="role-item-wrapper group relative mb-3 cursor-pointer rounded-2xl border border-transparent p-4 transition-all duration-300"
                  :class="{ 
                    'bg-accent/30 hover:bg-accent/60': selectedRoleId !== item.id,
                    'is-selected': selectedRoleId === item.id
                  }"
                  @click="handleSelect(item)"
                >
                  <div class="flex items-start gap-4">
                    <div 
                      class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      :class="item.status ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'"
                    >
                      <IconifyIcon :icon="isReadonlyRole(item) ? 'lucide:shield-check' : 'lucide:shield'" size="20" />
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span class="font-semibold text-foreground truncate">{{ item.name }}</span>
                        <Tag v-if="isReadonlyRole(item)" color="gold" class="m-0 px-1.5 text-[10px]" :bordered="false">只读</Tag>
                        <Tag v-else-if="!item.status" color="default" class="m-0 px-1.5 text-[10px]" :bordered="false">未启用</Tag>
                      </div>
                      <div class="text-[11px] text-gray-400 truncate mt-0.5 uppercase tracking-wider">{{ item.code }}</div>
                    </div>

                    <div class="action-btn-group opacity-0 transition-opacity">
                      <Space :size="4">
                        <Button 
                          v-if="!isReadonlyRole(item)"
                          type="text" 
                          size="small" 
                          class="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-background-deep hover:text-primary"
                          @click.stop="handleEditRole(item)"
                        >
                          <template #icon><IconifyIcon icon="lucide:pencil" size="14" /></template>
                        </Button>
                        <Button 
                          v-if="!isReadonlyRole(item)"
                          type="text" 
                          danger 
                          size="small" 
                          class="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-red-50"
                          @click.stop="handleDelete(item)"
                        >
                          <template #icon><IconifyIcon icon="lucide:trash-2" size="14" /></template>
                        </Button>
                      </Space>
                    </div>
                  </div>
                </div>
              </template>
            </List>
            <Empty v-else-if="!loading" description="未找到匹配角色" class="mt-20" />
            <div v-else class="text-center py-20">
              <IconifyIcon icon="lucide:loader-2" class="text-2xl text-primary animate-spin" />
              <div class="text-gray-400 mt-2 text-sm">资源加载中...</div>
            </div>
          </div>
        </Card>
      </Col>

      <!-- 右侧：菜单授权 -->
      <Col :span="16" class="h-full">
        <Card
          class="h-full flex flex-col shadow-sm border-border"
          :body-style="{ flex: 1, overflow: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column' }"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 bg-blue-500 rounded-full"></div>
              <span>菜单授权</span>
              <span v-if="currentData" class="text-xs font-normal text-gray-400 ml-2">
                当前角色: <span class="text-foreground font-medium">{{ currentData.name }}</span>
              </span>
            </div>
          </template>

          <template #extra>
            <Space v-if="currentData">
              <Tag v-if="selectedRoleReadonly" color="orange" :bordered="false" class="m-0">系统内置只读</Tag>
              <Button
                type="primary"
                :disabled="selectedRoleReadonly"
                :loading="savingMenus"
                class="flex items-center gap-2"
                @click="handleSaveRoleMenus"
              >
                <template #icon><IconifyIcon icon="lucide:check-circle" /></template>
                保存授权
              </Button>
            </Space>
          </template>

          <div
            v-if="!currentData?.id"
            class="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background-deep text-gray-400 m-2"
          >
            <IconifyIcon icon="lucide:hand-metal" class="text-4xl text-gray-200 mb-4" />
            请先在左侧选择一个角色进行配置
          </div>
          <div v-else class="flex-1 overflow-hidden flex flex-col p-2">
            <div
              v-if="selectedRoleReadonly"
              class="mb-4 rounded-xl border border-orange-100 bg-orange-50/50 px-4 py-3 text-sm text-orange-700 flex items-center gap-3"
            >
              <IconifyIcon icon="lucide:alert-triangle" size="18" />
              超级管理员为系统内置角色，默认拥有所有权限，不允许编辑、删除或修改授权。
            </div>
            <div
              v-else
              class="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-blue-700 flex items-center gap-3"
            >
              <IconifyIcon icon="lucide:house" size="18" />
              可以直接在右侧“已选中的权限”里指定默认首页。首页只绑定角色，不再绑定用户或菜单。
            </div>
            
            <div class="flex-1 grid grid-cols-2 gap-6 min-h-0">
              <div class="flex flex-col min-h-0">
                <div class="mb-3 flex items-center justify-between">
                  <span class="text-sm font-semibold text-foreground">功能菜单树</span>
                  <span class="text-[11px] text-gray-400">勾选以授予权限</span>
                </div>
                <div class="flex-1 overflow-auto border border-border rounded-2xl p-4 bg-card custom-scrollbar">
                  <Tree
                    v-model:expandedKeys="menuTreeExpandedKeys"
                    :checked-keys="targetMenuKeys"
                    :tree-data="menuTreeData"
                    :checkable="!selectedRoleReadonly"
                    @check="handleMenuTreeCheck"
                  >
                    <template #title="{ title, path }">
                      <div class="flex flex-col py-1">
                        <span class="text-sm text-foreground">{{ title }}</span>
                        <span class="text-[10px] text-gray-400 tracking-tight">{{ path }}</span>
                      </div>
                    </template>
                  </Tree>
                </div>
              </div>

                <div class="flex flex-col min-h-0">
                  <div class="mb-3 flex items-center justify-between">
                    <span class="text-sm font-semibold text-foreground">已选中的权限</span>
                    <div class="flex items-center gap-2">
                      <Tag color="blue" :bordered="false" class="m-0 text-[10px]">{{ targetMenuKeys.length }} 项</Tag>
                    </div>
                  </div>
                  
                  <div class="flex-1 overflow-auto border border-border rounded-2xl p-3 bg-background-deep/50 custom-scrollbar space-y-2">
                    <Empty
                      v-if="!selectedMenuItems.length"
                      description="暂无选中项目"
                      class="mt-12"
                    />
                    
                    <!-- 顶部的首页展示：优化为更紧凑且独特的样式 -->
                    <div 
                      v-if="selectedHomePath" 
                      class="mb-4 bg-white border border-primary/20 rounded-xl p-3 flex items-center gap-3 shadow-[0_2px_10px_-4px_rgba(var(--primary-rgb),0.2)] relative overflow-hidden"
                    >
                      <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <IconifyIcon icon="lucide:home" size="22" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">默认登录首页</div>
                        <div class="text-sm font-bold text-foreground truncate flex items-center gap-2">
                          {{ selectedMenuItems.find(m => resolveMenuHomePath(m) === selectedHomePath)?.title || '未命名页面' }}
                          <code class="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-normal text-gray-500">{{ selectedHomePath }}</code>
                        </div>
                      </div>
                      <Tooltip title="移除首页配置">
                        <Button 
                          type="text" 
                          size="small" 
                          class="hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          @click="handleUpdateHomePath(null)"
                        >
                          <template #icon><IconifyIcon icon="lucide:x" size="16" /></template>
                        </Button>
                      </Tooltip>
                    </div>

                    <div
                      v-for="item in selectedMenuItems"
                      :key="item.id"
                      class="group relative flex items-center gap-3 rounded-xl bg-card border border-transparent p-3 transition-all duration-300 hover:border-border hover:shadow-sm"
                      :class="{ 'border-primary/50! bg-primary/[0.03] shadow-inner-sm': isActualHome(item) }"
                    >
                      <div class="flex-1 min-w-0 pl-1">
                        <div class="flex items-center gap-2">
                          <span class="truncate text-sm font-medium text-foreground">{{ item.title }}</span>
                        </div>
                        <div class="truncate text-[10px] text-gray-400 mt-0.5 font-mono opacity-60">
                          {{ item.path }}
                        </div>
                      </div>

                      <div class="flex items-center gap-1">
                        <Tooltip v-if="canUseAsHome(item)" :title="isActualHome(item) ? '当前已是首页' : '设为默认页'">
                          <Button
                            type="text"
                            size="small"
                            class="flex items-center justify-center p-1 h-8 w-8 rounded-lg transition-all"
                            :class="isActualHome(item) 
                              ? 'bg-primary text-white hover:bg-primary/90' 
                              : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'"
                            :disabled="selectedRoleReadonly"
                            @click="handleUpdateHomePath(resolveMenuHomePath(item))"
                          >
                            <template #icon>
                              <IconifyIcon 
                                :icon="isActualHome(item) ? 'lucide:check-circle' : 'lucide:circle'" 
                                size="18" 
                              />
                            </template>
                          </Button>
                        </Tooltip>
                        
                        <Button
                          v-if="!selectedRoleReadonly"
                          type="text"
                          danger
                          size="small"
                          class="opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 h-8 w-8 rounded-lg hover:bg-red-50"
                          @click="removeSelectedMenu(item.id)"
                        >
                          <template #icon><IconifyIcon icon="lucide:trash-2" size="16" /></template>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div class="mt-3 px-1 flex items-start gap-2 text-[11px] text-gray-400 leading-relaxed italic">
                    <IconifyIcon icon="lucide:info" size="14" class="mt-0.5 flex-shrink-0" />
                    <span>首页只能从已授权且可见的页面中选择；如果移除了该权限，首页设置会自动清空。</span>
                  </div>
                </div>
            </div>
          </div>
        </Card>
      </Col>
    </Row>

    <Modal
      v-model:open="roleModalOpen"
      :confirm-loading="roleModalSaving"
      :title="roleModalTitle"
      :ok-button-props="{ disabled: isReadonlyRole(roleFormState) }"
      destroy-on-close
      centered
      :width="540"
      @cancel="handleRoleModalCancel"
      @ok="handleRoleSubmit"
    >
      <Form
        ref="roleFormRef"
        :label-col="{ span: 5 }"
        :model="roleFormState"
        :wrapper-col="{ span: 18 }"
        layout="horizontal"
        class="mt-6 mb-2"
      >
        <Form.Item
          label="角色名称"
          name="name"
          :rules="[{ required: true, message: '请输入角色名称' }]"
        >
          <Input v-model:value="roleFormState.name" :disabled="isReadonlyRole(roleFormState)" placeholder="输入角色的易记名称" />
        </Form.Item>
        <Form.Item
          label="角色编码"
          name="code"
          :rules="[{ required: true, message: '请输入角色编码' }]"
        >
          <Input v-model:value="roleFormState.code" :disabled="isReadonlyRole(roleFormState)" placeholder="例如 super_admin, member_viewer" />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <Radio.Group v-model:value="roleFormState.status" :disabled="isReadonlyRole(roleFormState)" button-style="solid">
            <Radio.Button :value="true">启用</Radio.Button>
            <Radio.Button :value="false">禁用</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="描述" name="description">
          <Input.TextArea
            v-model:value="roleFormState.description"
            :disabled="isReadonlyRole(roleFormState)"
            :rows="3"
            placeholder="简要描述角色的作用和权限范围"
          />
        </Form.Item>
      </Form>
    </Modal>
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

.role-item-wrapper:hover {
  @apply border-primary/30;
}

.role-item-wrapper:hover .action-btn-group {
  opacity: 1;
}

.is-selected {
  @apply bg-card border-primary ring-[3px] ring-primary/10 shadow-sm;
  border-left-width: 4px;
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

.shadow-inner-sm {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
}

:deep(.ant-tree-node-content-wrapper) {
  border-radius: 8px;
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

:deep(.ant-tree-treenode) {
  padding-bottom: 4px !important;
}
</style>
