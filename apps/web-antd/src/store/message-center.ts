import type { NotificationItem } from '@vben/layouts';

import type { MdmNotificationItem } from '#/api/mdm/notification';

import { computed, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import { clearAllNotificationsApi, getRecentNotificationListApi, markAllNotificationsReadApi, markNotificationReadApi, removeNotificationApi } from '#/api/mdm/notification';
import { formatNotificationTime } from '#/utils/notification';

export const useMessageCenterStore = defineStore('message-center', () => {
  const userStore = useUserStore();

  const loading = ref(false);
  const notifications = ref<MdmNotificationItem[]>([]);
  const unreadCount = ref(0);

  let timer: null | ReturnType<typeof setInterval> = null;
  let refreshTask: null | Promise<void> = null;

  const currentUserId = computed(() =>
    String(userStore.userInfo?.mdmUserId || ''),
  );

  const topNotifications = computed<NotificationItem[]>(() =>
    notifications.value.map((item) => ({
      avatar: item.avatar || '',
      id: item.receiverId,
      isRead: item.isRead,
      link: item.routePath || item.externalUrl || undefined,
      message: item.content,
      title: item.title,
      date: formatNotificationTime(item.createdAt),
    })),
  );

  async function loadRecent(limit = 8, silent = false, forceRefresh = false) {
    const userId = currentUserId.value;
    if (!userId) {
      notifications.value = [];
      unreadCount.value = 0;
      return;
    }

    if (refreshTask) {
      return refreshTask;
    }

    if (!silent) {
      loading.value = true;
    }

    refreshTask = (async () => {
      try {
        const result = await getRecentNotificationListApi(
          userId,
          limit,
          forceRefresh,
        );
        notifications.value = result.items;
        unreadCount.value = result.unreadCount;
      } finally {
        refreshTask = null;
        if (!silent) {
          loading.value = false;
        }
      }
    })();

    return refreshTask;
  }

  async function markRead(receiverId: number | string) {
    const id = String(receiverId || '');
    if (!id) {
      return;
    }

    await markNotificationReadApi(id);

    const target = notifications.value.find((item) => item.receiverId === id);
    if (target && !target.isRead) {
      target.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function makeAllRead() {
    const userId = currentUserId.value;
    if (!userId || unreadCount.value === 0) {
      return;
    }

    await markAllNotificationsReadApi(userId);
    notifications.value = notifications.value.map((item) => ({
      ...item,
      isRead: true,
    }));
    unreadCount.value = 0;
  }

  async function remove(receiverId: number | string) {
    const id = String(receiverId || '');
    if (!id) {
      return;
    }

    await removeNotificationApi(id);
    const target = notifications.value.find((item) => item.receiverId === id);
    notifications.value = notifications.value.filter(
      (item) => item.receiverId !== id,
    );
    if (target && !target.isRead) {
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function clearAll() {
    const userId = currentUserId.value;
    if (!userId || notifications.value.length === 0) {
      return;
    }

    await clearAllNotificationsApi(userId);
    notifications.value = [];
    unreadCount.value = 0;
  }

  async function refreshNow(limit = 8) {
    await loadRecent(limit, true, true);
  }

  function startPolling(intervalMs = 10_000) {
    if (timer) {
      return;
    }

    timer = setInterval(() => {
      refreshNow(8).catch(() => undefined);
    }, intervalMs);
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function $reset() {
    stopPolling();
    loading.value = false;
    notifications.value = [];
    unreadCount.value = 0;
  }

  return {
    $reset,
    clearAll,
    currentUserId,
    loadRecent,
    loading,
    makeAllRead,
    markRead,
    notifications,
    refreshNow,
    remove,
    startPolling,
    stopPolling,
    topNotifications,
    unreadCount,
  };
});
