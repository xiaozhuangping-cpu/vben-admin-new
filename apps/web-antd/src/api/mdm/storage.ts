import type { UploadFile } from 'ant-design-vue';

import { useAccessStore } from '@vben/stores';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DEFAULT_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'mdm-files';

function getAuthHeaders() {
  const accessToken = useAccessStore().accessToken;

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
  };
}

function sanitizeFileName(fileName: string) {
  const index = fileName.lastIndexOf('.');
  const baseName = index >= 0 ? fileName.slice(0, index) : fileName;
  const ext = index >= 0 ? fileName.slice(index) : '';

  return `${baseName.replace(/[^a-zA-Z0-9_-]+/g, '_')}${ext}`;
}

function encodeObjectPath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((item) => encodeURIComponent(item))
    .join('/');
}

function buildPublicUrl(bucket: string, objectPath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeObjectPath(objectPath)}`;
}

export async function uploadFileToSupabaseStorage(
  file: File,
  options: {
    bucket?: string;
    fieldCode: string;
    tableName: string;
  },
) {
  const bucket = options.bucket || DEFAULT_BUCKET;
  const objectPath = [
    'mdm',
    options.tableName,
    options.fieldCode,
    `${Date.now()}-${sanitizeFileName(file.name)}`,
  ].join('/');

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`,
    {
      body: file,
      headers: {
        ...getAuthHeaders(),
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      method: 'POST',
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '上传附件失败');
  }

  return {
    name: file.name,
    path: objectPath,
    size: file.size,
    type: file.type,
    url: buildPublicUrl(bucket, objectPath),
  };
}

function getAttachmentUrl(value: any) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.url || value.path || '';
}

function getAttachmentName(value: any, index: number) {
  if (!value) {
    return `附件${index + 1}`;
  }
  if (typeof value === 'string') {
    const segments = value.split('/');
    return segments.at(-1) || `附件${index + 1}`;
  }
  return value.name || `附件${index + 1}`;
}

export function normalizeAttachmentValue(
  value: any,
  multiple: boolean,
): UploadFile[] {
  const normalizedList = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  return normalizedList
    .map((item, index) => {
      const url = getAttachmentUrl(item);
      if (!url) {
        return null;
      }

      return {
        name: getAttachmentName(item, index),
        status: 'done',
        uid: `${index}-${url}`,
        url,
      } satisfies UploadFile;
    })
    .filter(Boolean)
    .slice(0, multiple ? undefined : 1) as UploadFile[];
}

export function serializeAttachmentValue(value: any, multiple: boolean) {
  const fileList = Array.isArray(value) ? value : [];
  const urls = fileList
    .map((item: any) => item?.url || item?.response?.url)
    .filter(Boolean);

  return multiple ? urls : urls.slice(0, 1);
}
