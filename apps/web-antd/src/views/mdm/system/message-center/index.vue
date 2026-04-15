<script lang="ts" setup>
import type { MdmNotificationItem } from '#/api/mdm/notification';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Badge,
  Button,
  Card,
  Empty,
  List,
  message,
  Pagination,
  Segmented,
  Space,
  Spin,
  Tag,
} from 'ant-design-vue';

import {
  getNotificationPageApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  removeNotificationApi,
} from '#/api/mdm/notification';
import { useMessageCenterStore } from '#/store';
import { formatDateTime } from '#/utils/date';

type MessageFilter = 'all' | 'read' | 'unread';

const router = useRouter();
const messageCenterStore = useMessageCenterStore();

const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const status = ref<MessageFilter>('all');
const items = ref<MdmNotificationItem[]>([]);

const userId = computed(() => String(messageCenterStore.currentUserId || ''));
const unreadCount = computed(() => messageCenterStore.unreadCount);
const statusOptions = [
  { label: '全部消息', value: 'all' },
  { label: '未读消息', value: 'unread' },
  { label: '已读消息', value: 'read' },
];

function getLevelColor(level: string) {
  switch (level) {
    case 'error': {
      return 'error';
    }
    case 'success': {
      return 'success';
    }
    case 'warning': {
      return 'warning';
    }
    default: {
      return 'processing';
    }
  }
}

function getTypeText(type: string) {
  switch (type) {
    case 'alert': {
      return '告警';
    }
    case 'approval': {
      return '审批';
    }
    case 'biz': {
      return '业务';
    }
    case 'task': {
      return '任务';
    }
    default: {
      return '系统';
    }
  }
}

async function loadList() {
  if (!userId.value) {
    items.value = [];
    total.value = 0;
    return;
  }

  loading.value = true;

  try {
    const result = await getNotificationPageApi({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value,
      userId: userId.value,
    });

    items.value = result.items;
    total.value = result.total;
  } catch (error: any) {
    message.error(error?.message || '加载消息中心失败');
  } finally {
    loading.value = false;
  }
}

async function handleMarkRead(item: MdmNotificationItem) {
  if (item.isRead) {
    return;
  }

  try {
    await markNotificationReadApi(item.receiverId);
    item.isRead = true;
    await messageCenterStore.loadRecent(8, true);
  } catch (error: any) {
    message.error(error?.message || '标记已读失败');
  }
}

async function handleReadAll() {
  if (!userId.value || unreadCount.value === 0) {
    return;
  }

  try {
    await markAllNotificationsReadApi(userId.value);
    items.value = items.value.map((item) => ({
      ...item,
      isRead: true,
    }));
    await messageCenterStore.loadRecent(8, true);
    message.success('全部消息已标记为已读');
  } catch (error: any) {
    message.error(error?.message || '全部已读失败');
  }
}

async function handleRemove(item: MdmNotificationItem) {
  try {
    await removeNotificationApi(item.receiverId);
    message.success('消息已移除');

    const nextTotal = Math.max(0, total.value - 1);
    const maxPage = Math.max(1, Math.ceil(nextTotal / pageSize.value));
    if (page.value > maxPage) {
      page.value = maxPage;
    }

    await messageCenterStore.loadRecent(8, true);
    await loadList();
  } catch (error: any) {
    message.error(error?.message || '移除消息失败');
  }
}

async function handleOpen(item: MdmNotificationItem) {
  await handleMarkRead(item);

  if (item.routePath) {
    if (/^https?:\/\//.test(item.routePath)) {
      window.open(item.routePath, '_blank', 'noopener,noreferrer');
      return;
    }
    await router.push(item.routePath);
    return;
  }

  if (item.externalUrl) {
    window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
  }
}

watch(status, () => {
  page.value = 1;
  loadList();
});

watch(
  () => [page.value, pageSize.value],
  () => {
    loadList();
  },
);

onMounted(async () => {
  await messageCenterStore.loadRecent(8, true);
  await loadList();
});
</script>

<template>
  <Page
    auto-content-height
    content-class="p-4"
    description="集中查看系统消息、业务提醒和任务通知，支持未读筛选、单条已读和批量处理。"
    title="消息中心"
  >
    <template #extra>
      <Space :size="12">
        <Segmented v-model:value="status" :options="statusOptions" />
        <Button
          :disabled="unreadCount === 0"
          type="primary"
          @click="handleReadAll"
        >
          全部已读
        </Button>
        <Button @click="loadList">
          <template #icon>
            <IconifyIcon icon="lucide:rotate-cw" />
          </template>
          刷新
        </Button>
      </Space>
    </template>

    <Card :bordered="false" class="shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-base font-semibold">收件箱</span>
          <Badge
            :count="unreadCount"
            :number-style="{ backgroundColor: '#1677ff' }"
            :overflow-count="99"
            show-zero
          />
        </div>
        <span class="text-text-secondary text-sm">共 {{ total }} 条消息</span>
      </div>

      <Spin :spinning="loading">
        <List
          v-if="items.length > 0"
          item-layout="vertical"
          :data-source="items"
        >
          <template #renderItem="{ item }">
            <List.Item class="px-0">
              <div
                class="flex flex-col gap-3 rounded-2xl border p-4 transition-colors md:flex-row md:items-start md:justify-between"
                :class="
                  item.isRead
                    ? 'border-border bg-background'
                    : 'border-blue-200 bg-blue-50/60'
                "
              >
                <div class="min-w-0 flex-1">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <Badge v-if="!item.isRead" color="#1677ff" text="未读" />
                    <Tag :bordered="false" :color="getLevelColor(item.level)">
                      {{ getTypeText(item.type) }}
                    </Tag>
                    <span class="text-text-secondary text-xs">
                      {{ formatDateTime(item.createdAt) }}
                    </span>
                  </div>
                  <div class="mb-2 text-base font-semibold">
                    {{ item.title }}
                  </div>
                  <div class="line-clamp-2 text-text-secondary">
                    {{ item.content || '无消息内容' }}
                  </div>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                  <Button
                    v-if="!item.isRead"
                    type="link"
                    @click="handleMarkRead(item)"
                  >
                    标记已读
                  </Button>
                  <Button
                    v-if="item.routePath || item.externalUrl"
                    type="link"
                    @click="handleOpen(item)"
                  >
                    查看详情
                  </Button>
                  <Button danger type="link" @click="handleRemove(item)">
                    移除
                  </Button>
                </div>
              </div>
            </List.Item>
          </template>
        </List>

        <Empty v-else description="当前筛选条件下暂无消息" class="py-16" />
      </Spin>

      <div v-if="total > pageSize" class="mt-6 flex justify-end">
        <Pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :page-size-options="['10', '20', '50']"
          :show-size-changer="true"
          :total="total"
        />
      </div>
    </Card>
  </Page>
</template>
