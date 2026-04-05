import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns() {
  return [
    { type: 'checkbox', width: 50 },
    { field: 'id', title: '流水号', width: 100 },
    { field: 'model', title: '模型名称', width: 140 },
    {
      field: 'operation',
      title: '操作类型',
      width: 100,
      slots: { default: 'operation' },
    },
    { field: 'submitter', title: '申请人', width: 100 },
    { field: 'submitTime', title: '申请时间', width: 160 },
    {
      field: 'status',
      title: '审核状态',
      width: 120,
      slots: { default: 'status' },
    },
    { field: 'remark', title: '申请备注', minWidth: 180 },
    {
      field: 'action',
      title: '操作',
      width: 180,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useAuditDetailColumns() {
  return [
    { field: 'field', title: '字段', width: 120 },
    { field: 'oldValue', title: '修改前', minWidth: 120 },
    {
      field: 'newValue',
      title: '修改后',
      minWidth: 120,
      slots: { default: 'newValue' },
    },
  ];
}
