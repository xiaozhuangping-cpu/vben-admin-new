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
    { dataIndex: 'name', key: 'name', title: '显示名', width: 180 },
    { dataIndex: 'code', key: 'code', title: '编码', width: 160 },
    { dataIndex: 'value', key: 'value', title: '值', width: 160 },
    { dataIndex: 'sortNo', key: 'sortNo', title: '排序', width: 100 },
    { dataIndex: 'status', key: 'status', title: '状态', width: 100 },
    { key: 'action', title: '操作', width: 160 },
  ];
}

export function useSchema() {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '如：SYS_STATUS',
      },
      fieldName: 'code',
      label: '字典编码',
      required: true,
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '如：系统状态',
      },
      fieldName: 'name',
      label: '字典名称',
      required: true,
    },
    {
      component: 'InputNumber',
      componentProps: {
        min: 0,
      },
      defaultValue: 0,
      fieldName: 'sortNo',
      label: '排序',
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
    },
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'status',
      label: '启用',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'systemFlag',
      label: '系统字典',
    },
  ];
}
