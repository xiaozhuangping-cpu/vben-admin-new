import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'code', title: '字典编码', width: 140 },
    { field: 'name', title: '字典名称', width: 160 },
    { field: 'type', title: '分类', width: 120 },
    { field: 'itemsCount', title: '条目数', width: 100 },
    { field: 'remark', title: '备注', minWidth: 200 },
    {
      field: 'action',
      title: '操作',
      width: 180,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useItemColumns() {
  return [
    { field: 'label', title: '显示名', width: 150 },
    { field: 'value', title: '值', width: 120 },
    { field: 'sort', title: '排序', width: 80 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    {
      field: 'action',
      title: '操作',
      width: 120,
      slots: { default: 'action' },
    },
  ];
}

export function useSchema() {
  return [
    {
      field: 'code',
      label: '字典编码',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '如: SYS_STATUS',
      },
    },
    {
      field: 'name',
      label: '字典名称',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '如: 系统状态',
      },
    },
    {
      field: 'type',
      label: '字典分类',
      component: 'Select',
      componentProps: {
        options: [
          { label: '系统级', value: 'system' },
          { label: '业务级', value: 'business' },
          { label: '集成同步', value: 'sync' },
        ],
      },
    },
    {
      field: 'remark',
      label: '备注',
      component: 'InputTextArea',
    },
  ];
}
