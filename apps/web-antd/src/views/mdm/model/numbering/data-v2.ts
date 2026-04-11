import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 60 },
    { field: 'segmentName', title: '码段名称', minWidth: 160 },
    { field: 'segmentCode', title: '码段编码', width: 160 },
    {
      field: 'numberingType',
      title: '编码类型',
      width: 120,
      slots: { default: 'numberingType' },
    },
    { field: 'prefix', title: '前缀', width: 120 },
    { field: 'suffix', title: '后缀', width: 120 },
    { field: 'dateFormat', title: '日期格式', width: 160 },
    { field: 'seqLength', title: '流水长度', width: 100 },
    { field: 'startValue', title: '起始值', width: 100 },
    { field: 'step', title: '步长', width: 90 },
    { field: 'currentValue', title: '当前流水值', width: 120 },
    {
      field: 'previewCode',
      title: '预览',
      minWidth: 220,
      slots: { default: 'previewCode' },
    },
    {
      field: 'enabled',
      title: '状态',
      width: 100,
      slots: { default: 'enabled' },
    },
    { field: 'remark', title: '备注', minWidth: 220 },
    { field: 'updatedAt', title: '更新时间', width: 180 },
    {
      field: 'action',
      title: '操作',
      width: 260,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}
