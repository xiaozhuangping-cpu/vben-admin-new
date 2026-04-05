import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'targetType', title: '授权对象类型', width: 120 },
    { field: 'targetName', title: '授权对象名称', width: 140 },
    { field: 'model', title: '适用模型', width: 150 },
    { field: 'scope', title: '数据范围', minWidth: 150 },
    { field: 'rule', title: '过滤规则', minWidth: 180 },
    {
      field: 'status',
      title: '状态',
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
      field: 'targetType',
      label: '授权对象类型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '角色', value: 'role' },
          { label: '用户', value: 'user' },
          { label: '组织架构', value: 'org' },
        ],
      },
    },
    {
      field: 'targetName',
      label: '选择对象',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '如: 总经理, 财务部',
      },
    },
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
      field: 'scope',
      label: '数据访问范围',
      component: 'Select',
      componentProps: {
        options: [
          { label: '全部数据', value: 'all' },
          { label: '本部门数据', value: 'dept' },
          { label: '本人创建', value: 'self' },
          { label: '自定义 SQL', value: 'custom' },
        ],
      },
    },
    {
      field: 'rule',
      label: '具体过滤规则',
      component: 'InputTextArea',
      ifShow: ({ values }) => values.scope === 'custom',
    },
    {
      field: 'status',
      label: '是否启用',
      component: 'Switch',
      defaultValue: true,
    },
  ];
}
