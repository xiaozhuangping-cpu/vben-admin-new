import { requestClient } from '#/api/request';

import { clearRequestCache, withRequestCache } from './_cache';
import { getUserGroupListApi } from './user-group';

export type LogCategory = 'collection' | 'distribution';
export type LogLevel = 'error' | 'info' | 'warning';
export type NotifyChannel = 'dingtalk' | 'site_message';

export interface LogNotificationRule {
  category: LogCategory;
  channel: NotifyChannel;
  createdAt?: string;
  groupIds: string[];
  groupNames?: string[];
  id?: string;
  level: LogLevel;
  remark?: string;
  status: boolean;
  updatedAt?: string;
}

function mapRule(
  item: any,
  groupNameMap: Map<string, string>,
): LogNotificationRule {
  const groupIds = Array.isArray(item.receiver_group_ids)
    ? item.receiver_group_ids.map(String)
    : [];

  return {
    category: item.log_category ?? 'distribution',
    channel: item.notify_channel ?? 'site_message',
    createdAt: item.created_at ?? '',
    groupIds,
    groupNames: groupIds
      .map((id) => groupNameMap.get(id))
      .filter((name): name is string => !!name),
    id: item.id,
    level: item.log_level ?? 'error',
    remark: item.remark ?? '',
    status: item.status ?? true,
    updatedAt: item.updated_at ?? '',
  };
}

function normalizeRulePayload(data: LogNotificationRule) {
  return {
    log_category: data.category,
    log_level: data.level,
    notify_channel: data.channel,
    receiver_group_ids: Array.isArray(data.groupIds) ? data.groupIds : [],
    remark: String(data.remark ?? '').trim(),
    status: data.status ?? true,
  };
}

export async function getLogNotificationRuleListApi(params: any = {}) {
  return withRequestCache(
    'mdm_log_notification_rules:list',
    params,
    async () => {
      const { page = 1, pageSize = 10, ...rest } = params;
      const [response, userGroupResult] = await Promise.all([
        requestClient.get<any>('/supabase-mdm/mdm_log_notification_rules', {
          params: {
            ...rest,
            select: '*',
            order: rest.order ?? 'updated_at.desc,created_at.desc',
            limit: pageSize,
            offset: (page - 1) * pageSize,
          },
          headers: {
            Prefer: 'count=exact',
          },
          responseReturn: 'raw',
        }),
        getUserGroupListApi({
          page: 1,
          pageSize: 1000,
        }),
      ]);

      const contentRange =
        response.headers?.['content-range'] ??
        response.headers?.['Content-Range'];
      const totalFromHeader = contentRange
        ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
        : 0;

      const groupNameMap = new Map(
        userGroupResult.items.map((item: any) => [
          String(item.id),
          String(item.name ?? ''),
        ]),
      );
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];

      return {
        items: rows.map((item: any) => mapRule(item, groupNameMap)),
        total: response.data?.total ?? totalFromHeader,
      };
    },
  );
}

export async function createLogNotificationRuleApi(data: LogNotificationRule) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/mdm_log_notification_rules',
    normalizeRulePayload(data),
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_log_notification_rules:list');

  return Array.isArray(response.data?.data) ? response.data.data[0] : null;
}

export async function updateLogNotificationRuleApi(
  id: string,
  data: LogNotificationRule,
) {
  const response = await requestClient.request<any>(
    `/supabase-mdm/mdm_log_notification_rules?id=eq.${id}`,
    {
      data: normalizeRulePayload(data),
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_log_notification_rules:list');

  return Array.isArray(response.data?.data) ? response.data.data[0] : null;
}

export async function deleteLogNotificationRuleApi(id: string) {
  await requestClient.delete(
    `/supabase-mdm/mdm_log_notification_rules?id=eq.${id}`,
  );
  clearRequestCache('mdm_log_notification_rules:list');
}
