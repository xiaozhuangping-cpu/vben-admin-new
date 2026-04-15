import { requestClient } from '#/api/request';

import { clearRequestCache, withRequestCache } from './_cache';

export interface MdmNotificationItem {
  avatar?: string;
  content: string;
  createdAt: string;
  externalUrl?: string;
  icon?: string;
  isRead: boolean;
  level: string;
  notificationId: string;
  receiverId: string;
  routePath?: string;
  title: string;
  type: string;
}

export interface MdmNotificationListResult {
  items: MdmNotificationItem[];
  total: number;
  unreadCount: number;
}

interface NotificationListParams {
  page?: number;
  pageSize?: number;
  status?: 'all' | 'read' | 'unread';
  userId: string;
}

function isNotificationFeatureMissing(error: any) {
  const responseData = error?.response?.data ?? {};
  const message = String(
    responseData?.message ?? responseData?.error ?? error?.message ?? '',
  ).toLowerCase();

  return (
    message.includes('mdm_notification') ||
    message.includes('mdm_notifications') ||
    message.includes('mdm_notification_receivers') ||
    message.includes('mdm_notification_inbox_v') ||
    message.includes('could not find') ||
    message.includes('schema cache') ||
    message.includes('pgrst')
  );
}

function normalizeNotificationItem(
  item: Record<string, any>,
): MdmNotificationItem {
  return {
    avatar: item.avatar ?? '',
    content: item.content ?? '',
    createdAt: item.created_at ?? item.createdAt ?? '',
    externalUrl: item.external_url ?? item.externalUrl ?? '',
    icon: item.icon ?? '',
    isRead: !!item.read_at,
    level: item.level ?? 'info',
    notificationId: String(item.notification_id ?? item.notificationId ?? ''),
    receiverId: String(item.receiver_id ?? item.receiverId ?? item.id ?? ''),
    routePath: item.route_path ?? item.routePath ?? '',
    title: item.title ?? '',
    type: item.type ?? 'system',
  };
}

async function getUnreadCountApi(userId: string) {
  if (!userId) {
    return 0;
  }

  return withRequestCache(
    'mdm_notifications:unread-count',
    { userId },
    async () => {
      try {
        const response = await requestClient.get<any>(
          '/supabase-mdm/mdm_notification_inbox_v',
          {
            params: {
              limit: 1,
              read_at: 'is.null',
              select: 'receiver_id',
              user_id: `eq.${userId}`,
            },
            headers: {
              Prefer: 'count=exact',
            },
            responseReturn: 'raw',
          },
        );

        const contentRange =
          response.headers?.['content-range'] ??
          response.headers?.['Content-Range'];

        return contentRange
          ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
          : 0;
      } catch (error) {
        if (isNotificationFeatureMissing(error)) {
          return 0;
        }
        throw error;
      }
    },
    15_000,
  );
}

export function clearNotificationRequestCache() {
  clearRequestCache('mdm_notifications:recent');
  clearRequestCache('mdm_notifications:list');
  clearRequestCache('mdm_notifications:unread-count');
}

export async function getRecentNotificationListApi(
  userId: string,
  limit = 8,
  forceRefresh = false,
): Promise<MdmNotificationListResult> {
  if (!userId) {
    return {
      items: [],
      total: 0,
      unreadCount: 0,
    };
  }

  if (forceRefresh) {
    clearNotificationRequestCache();
  }

  return withRequestCache(
    'mdm_notifications:recent',
    { forceRefresh, limit, userId },
    async () => {
      try {
        const [response, unreadCount] = await Promise.all([
          requestClient.get<any>('/supabase-mdm/mdm_notification_inbox_v', {
            params: {
              limit,
              order: 'created_at.desc',
              select: '*',
              user_id: `eq.${userId}`,
            },
            headers: {
              Prefer: 'count=exact',
            },
            responseReturn: 'raw',
          }),
          getUnreadCountApi(userId),
        ]);

        const contentRange =
          response.headers?.['content-range'] ??
          response.headers?.['Content-Range'];
        const total = contentRange
          ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
          : 0;

        const items = Array.isArray(response.data?.data)
          ? response.data.data.map(normalizeNotificationItem)
          : [];

        return {
          items,
          total,
          unreadCount,
        };
      } catch (error) {
        if (isNotificationFeatureMissing(error)) {
          return {
            items: [],
            total: 0,
            unreadCount: 0,
          };
        }
        throw error;
      }
    },
    15_000,
  );
}

export async function getNotificationPageApi(
  params: NotificationListParams,
  forceRefresh = false,
): Promise<MdmNotificationListResult> {
  const { page = 1, pageSize = 20, status = 'all', userId } = params;

  if (!userId) {
    return {
      items: [],
      total: 0,
      unreadCount: 0,
    };
  }

  if (forceRefresh) {
    clearNotificationRequestCache();
  }

  return withRequestCache(
    'mdm_notifications:list',
    { forceRefresh, page, pageSize, status, userId },
    async () => {
      try {
        const query: Record<string, number | string> = {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          order: 'created_at.desc',
          select: '*',
          user_id: `eq.${userId}`,
        };

        if (status === 'read') {
          query.read_at = 'not.is.null';
        } else if (status === 'unread') {
          query.read_at = 'is.null';
        }

        const [response, unreadCount] = await Promise.all([
          requestClient.get<any>('/supabase-mdm/mdm_notification_inbox_v', {
            params: query,
            headers: {
              Prefer: 'count=exact',
            },
            responseReturn: 'raw',
          }),
          getUnreadCountApi(userId),
        ]);

        const contentRange =
          response.headers?.['content-range'] ??
          response.headers?.['Content-Range'];
        const total = contentRange
          ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
          : 0;

        const items = Array.isArray(response.data?.data)
          ? response.data.data.map(normalizeNotificationItem)
          : [];

        return {
          items,
          total,
          unreadCount,
        };
      } catch (error) {
        if (isNotificationFeatureMissing(error)) {
          return {
            items: [],
            total: 0,
            unreadCount: 0,
          };
        }
        throw error;
      }
    },
    15_000,
  );
}

export async function markNotificationReadApi(receiverId: string) {
  if (!receiverId) {
    return null;
  }

  const response = (await requestClient.request(
    `/supabase-mdm/mdm_notification_receivers?id=eq.${receiverId}&read_at=is.null`,
    {
      data: {
        read_at: new Date().toISOString(),
      },
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  )) as any;

  clearNotificationRequestCache();

  return Array.isArray(response.data?.data) ? response.data.data[0] : null;
}

export async function markAllNotificationsReadApi(userId: string) {
  if (!userId) {
    return null;
  }

  const response = (await requestClient.request(
    `/supabase-mdm/mdm_notification_receivers?user_id=eq.${userId}&read_at=is.null&is_deleted=eq.false`,
    {
      data: {
        read_at: new Date().toISOString(),
      },
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  )) as any;

  clearNotificationRequestCache();

  return Array.isArray(response.data?.data) ? response.data.data : [];
}

export async function removeNotificationApi(receiverId: string) {
  if (!receiverId) {
    return null;
  }

  const response = (await requestClient.request(
    `/supabase-mdm/mdm_notification_receivers?id=eq.${receiverId}`,
    {
      data: {
        deleted_at: new Date().toISOString(),
        is_deleted: true,
      },
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  )) as any;

  clearNotificationRequestCache();

  return Array.isArray(response.data?.data) ? response.data.data[0] : null;
}

export async function clearAllNotificationsApi(userId: string) {
  if (!userId) {
    return null;
  }

  const response = (await requestClient.request(
    `/supabase-mdm/mdm_notification_receivers?user_id=eq.${userId}&is_deleted=eq.false`,
    {
      data: {
        deleted_at: new Date().toISOString(),
        is_deleted: true,
      },
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  )) as any;

  clearNotificationRequestCache();

  return Array.isArray(response.data?.data) ? response.data.data : [];
}
