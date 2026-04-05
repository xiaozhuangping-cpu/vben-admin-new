import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

export const useColumns = (): VxeGridProps<any>['columns'] => [
  { title: '序号', type: 'seq', width: 60 },
  { field: 'name', title: '字段名称', minWidth: 150 },
  { field: 'code', title: '字段编码', width: 140 },
  {
    field: 'dataType',
    title: '数据类型',
    width: 120,
    slots: { default: 'dataType' },
  },
  { field: 'length', title: '长度', width: 80 },
  { field: 'precision', title: '精度', width: 80 },
  {
    field: 'status',
    slots: { default: 'status' },
    title: '状态',
    width: 80,
  },
  {
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 150,
  },
];

export const useSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入字段名称',
    },
    fieldName: 'name',
    label: '字段名称',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入字段编码 (如: USER_NAME)',
    },
    fieldName: 'code',
    label: '字段编码',
    rules: 'required',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: 'String', value: 'String' },
        { label: 'Number', value: 'Number' },
        { label: 'Date', value: 'Date' },
        { label: 'Time', value: 'Time' },
        { label: 'File', value: 'File' },
        { label: 'Image', value: 'Image' },
      ],
      placeholder: '请选择数据类型',
    },
    fieldName: 'dataType',
    label: '数据类型',
    rules: 'required',
  },
  {
    component: 'InputNumber',
    componentProps: {
      min: 1,
      placeholder: '长度',
    },
    fieldName: 'length',
    label: '长度',
    defaultValue: 255,
  },
  {
    component: 'InputNumber',
    componentProps: {
      min: 0,
      placeholder: '精度',
    },
    fieldName: 'precision',
    label: '精度',
    defaultValue: 0,
  },
  {
    component: 'RadioGroup',
    componentProps: {
      options: [
        { label: '启用', value: true },
        { label: '禁用', value: false },
      ],
    },
    fieldName: 'status',
    label: '启用状态',
    defaultValue: true,
  },
  {
    component: 'InputTextArea',
    componentProps: {
      placeholder: '请输入注释',
    },
    fieldName: 'remarks',
    label: '注释',
  },
];
