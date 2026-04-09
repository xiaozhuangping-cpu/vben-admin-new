export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'sourceModel', title: '原模型', minWidth: 120 },
    { field: 'targetModel', title: '关联模型', minWidth: 120 },
    {
      field: 'type',
      title: '关系类型',
      width: 120,
      slots: { default: 'type' },
    },
    { field: 'sourceField', title: '关联主键', width: 120 },
    { field: 'targetField', title: '外键字段', width: 120 },
    { field: 'remark', title: '备注', minWidth: 180 },
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
      field: 'sourceModel',
      label: '原模型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '客户主体', value: 'customer' },
          { label: '物料主数据', value: 'material' },
        ],
      },
    },
    {
      field: 'targetModel',
      label: '关联模型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '联系人', value: 'contact' },
          { label: '地址信息', value: 'address' },
        ],
      },
    },
    {
      field: 'type',
      label: '关系类型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '一对一 (1:1)', value: '1:1' },
          { label: '一对多 (1:N)', value: '1:N' },
          { label: '多对一 (N:1)', value: 'N:1' },
          { label: '多对多 (N:N)', value: 'N:N' },
        ],
      },
    },
    {
      field: 'sourceField',
      label: '关联主键',
      component: 'Input',
      required: true,
    },
    {
      field: 'targetField',
      label: '外键字段',
      component: 'Input',
      required: true,
    },
    {
      field: 'remark',
      label: '备注',
      component: 'Textarea',
    },
  ];
}
