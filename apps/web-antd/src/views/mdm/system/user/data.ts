export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'username', title: '用户名', width: 120 },
    { field: 'nickname', title: '姓名', width: 120 },
    { field: 'org', title: '所属组织', width: 150 },
    { field: 'roles', title: '角色', width: 150, slots: { default: 'roles' } },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'lastLogin', title: '最后登录时间', width: 160 },
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
    { field: 'username', label: '用户名', component: 'Input', required: true },
    { field: 'nickname', label: '姓名', component: 'Input', required: true },
  ];
}
