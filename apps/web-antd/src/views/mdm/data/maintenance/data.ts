import type { UploadFile } from 'ant-design-vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { ModelField } from '#/api/mdm/model-definition';

import { message } from 'ant-design-vue';

import { uploadFileToSupabaseStorage } from '#/api/mdm/storage';
import { formatDateTime } from '#/utils/date';

const STATUS_LABEL_MAP: Record<string, string> = {
  draft: '草稿',
  history: '历史版本',
  invalid: '失效',
  normal: '正常',
  pending: '待审核',
  published: '已发布',
  rejected: '审核不通过',
  revised: '已修订',
};

export const useColumns = (
  routeName?: string,
): VxeGridProps<any>['columns'] => {
  if (routeName === 'MdmDataStore') {
    return [
      { title: '序号', type: 'seq', width: 60 },
      { field: 'entityCode', title: '店铺编码', width: 140 },
      { field: 'entityName', title: '店铺名称', minWidth: 160 },
      { field: 'externalCode', title: '外部编码', width: 120 },
      { field: 'channelType', title: '渠道类型', width: 120 },
      { field: 'orgStructure', title: '组织结构', width: 140 },
      { field: 'platform', title: '所属平台', width: 120 },
      { field: 'authCode', title: '授权码', width: 120 },
      { field: 'authToken', title: '授权令牌', width: 140 },
      { field: 'authExpiry', title: '授权过期时间', width: 160 },
      { field: 'merchantId', title: '商家编号', width: 120 },
      { field: 'contact', title: '联系人', width: 100 },
      { field: 'mobile', title: '手机', width: 120 },
      { field: 'phone', title: '电话', width: 120 },
      { field: 'addressArea', title: '省市区', width: 160 },
      { field: 'addressDetail', title: '详细地址', minWidth: 200 },
      { field: 'version', title: '版本', width: 80 },
      {
        field: 'status',
        slots: { default: 'status' },
        title: '生效状态',
        width: 100,
      },
      { field: 'createBy', title: '创建人', width: 100 },
      { field: 'createTime', title: '创建时间', width: 160 },
      {
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 200,
      },
    ];
  }

  return [
    { title: '序号', type: 'seq', width: 60 },
    { field: 'entityCode', title: '主数据编码', width: 140 },
    { field: 'entityName', title: '主数据名称', minWidth: 160 },
    { field: 'version', title: '版本', width: 80 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: '生效状态',
      width: 100,
    },
    { field: 'createBy', title: '创建人', width: 100 },
    { field: 'createTime', title: '创建时间', width: 160 },
    {
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 260,
    },
  ];
};

export const buildDynamicColumns = (
  fields: ModelField[],
  dictOptionsMap: Record<string, Array<{ label: string; value: string }>> = {},
): VxeGridProps<any>['columns'] => {
  const hiddenFieldCodes = new Set(['created_by', 'id', 'updated_by']);
  const mapped = fields
    .filter((field) => field.status !== false)
    .filter((field) => !hiddenFieldCodes.has(field.code.toLowerCase()))
    .filter(
      (field) =>
        !['created_at', 'updated_at'].includes(field.code.toLowerCase()),
    )
    .filter((field) => field.dataType !== 'attachment')
    .map((field) => {
      const fieldCode = field.code.toLowerCase();
      const dictOptions = field.dictCode
        ? (dictOptionsMap[field.dictCode] ?? [])
        : [];
      let formatter:
        | ((params: { cellValue?: string }) => string)
        | undefined;

      if (fieldCode === 'status') {
        formatter = ({ cellValue }: { cellValue?: string }) => {
          if (
            cellValue === null ||
            cellValue === undefined ||
            cellValue === ''
          ) {
            return '-';
          }

          return STATUS_LABEL_MAP[String(cellValue)] ?? String(cellValue);
        };
      } else if (field.dataType === 'dict') {
        formatter = ({ cellValue }: { cellValue?: string }) => {
          if (
            cellValue === null ||
            cellValue === undefined ||
            cellValue === ''
          ) {
            return '-';
          }

          return (
            dictOptions.find((item) => item.value === String(cellValue))
              ?.label ?? String(cellValue)
          );
        };
      } else if (['date', 'timestamptz'].includes(field.dataType)) {
        formatter = ({ cellValue }: { cellValue?: string }) =>
          formatDateTime(cellValue);
      }

      return {
        field: fieldCode,
        formatter,
        minWidth: 150,
        title: field.name,
      };
    });

  return [
    { title: '序号', type: 'seq', width: 60 },
    ...mapped,
    { field: 'created_at', title: '创建时间', width: 180 },
    { field: 'updated_at', title: '更新时间', width: 180 },
    {
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 220,
    },
  ];
};

export const buildDynamicFormSchema = (
  fields: ModelField[],
  options: {
    tableName: string;
  },
): VbenFormSchema[] => {
  return fields
    .filter((field) => field.status !== false)
    .toSorted((a, b) => Number(a.sort ?? 10) - Number(b.sort ?? 10))
    .map((field) => {
      const fieldName = field.code.toLowerCase();
      const common = {
        fieldName,
        help: field.remarks || undefined,
        label: field.name,
      } satisfies Partial<VbenFormSchema>;

      if (field.dataType === 'boolean') {
        return {
          ...common,
          component: 'Switch',
          defaultValue: false,
        } satisfies VbenFormSchema;
      }

      if (field.dataType === 'date') {
        return {
          ...common,
          component: 'DatePicker',
          componentProps: {
            placeholder: `请选择${field.name}`,
            valueFormat: 'YYYY-MM-DD',
          },
        } satisfies VbenFormSchema;
      }

      if (field.dataType === 'timestamptz') {
        return {
          ...common,
          component: 'DatePicker',
          componentProps: {
            placeholder: `请选择${field.name}`,
            showTime: true,
            valueFormat: 'YYYY-MM-DD HH:mm:ss',
          },
        } satisfies VbenFormSchema;
      }

      if (field.dataType === 'int4' || field.dataType === 'numeric') {
        return {
          ...common,
          component: 'InputNumber',
          componentProps: {
            min: 0,
            placeholder: `请输入${field.name}`,
            precision:
              field.dataType === 'numeric' ? (field.precision ?? 2) : 0,
            style: { width: '100%' },
          },
        } satisfies VbenFormSchema;
      }

      if (field.dataType === 'attachment') {
        const isMultiple =
          field.attachmentMode === 'multiple' ||
          (!!field.isMultiple && field.attachmentMode !== 'single');
        const maxCount = isMultiple ? 9 : 1;

        return {
          ...common,
          component: 'Upload',
          componentProps: {
            accept:
              '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar',
            customRequest: async (uploadOptions: any) => {
              try {
                const file = uploadOptions.file as File;
                const result = await uploadFileToSupabaseStorage(file, {
                  fieldCode: field.code.toLowerCase(),
                  tableName: options.tableName,
                });

                uploadOptions.onSuccess?.(result);
              } catch (error: any) {
                message.error(error?.message || '上传附件失败');
                uploadOptions.onError?.(error);
              }
            },
            listType: 'text',
            maxCount,
            multiple: isMultiple,
            onHandleChange: (event: { file: UploadFile; fileList: UploadFile[] }) => {
              const uploadedUrl =
                event.file?.response?.url || event.file?.url || '';
              if (uploadedUrl) {
                event.file.url = uploadedUrl;
              }
              event.fileList = (event.fileList ?? []).map((item) => ({
                ...item,
                url: item.url || item.response?.url,
              }));
            },
            placeholder: `请上传${field.name}`,
          },
          rules: field.isRequired ? 'required' : undefined,
        } satisfies VbenFormSchema;
      }

      return {
        ...common,
        component: (field.length ?? 0) > 120 ? 'Textarea' : 'Input',
        componentProps: {
          maxlength: field.length ?? undefined,
          placeholder: `请输入${field.name}`,
        },
        rules: field.isRequired ? 'required' : undefined,
      } satisfies VbenFormSchema;
    });
};

export const useSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入名称',
    },
    fieldName: 'entityName',
    label: '名称',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入编码',
    },
    fieldName: 'entityCode',
    label: '编码',
    rules: 'required',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '正常', value: 'normal' },
        { label: '审核中', value: 'pending' },
        { label: '失效', value: 'invalid' },
      ],
      placeholder: '请选择状态',
    },
    fieldName: 'status',
    label: '状态',
    defaultValue: 'pending',
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '其他属性数据...',
    },
    fieldName: 'properties',
    label: '业务属性',
  },
];

export const useSearchSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    fieldName: 'entityName',
    label: '名称',
  },
  {
    component: 'Input',
    fieldName: 'entityCode',
    label: '编码',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '正常', value: 'normal' },
        { label: '审核中', value: 'pending' },
        { label: '失效', value: 'invalid' },
      ],
    },
    fieldName: 'status',
    label: '状态',
  },
];
