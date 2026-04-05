import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'model', title: '对应模型', minWidth: 140 },
    { field: 'prefix', title: '前缀', width: 100 },
    { field: 'rule', title: '结构定义', minWidth: 180 },
    { field: 'seqLength', title: '流水号长度', width: 100 },
    { field: 'currentValue', title: '当前最大值', width: 120 },
    {
      field: 'preview',
      title: '示例预览',
      minWidth: 150,
      slots: { default: 'preview' },
    },
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
      field: 'model',
      label: '对应模型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '客户主体 (CUSTOMER)', value: 'customer' },
          { label: '物料主数据 (MATERIAL)', value: 'material' },
        ],
      },
    },
    {
      field: 'prefix',
      label: '固定前缀',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '如: CUST, MAT',
      },
    },
    {
      field: 'dateType',
      label: '日期部分',
      component: 'Select',
      componentProps: {
        options: [
          { label: '无', value: '' },
          { label: '年 (YYYY)', value: 'YYYY' },
          { label: '年月 (YYYYMM)', value: 'YYYYMM' },
          { label: '年月日 (YYYYMMDD)', value: 'YYYYMMDD' },
        ],
      },
    },
    {
      field: 'seqLength',
      label: '流水号位数',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 10,
      },
    },
    {
      field: 'step',
      label: '递增步长',
      component: 'InputNumber',
      defaultValue: 1,
    },
    {
      field: 'separator',
      label: '分隔符',
      component: 'Input',
      componentProps: {
        placeholder: '如: - , _ ',
      },
    },
  ];
}
