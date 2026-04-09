export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'name', title: '用户组名称', width: 150 },
    { field: 'code', title: '用户组编码', width: 150 },
    { field: 'description', title: '描述', minWidth: 200 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'createTime', title: '创建时间', width: 160 },
    {
      field: 'action',
      title: '操作',
      width: 220,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useSchema() {
  return [
    {
      fieldName: 'name',
      label: '用户组名称',
      component: 'Input',
      rules: 'required',
      defaultValue: '',
    },
    {
      fieldName: 'code',
      label: '用户组编码',
      component: 'Input',
      rules: 'required',
      defaultValue: '',
    },
    {
      fieldName: 'description',
      label: '描述',
      component: 'Textarea',
      defaultValue: '',
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'RadioGroup',
      defaultValue: true,
      componentProps: {
        options: [
          { label: '启用', value: true },
          { label: '禁用', value: false },
        ],
      },
    },
  ];
}
