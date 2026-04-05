export function useColumns() {
  return [
    { type: 'checkbox', width: 50 },
    { field: 'name', title: '权限名', minWidth: 180, treeNode: true },
    { field: 'code', title: '标识', width: 180 },
    { field: 'type', title: '类型', width: 100, slots: { default: 'type' } },
    { field: 'path', title: '路由/路径', width: 180 },
    { field: 'description', title: '描述', minWidth: 200 },
    {
      field: 'action',
      title: '操作',
      width: 150,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useSchema() {
  return [
    { field: 'parent', label: '上级权限', component: 'TreeSelect' },
    { field: 'name', label: '权限名称', component: 'Input', required: true },
    { field: 'code', label: '权限标识', component: 'Input', required: true },
    {
      field: 'type',
      label: '类型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '目录', value: 'dir' },
          { label: '菜单', value: 'menu' },
          { label: '按钮/API', value: 'api' },
        ],
      },
    },
    { field: 'path', label: '路由/路径', component: 'Input' },
    { field: 'description', label: '描述', component: 'Textarea' },
  ];
}
