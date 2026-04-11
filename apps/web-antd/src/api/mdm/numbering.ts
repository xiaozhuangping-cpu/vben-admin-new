import dayjs from 'dayjs';

import { requestClient } from '#/api/request';

export type NumberingType = 'date' | 'date_sequence' | 'sequence';
export type ResetPolicy = 'day' | 'month' | 'none' | 'year';

export interface NumberingSegment {
  currentValue?: number;
  dateFormat?: null | string;
  enabled?: boolean;
  id?: string;
  numberingType: NumberingType;
  prefix?: string;
  previewCode?: string;
  remark?: string;
  resetPolicy?: ResetPolicy;
  segmentCode: string;
  segmentName: string;
  seqLength?: null | number;
  startValue?: number;
  step?: number;
  suffix?: string;
  updatedAt?: string;
}

export const NUMBERING_TYPE_OPTIONS = [
  { label: '流水码', value: 'sequence' },
  { label: '日期码', value: 'date' },
  { label: '日期流水码', value: 'date_sequence' },
] as const;

export const NUMBERING_TYPE_LABEL_MAP: Record<NumberingType, string> = {
  date: '日期码',
  date_sequence: '日期流水码',
  sequence: '流水码',
};

export const RESET_POLICY_OPTIONS = [
  { label: '不重置', value: 'none' },
  { label: '按年重置', value: 'year' },
  { label: '按月重置', value: 'month' },
  { label: '按日重置', value: 'day' },
] as const;

export const RESET_POLICY_LABEL_MAP: Record<ResetPolicy, string> = {
  day: '按日重置',
  month: '按月重置',
  none: '不重置',
  year: '按年重置',
};

export const DATE_FORMAT_OPTIONS = [
  { label: 'yyyy', value: 'yyyy' },
  { label: 'yyyyMM', value: 'yyyyMM' },
  { label: 'yyyyMMdd', value: 'yyyyMMdd' },
  { label: 'yyyyMMddHH', value: 'yyyyMMddHH' },
  { label: 'yyyyMMddHHmm', value: 'yyyyMMddHHmm' },
  { label: 'yyyyMMddHHmmss', value: 'yyyyMMddHHmmss' },
  { label: 'yyMM', value: 'yyMM' },
  { label: 'yyMMdd', value: 'yyMMdd' },
] as const;

export const DATE_FORMAT_VALUES = DATE_FORMAT_OPTIONS.map((item) => item.value);

const SEGMENT_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const SEGMENT_PART_PATTERN = /^[A-Za-z0-9_-]*$/;

function parseTotal(response: any) {
  const contentRange =
    response.headers?.['content-range'] ?? response.headers?.['Content-Range'];
  const totalFromHeader = contentRange
    ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
    : 0;
  return response.data?.total ?? totalFromHeader;
}

function normalizeDayjsFormat(format?: null | string) {
  if (!format) {
    return '';
  }

  return format
    .replaceAll('yyyy', 'YYYY')
    .replaceAll('yy', 'YY')
    .replaceAll('dd', 'DD');
}

function nextSequenceValue(segment: Partial<NumberingSegment>) {
  const startValue = Number(segment.startValue ?? 1);
  const step = Number(segment.step ?? 1);
  const currentValue = Number(segment.currentValue ?? 0);

  if (currentValue < startValue) {
    return startValue;
  }
  return currentValue + step;
}

function buildDatePart(segment: Partial<NumberingSegment>, bizDate = dayjs()) {
  if (segment.numberingType === 'sequence') {
    return '';
  }
  const format = normalizeDayjsFormat(segment.dateFormat);
  return format ? bizDate.format(format) : '';
}

function buildSequencePart(segment: Partial<NumberingSegment>) {
  if (segment.numberingType === 'date') {
    return '';
  }
  const seqLength = Number(segment.seqLength ?? 0);
  const nextValue = nextSequenceValue(segment);
  return String(nextValue).padStart(Math.max(seqLength, 1), '0');
}

export function buildNumberingPreview(
  segment: Partial<NumberingSegment>,
  bizDate = dayjs(),
) {
  const prefix = segment.prefix ?? '';
  const suffix = segment.suffix ?? '';
  const datePart = buildDatePart(segment, bizDate);
  const sequencePart = buildSequencePart(segment);
  return `${prefix}${datePart}${sequencePart}${suffix}`;
}

export function validateNumberingSegmentInput(
  data: Partial<NumberingSegment>,
): NumberingSegment {
  const segmentName = String(data.segmentName ?? '').trim();
  const segmentCode = String(data.segmentCode ?? '').trim();
  const numberingType = data.numberingType as NumberingType;
  const prefix = String(data.prefix ?? '').trim();
  const suffix = String(data.suffix ?? '').trim();
  const dateFormat = data.dateFormat ? String(data.dateFormat).trim() : null;
  const remark = String(data.remark ?? '').trim();
  const startValue = Number(data.startValue ?? 1);
  const step = Number(data.step ?? 1);
  const seqLength =
    data.seqLength === null ||
    data.seqLength === undefined ||
    data.seqLength === ''
      ? null
      : Number(data.seqLength);
  const resetPolicy = (data.resetPolicy ?? 'none') as ResetPolicy;

  if (!segmentName) {
    throw new Error('请输入码段名称');
  }
  if (!segmentCode) {
    throw new Error('请输入码段编码');
  }
  if (!SEGMENT_CODE_PATTERN.test(segmentCode)) {
    throw new Error('码段编码只允许字母、数字、下划线和中划线');
  }
  if (!numberingType) {
    throw new Error('请选择编码类型');
  }
  if (!SEGMENT_PART_PATTERN.test(prefix)) {
    throw new Error('前缀只允许字母、数字、下划线和中划线');
  }
  if (!SEGMENT_PART_PATTERN.test(suffix)) {
    throw new Error('后缀只允许字母、数字、下划线和中划线');
  }
  if (!RESET_POLICY_OPTIONS.some((item) => item.value === resetPolicy)) {
    throw new Error('重置策略不合法');
  }

  if (numberingType === 'date' || numberingType === 'date_sequence') {
    if (!dateFormat) {
      throw new Error('请选择日期格式');
    }
    if (!DATE_FORMAT_VALUES.includes(dateFormat as any)) {
      throw new Error('日期格式不在允许范围内');
    }
  }

  if (numberingType === 'sequence' || numberingType === 'date_sequence') {
    if (!Number.isInteger(startValue) || startValue < 1) {
      throw new Error('起始值必须大于等于 1');
    }
    if (!Number.isInteger(step) || step < 1) {
      throw new Error('步长必须大于等于 1');
    }
    if (!Number.isInteger(seqLength) || Number(seqLength) < 1) {
      throw new Error('流水长度必须大于等于 1');
    }
    if (String(startValue).length > Number(seqLength)) {
      throw new Error('流水长度不能小于起始值位数');
    }
  }

  return {
    currentValue: Number(data.currentValue ?? 0),
    dateFormat: numberingType === 'sequence' ? null : dateFormat,
    enabled: data.enabled ?? true,
    id: data.id,
    numberingType,
    prefix,
    remark,
    resetPolicy: numberingType === 'date' ? 'none' : resetPolicy,
    segmentCode,
    segmentName,
    seqLength: numberingType === 'date' ? null : seqLength,
    startValue: numberingType === 'date' ? 1 : startValue,
    step: numberingType === 'date' ? 1 : step,
    suffix,
    updatedAt: data.updatedAt,
  };
}

function mapNumberingSegment(item: any): NumberingSegment {
  const segment = {
    currentValue: Number(item.current_value ?? 0),
    dateFormat: item.date_format ?? null,
    enabled: item.enabled ?? true,
    id: item.id,
    numberingType: item.numbering_type,
    prefix: item.prefix ?? '',
    remark: item.remark ?? '',
    resetPolicy: item.reset_policy ?? 'none',
    segmentCode: item.segment_code,
    segmentName: item.segment_name,
    seqLength: item.seq_length ?? null,
    startValue: Number(item.start_value ?? 1),
    step: Number(item.step ?? 1),
    suffix: item.suffix ?? '',
    updatedAt: item.updated_at ?? item.created_at ?? '',
  } as NumberingSegment;

  return {
    ...segment,
    previewCode: buildNumberingPreview(segment),
  };
}

export async function getNumberingSegmentListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_numbering_segments',
    {
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
    },
  );

  const items = (
    Array.isArray(response.data?.data) ? response.data.data : []
  ).map((item: any) => mapNumberingSegment(item));

  return {
    items,
    total: parseTotal(response),
  };
}

export async function getNumberingSegmentOptionsApi() {
  const { items } = await getNumberingSegmentListApi({
    enabled: 'eq.true',
    pageSize: 1000,
  });

  return items.map((item) => ({
    label: `${item.segmentName} (${item.segmentCode})`,
    value: item.id ?? '',
  }));
}

export async function createNumberingSegmentApi(
  data: Partial<NumberingSegment>,
) {
  const payload = validateNumberingSegmentInput(data);
  return requestClient.post('/supabase-mdm/mdm_numbering_segments', {
    current_value: payload.currentValue ?? 0,
    date_format: payload.dateFormat,
    enabled: payload.enabled ?? true,
    numbering_type: payload.numberingType,
    prefix: payload.prefix ?? '',
    remark: payload.remark ?? '',
    reset_policy: payload.resetPolicy ?? 'none',
    segment_code: payload.segmentCode,
    segment_name: payload.segmentName,
    seq_length: payload.seqLength,
    start_value: payload.startValue ?? 1,
    step: payload.step ?? 1,
    suffix: payload.suffix ?? '',
  });
}

export async function updateNumberingSegmentApi(
  id: string,
  data: Partial<NumberingSegment>,
) {
  const payload = validateNumberingSegmentInput(data);
  return requestClient.request(
    `/supabase-mdm/mdm_numbering_segments?id=eq.${id}`,
    {
      data: {
        date_format: payload.dateFormat,
        enabled: payload.enabled ?? true,
        numbering_type: payload.numberingType,
        prefix: payload.prefix ?? '',
        remark: payload.remark ?? '',
        reset_policy: payload.resetPolicy ?? 'none',
        segment_code: payload.segmentCode,
        segment_name: payload.segmentName,
        seq_length: payload.seqLength,
        start_value: payload.startValue ?? 1,
        step: payload.step ?? 1,
        suffix: payload.suffix ?? '',
      },
      method: 'PATCH',
    },
  );
}

export async function deleteNumberingSegmentApi(id: string) {
  return requestClient.delete(
    `/supabase-mdm/mdm_numbering_segments?id=eq.${id}`,
  );
}

export async function updateNumberingSegmentEnabledApi(
  id: string,
  enabled: boolean,
) {
  return requestClient.request(
    `/supabase-mdm/mdm_numbering_segments?id=eq.${id}`,
    {
      data: { enabled },
      method: 'PATCH',
    },
  );
}

export async function resetNumberingSegmentApi(id: string) {
  return requestClient.post('/supabase-mdm/rpc/reset_numbering_segment', {
    p_segment_id: id,
  });
}

export async function previewNumberingSegmentApi(id: string) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/rpc/preview_numbering_segment',
    {
      p_segment_id: id,
    },
    {
      responseReturn: 'raw',
    },
  );

  return response.data?.data ?? response.data;
}

export async function generateNumberingSegmentApi(id: string) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/rpc/generate_numbering_segment',
    {
      p_segment_id: id,
    },
    {
      responseReturn: 'raw',
    },
  );

  return response.data?.data ?? response.data;
}
