import type { VxeGridProps } from '#/adapter/vxe-table';

import { markRaw } from 'vue';

import IconSelect from './modules/icon-select.vue';

export function useColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 50 },
    { field: 'title', title: '菜单标题', minWidth: 200, treeNode: true },
    { field: 'icon', title: '图标', width: 100, slots: { default: 'icon' } },
    { field: 'path', title: '路由路径', width: 200 },
    { field: 'permission', title: '权限代码', width: 150 },
    { field: 'order_no', title: '排序值', width: 100 },
    {
      field: 'status',
      title: '显示状态',
      width: 100,
      slots: { default: 'visible' },
    },
    {
      field: 'keep_alive',
      title: '缓存',
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

export function useSchema(
  menuData: any[] = [],
  componentOptions: any[] = [],
  onComponentChange?: (value?: string) => void,
) {
  return [
    {
      fieldName: 'parent_id',
      label: '上级菜单',
      component: 'TreeSelect',
      componentProps: {
        fieldNames: { label: 'title', value: 'id', children: 'children' },
        treeData: menuData,
        placeholder: '请选择上级菜单 (不选为顶级)',
        allowClear: true,
        showSearch: true,
        treeDefaultExpandAll: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'title',
      label: '菜单标题',
      component: 'Input',
      required: true,
    },
    {
      fieldName: 'component',
      label: '组件路径',
      component: 'Select',
      help: '选择项目中的 Vue 组件，将自动带出路由和标识',
      colProps: { span: 24 },
      componentProps: {
        options: [
          { label: 'BasicLayout (根/目录)', value: 'BasicLayout' },
          ...componentOptions,
        ],
        showSearch: true,
        optionFilterProp: 'label',
        allowClear: true,
        style: { width: '100%' },
        onChange: (value?: string) => onComponentChange?.(value),
      },
      rules: 'required',
      required: true,
    },
    {
      fieldName: 'name',
      label: '路由名称',
      component: 'Input',
      help: '唯一英文标识，如 MdmUser',
      rules: 'required',
      required: true,
    },
    {
      fieldName: 'path',
      label: '路由路径',
      component: 'Input',
      help: '如 /mdm/system/user',
      rules: 'required',
      required: true,
    },
    {
      fieldName: 'icon',
      label: '图标',
      component: markRaw(IconSelect),
      help: '支持搜索并选择图标，下拉中会显示图标预览和名称',
      modelPropName: 'modelValue',
    },
    { fieldName: 'permission', label: '权限标识', component: 'Input', help: '对应按钮权限，如 mdm:user:edit' },
    { fieldName: 'order_no', label: '排序指标', component: 'InputNumber', defaultValue: 0, componentProps: { style: { width: '100%' } } },
    {
      fieldName: 'status',
      label: '显示状态',
      component: 'RadioGroup',
      defaultValue: true,
      componentProps: {
        options: [
          { label: '显示', value: true },
          { label: '隐藏', value: false },
        ],
      },
    },
    {
      fieldName: 'keep_alive',
      label: '页面缓存',
      component: 'RadioGroup',
      defaultValue: true,
      componentProps: {
        options: [
          { label: '开启', value: true },
          { label: '关闭', value: false },
        ],
      },
    },
  ];
}
