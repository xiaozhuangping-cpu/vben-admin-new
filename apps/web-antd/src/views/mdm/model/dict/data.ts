import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 50 },
    { field: 'code', title: '字典编码', width: 140 },
    { field: 'name', title: '字典名称', width: 160 },
    {
      field: 'systemFlag',
      title: '系统字典',
      width: 100,
      slots: { default: 'systemFlag' },
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'itemsCount', title: '条目数', width: 100 },
    { field: 'sortNo', title: '排序', width: 90 },
    { field: 'remark', title: '备注', minWidth: 200 },
    {
      field: 'action',
      title: '操作',
      width: 220,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useItemColumns() {
  return [
    { field: 'name', title: '显示名', width: 150 },
    { field: 'code', title: '编码', width: 120 },
    { field: 'value', title: '值', width: 120 },
    { field: 'sortNo', title: '排序', width: 80 },
    { field: 'status', key: 'status', title: '状态', width: 100 },
    { field: 'action', key: 'action', title: '操作', width: 160 },
  ];
}

export function useSchema() {
  return [
    {
      fieldName: 'code',
      label: '字典编码',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '如: SYS_STATUS',
      },
    },
    {
      fieldName: 'name',
      label: '字典名称',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '如: 系统状态',
      },
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
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
    },
    {
      fieldName: 'status',
      label: '启用',
      component: 'Switch',
      defaultValue: true,
    },
    {
      fieldName: 'systemFlag',
      label: '系统字典',
      component: 'Switch',
      defaultValue: false,
    },
  ];
}
