import { formatDateTime } from './date';

export function formatNotificationTime(value?: null | number | string) {
  return formatDateTime(value);
}
