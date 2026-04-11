import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { getModelRelationshipOptionsApi } from '#/api/mdm/model-relationship';

export const useColumns = (): VxeGridProps<any>['columns'] => [
  { type: 'seq', width: 60 },
  { field: 'sourceModelName', title: '源模型', minWidth: 180 },
  { field: 'targetModelName', title: '关联模型', minWidth: 180 },
  {
    field: 'relationType',
    title: '关系类型',
    width: 120,
    slots: { default: 'relationType' },
  },
  {
    field: 'status',
    title: '状态',
    width: 100,
    slots: { default: 'status' },
  },
  { field: 'sourceField', title: '关联主键', width: 140 },
  { field: 'targetField', title: '外键字段', width: 140 },
  { field: 'remark', title: '备注', minWidth: 180 },
  { field: 'updatedAt', title: '更新时间', width: 180 },
  {
    field: 'action',
    title: '操作',
    width: 220,
    slots: { default: 'action' },
    fixed: 'right',
  },
];

export const useSchema = (): VbenFormSchema[] => [
  {
    component: 'ApiSelect',
    componentProps: {
      api: getModelRelationshipOptionsApi,
      placeholder: '请选择源模型',
    },
    fieldName: 'sourceDefinitionId',
    label: '源模型',
    rules: 'required',
  },
  {
    component: 'ApiSelect',
    componentProps: {
      api: getModelRelationshipOptionsApi,
      placeholder: '请选择关联模型',
    },
    fieldName: 'targetDefinitionId',
    label: '关联模型',
    rules: 'required',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '一对一 (1:1)', value: '1:1' },
        { label: '一对多 (1:N)', value: '1:N' },
        { label: '多对一 (N:1)', value: 'N:1' },
        { label: '多对多 (N:N)', value: 'N:N' },
      ],
      placeholder: '请选择关系类型',
    },
    fieldName: 'relationType',
    label: '关系类型',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入源字段，例如 ID',
    },
    fieldName: 'sourceField',
    label: '关联主键',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入目标字段，例如 CUSTOMER_ID',
    },
    fieldName: 'targetField',
    label: '外键字段',
    rules: 'required',
  },
  {
    component: 'InputNumber',
    componentProps: {
      min: 0,
      placeholder: '请输入排序值',
    },
    fieldName: 'sort',
    label: '排序',
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '请输入备注',
      rows: 3,
    },
    fieldName: 'remark',
    label: '备注',
  },
];
