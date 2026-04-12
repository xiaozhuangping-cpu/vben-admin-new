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
  List,
  Input,
  Empty,
  Tag,
  Avatar,
  Tooltip,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { ref, onMounted, computed } from 'vue';
import {
  deleteUserApi,
  getRbacUserListApi as getUserListApi,
} from '#/api/mdm/rbac-user';
import FormModule from './modules/form.vue';

const allUsers = ref<any[]>([]);
const loading = ref(false);
const searchValue = ref('');
const selectedUserId = ref<string | null>(null);
const currentData = ref<any>(null);

// 分页与数据加载
async function fetchList() {
  try {
    loading.value = true;
    const resp = await getUserListApi({
      page: 1,
      pageSize: 1000,
    });
    allUsers.value = resp.items || [];
    // 默认选中第一个用户
    if (allUsers.value.length > 0 && !selectedUserId.value) {
      handleSelect(allUsers.value[0]);
    }
  } catch (err) {
    message.error('加载用户列表失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchList();
});

// 过滤后的用户列表
const filteredUsers = computed(() => {
  if (!searchValue.value) return allUsers.value;
  const s = searchValue.value.toLowerCase();
  return allUsers.value.filter(
    (u) => 
      u.username?.toLowerCase().includes(s) || 
      u.nickname?.toLowerCase().includes(s)
  );
});

function handleSelect(user: any) {
  selectedUserId.value = user.id;
  currentData.value = { ...user };
}

function handleAddUser() {
  selectedUserId.value = 'new';
  currentData.value = {
    authEmail: '',
    authUserId: '',
    confirmPassword: '',
    password: '',
    username: '',
    nickname: '',
    roleIds: [],
    roles: [],
    status: true,
  };
}

async function handleDelete(user: any) {
  Modal.confirm({
    title: '确认删除用户？',
    content: `将被永久移除的用户: ${user.username}`,
    okType: 'danger',
    centered: true,
    async onOk() {
      await deleteUserApi(user.id);
      message.success('用户已删除');
      if (selectedUserId.value === user.id) {
        currentData.value = null;
        selectedUserId.value = null;
      }
      fetchList();
    },
  });
}

function handleFormSuccess() {
  fetchList();
}

function handleFormCancel() {
  currentData.value = null;
  selectedUserId.value = null;
}
</script>

<template>
  <Page
    auto-content-height
    content-class="p-4 bg-background-deep flex flex-col"
    description="管理系统用户信息与角色分配。采用左右联动模式，左侧选择用户，右侧快捷维护属性。"
    title="用户管理"
  >
    <template #extra>
      <Space :size="12">
        <Tooltip title="刷新数据">
          <Button @click="fetchList" class="flex items-center justify-center">
            <template #icon><IconifyIcon icon="lucide:rotate-cw" /></template>
          </Button>
        </Tooltip>
        <Button type="primary" @click="handleAddUser" class="flex items-center gap-2">
          <template #icon><IconifyIcon icon="lucide:user-plus" /></template>
          新增用户
        </Button>
      </Space>
    </template>

    <Row :gutter="16" class="flex-1 min-h-0">
      <!-- 左侧：用户列表 -->
      <Col :span="8" class="h-full">
        <Card 
          class="h-full flex flex-col border-border" 
          :body-style="{ flex: 1, overflow: 'hidden', padding: '12px', display: 'flex', flexDirection: 'column' }"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 bg-primary rounded-full"></div>
              <span>用户名册</span>
              <Tag class="ml-auto" :bordered="false" color="blue">{{ filteredUsers.length }} 位</Tag>
            </div>
          </template>

          <div class="px-1 mb-4">
            <Input
              v-model:value="searchValue"
              placeholder="搜索用户名/姓名..."
              allow-clear
              class="search-input"
            >
              <template #prefix><IconifyIcon icon="lucide:search" class="text-gray-400" /></template>
            </Input>
          </div>
          
          <div class="flex-1 overflow-auto custom-scrollbar pr-1">
            <List
              v-if="filteredUsers.length"
              item-layout="horizontal"
              :data-source="filteredUsers"
              class="user-list"
              :split="false"
            >
              <template #renderItem="{ item }">
                <div
                  class="user-item-wrapper group relative mb-3 cursor-pointer rounded-2xl border border-transparent p-4 transition-all duration-300"
                  :class="{ 
                    'bg-accent/30 hover:bg-accent/60': selectedUserId !== item.id,
                    'is-selected': selectedUserId === item.id
                  }"
                  @click="handleSelect(item)"
                >
                  <div class="flex items-start gap-3">
                    <Avatar 
                      class="flex-shrink-0"
                      :size="40"
                      :class="[item.status ? 'bg-primary' : 'bg-gray-400']"
                    >
                      <template v-if="!item.nickname && !item.username">
                        <IconifyIcon icon="lucide:user" />
                      </template>
                      <template v-else>
                        {{ (item.nickname || item.username).charAt(0).toUpperCase() }}
                      </template>
                    </Avatar>
                    
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span class="font-semibold text-foreground truncate">{{ item.nickname || item.username }}</span>
                        <Tag v-if="!item.status" color="default" class="m-0 px-1.5 text-[10px]" :bordered="false">已锁定</Tag>
                      </div>
                      <div class="text-xs text-gray-500 truncate mt-0.5">{{ item.username }}</div>
                      <div class="flex flex-wrap gap-1 mt-1.5">
                        <Tag 
                          v-for="role in item.roles?.slice(0, 3)" 
                          :key="role" 
                          size="small" 
                          class="m-0 text-[10px] bg-background-deep border-none text-foreground/60"
                        >
                          {{ role }}
                        </Tag>
                        <span v-if="item.roles?.length > 3" class="text-[10px] text-gray-400">...</span>
                      </div>
                    </div>

                    <div class="action-btn-group opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        type="text" 
                        danger 
                        size="small" 
                        class="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-red-50"
                        @click.stop="handleDelete(item)"
                      >
                        <template #icon><IconifyIcon icon="lucide:trash-2" size="14" /></template>
                      </Button>
                    </div>
                  </div>
                </div>
              </template>
            </List>
            <Empty v-else-if="!loading" description="未找到匹配用户" class="mt-20" />
            <div v-else class="text-center py-20">
              <IconifyIcon icon="lucide:loader-2" class="text-2xl text-primary animate-spin" />
              <div class="text-gray-400 mt-2 text-sm">正在加载用户数据...</div>
            </div>
          </div>
        </Card>
      </Col>

      <!-- 右侧：编辑表单 -->
      <Col :span="16" class="h-full">
        <FormModule 
          :current-data="currentData" 
          class="shadow-sm border-gray-200/60"
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

.user-item-wrapper:hover {
  @apply border-primary/30;
}

.user-item-wrapper:hover .action-btn-group {
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
</style>
