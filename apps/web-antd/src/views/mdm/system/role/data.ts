export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'name', title: '角色名称', width: 150 },
    { field: 'code', title: '角色标识', width: 150 },
    { field: 'description', title: '描述', minWidth: 200 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'creator', title: '创建人', width: 120 },
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
      field: 'name',
      label: '角色名称',
      component: 'Input',
      required: true,
      defaultValue: '',
    },
    {
      field: 'code',
      label: '角色标识',
      component: 'Input',
      required: true,
      defaultValue: '',
    },
    {
      field: 'description',
      label: '角色描述',
      component: 'Textarea',
      defaultValue: '',
    },
    {
      field: 'status',
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
