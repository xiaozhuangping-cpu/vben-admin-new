import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { getDictItemOptionsApi } from '#/api/mdm/dict';

export function useColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 60 },
    { field: 'id', title: '任务ID', minWidth: 220 },
    { field: 'name', title: '任务名称', minWidth: 180 },
    {
      field: 'collectionType',
      title: '归集类型',
      width: 110,
      slots: { default: 'collectionType' },
    },
    { field: 'apiUrl', title: 'API地址', minWidth: 220 },
    { field: 'pluginName', title: '插件', minWidth: 160 },
    { field: 'executeStrategy', title: '执行策略', minWidth: 180 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'lastExecutedAt', title: '最后执行时间', width: 180 },
    {
      field: 'action',
      title: '操作',
      width: 260,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ];
}

export function useSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入任务名称',
      },
      fieldName: 'name',
      label: '任务名称',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: 'API', value: 'api' },
          { label: '插件', value: 'plugin' },
        ],
        placeholder: '请选择归集类型',
      },
      defaultValue: 'api',
      fieldName: 'collectionType',
      label: '归集类型',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入API地址，例如：https://example.com/api/mdm',
      },
      fieldName: 'apiUrl',
      label: 'API地址',
      dependencies: {
        show: (values) => values.collectionType === 'api',
        rules: ({ collectionType }) =>
          collectionType === 'api' ? 'required' : undefined,
        triggerFields: ['collectionType'],
      },
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => await getDictItemOptionsApi('mdm_model_plugin'),
        allowClear: true,
        optionFilterProp: 'label',
        placeholder: '请选择插件',
        showSearch: true,
      },
      fieldName: 'pluginCode',
      label: '插件',
      dependencies: {
        show: (values) => values.collectionType === 'plugin',
        rules: ({ collectionType }) =>
          collectionType === 'plugin' ? 'selectRequired' : undefined,
        triggerFields: ['collectionType'],
      },
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入cron表达式，例如：0 */1 * * *',
      },
      fieldName: 'executeStrategy',
      label: '执行策略',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '启用', value: 'enabled' },
          { label: '停用', value: 'disabled' },
        ],
      },
      defaultValue: 'enabled',
      fieldName: 'status',
      label: '状态',
    },
  ];
}

export function useSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'taskName',
      label: '任务名称',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: 'API', value: 'eq.api' },
          { label: '插件', value: 'eq.plugin' },
        ],
      },
      fieldName: 'collection_type',
      label: '归集类型',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '启用', value: 'eq.enabled' },
          { label: '停用', value: 'eq.disabled' },
        ],
      },
      fieldName: 'status',
      label: '状态',
    },
  ];
}
