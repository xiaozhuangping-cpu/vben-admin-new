import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

export const useColumns = (): VxeGridProps<any>['columns'] => [
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
    component: 'InputTextArea',
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
