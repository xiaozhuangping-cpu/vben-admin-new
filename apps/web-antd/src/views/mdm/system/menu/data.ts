import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 50 },
    { field: 'title', title: '菜单标题', minWidth: 200, treeNode: true },
    { field: 'icon', title: '图标', width: 100, slots: { default: 'icon' } },
    { field: 'path', title: '路由路径', width: 200 },
    { field: 'order', title: '排序值', width: 100 },
    {
      field: 'visible',
      title: '菜单显示',
      width: 100,
      slots: { default: 'visible' },
    },
    {
      field: 'keepAlive',
      title: '多签缓存',
      width: 100,
      slots: { default: 'keepAlive' },
    },
    {
      field: 'action',
      title: '操作',
      width: 180,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useSchema() {
  return [
    { field: 'parent', label: '上级菜单', component: 'TreeSelect' },
    { field: 'title', label: '标题', component: 'Input', required: true },
    { field: 'icon', label: '图标', component: 'Input' },
    { field: 'path', label: '路由路径', component: 'Input', required: true },
    { field: 'component', label: '组件', component: 'Input' },
    { field: 'order', label: '排序', component: 'InputNumber' },
    {
      field: 'visible',
      label: '菜单可见',
      component: 'RadioButtonGroup',
      defaultValue: true,
      componentProps: {
        options: [
          { label: '显示', value: true },
          { label: '隐藏', value: false },
        ],
      },
    },
  ];
}
