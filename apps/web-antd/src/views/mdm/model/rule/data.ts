import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'model', title: '适用模型', width: 140 },
    { field: 'field', title: '适用字段', width: 140 },
    { field: 'name', title: '规则名称', minWidth: 150 },
    {
      field: 'type',
      title: '规则类型',
      width: 120,
      slots: { default: 'type' },
    },
    { field: 'rule', title: '校验逻辑', minWidth: 150 },
    { field: 'msg', title: '错误提示', minWidth: 200 },
    {
      field: 'status',
      title: '启用状态',
      width: 100,
      slots: { default: 'status' },
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
      label: '适用模型',
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
      field: 'field',
      label: '适用字段',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '编码 (CODE)', value: 'code' },
          { label: '电子邮箱 (EMAIL)', value: 'email' },
          { label: '权重 (WEIGHT)', value: 'weight' },
        ],
      },
    },
    {
      field: 'name',
      label: '规则名称',
      component: 'Input',
      required: true,
    },
    {
      field: 'type',
      label: '规则类型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '正则表达式', value: 'regex' },
          { label: '唯一性校验', value: 'unique' },
          { label: '数值范围', value: 'range' },
          { label: '非空校验', value: 'not_null' },
        ],
      },
    },
    {
      field: 'rule',
      label: '校验表达式 / 逻辑',
      component: 'Input',
      required: true,
    },
    {
      field: 'msg',
      label: '错误提示信息',
      component: 'Input',
      required: true,
    },
    {
      field: 'status',
      label: '是否启用',
      component: 'Switch',
      defaultValue: true,
    },
  ];
}
