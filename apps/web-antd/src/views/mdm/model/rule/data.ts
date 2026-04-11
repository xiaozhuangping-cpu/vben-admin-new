import type { VxeGridProps } from '#/adapter/vxe-table';

import { getThemeListApi } from '#/api/mdm/theme';

export function useColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 50 },
    { field: 'themeName', title: '所属主题', width: 140 },
    { field: 'name', title: '规则名称', minWidth: 150 },
    { field: 'code', title: '规则编码', width: 160 },
    {
      field: 'ruleType',
      title: '规则类型',
      width: 120,
      slots: { default: 'type' },
    },
    { field: 'expression', title: '校验逻辑', minWidth: 180 },
    { field: 'errorMessage', title: '错误提示', minWidth: 200 },
    { field: 'sortNo', title: '排序', width: 90 },
    {
      field: 'status',
      title: '启用状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'updatedAt', title: '更新时间', width: 180 },
    {
      field: 'action',
      title: '操作',
      width: 140,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useSchema() {
  return [
    {
      fieldName: 'themeId',
      label: '所属主题',
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const { items } = await getThemeListApi({ pageSize: 1000 });
          return items.map((item: any) => ({
            label: item.name,
            value: item.id,
          }));
        },
        placeholder: '请选择所属主题',
      },
    },
    {
      fieldName: 'name',
      label: '规则名称',
      component: 'Input',
      required: true,
    },
    {
      fieldName: 'code',
      label: '规则编码',
      component: 'Input',
      required: true,
    },
    {
      fieldName: 'ruleType',
      label: '规则类型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '正则表达式', value: 'regex' },
          { label: '唯一性校验', value: 'unique' },
          { label: '数值范围', value: 'range' },
          { label: '长度范围', value: 'length' },
          { label: '自定义表达式', value: 'expression' },
        ],
      },
    },
    {
      fieldName: 'expression',
      label: '校验表达式 / 逻辑',
      component: 'Input',
    },
    {
      fieldName: 'errorMessage',
      label: '错误提示信息',
      component: 'Input',
      required: true,
    },
    {
      fieldName: 'sortNo',
      label: '排序',
      component: 'InputNumber',
      defaultValue: 0,
      componentProps: {
        min: 0,
      },
    },
    {
      fieldName: 'status',
      label: '是否启用',
      component: 'Switch',
      defaultValue: true,
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
    },
  ];
}
