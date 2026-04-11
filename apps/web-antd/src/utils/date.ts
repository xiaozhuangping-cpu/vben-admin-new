import dayjs from 'dayjs';

export const DEFAULT_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export function formatDateTime(
  value?: null | number | string,
  fallback = '-',
): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const date = dayjs(value);
  if (!date.isValid()) {
    return String(value);
  }

  return date.format(DEFAULT_DATE_TIME_FORMAT);
}
