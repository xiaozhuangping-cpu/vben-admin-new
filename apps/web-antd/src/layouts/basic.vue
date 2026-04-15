<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Badge, Button, Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';
import { useAuthStore, useMessageCenterStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const messageCenterStore = useMessageCenterStore();
const { destroyWatermark, updateWatermark } = useWatermark();

const notifications = computed(() => messageCenterStore.topNotifications);
const unreadCount = computed(() => messageCenterStore.unreadCount);

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  messageCenterStore.stopPolling();
  await authStore.logout(false);

  if (window.location.pathname !== '/auth/login') {
    window.location.replace('/auth/login');
  }
}

async function handleNoticeClear() {
  await messageCenterStore.clearAll();
}

async function markRead(id: number | string) {
  await messageCenterStore.markRead(id);
}

async function remove(id: number | string) {
  await messageCenterStore.remove(id);
}

async function handleMakeAll() {
  await messageCenterStore.makeAllRead();
}

function openMessageCenter() {
  router.push({ name: 'MdmSystemMessageCenter' });
}

function handleWindowFocus() {
  messageCenterStore.refreshNow().catch(() => undefined);
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    messageCenterStore.refreshNow().catch(() => undefined);
  }
}

watch(
  () => userStore.userInfo?.mdmUserId,
  async (userId) => {
    if (!userId) {
      messageCenterStore.stopPolling();
      return;
    }

    try {
      await messageCenterStore.loadRecent();
    } catch {
      // Keep layout usable even if the message module is not initialized yet.
    }
    messageCenterStore.startPolling();
  },
  {
    immediate: true,
  },
);

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
  }),
  async ({ enable, content }) => {
    if (enable) {
      await updateWatermark({
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);

onBeforeUnmount(() => {
  messageCenterStore.stopPolling();
  window.removeEventListener('focus', handleWindowFocus);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

onMounted(() => {
  window.addEventListener('focus', handleWindowFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        description="ann.vben@gmail.com"
        tag-text="Pro"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <div class="flex items-center gap-1">
        <Badge :count="unreadCount" :overflow-count="99">
          <Notification
            :dot="false"
            :notifications="notifications"
            @clear="handleNoticeClear"
            @view-all="openMessageCenter"
            @read="(item) => item.id && markRead(item.id)"
            @remove="(item) => item.id && remove(item.id)"
            @make-all="handleMakeAll"
          />
        </Badge>
        <Tooltip title="消息中心">
          <Button type="text" @click="openMessageCenter">
            <template #icon>
              <IconifyIcon icon="lucide:inbox" />
            </template>
          </Button>
        </Tooltip>
      </div>
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
