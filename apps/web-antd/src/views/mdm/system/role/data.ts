import type { VbenFormSchema } from '#/adapter/form';

export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'name', title: '角色名称', width: 140 },
    { field: 'code', title: '角色编码', width: 140 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'description', title: '描述', minWidth: 200 },
    {
      field: 'action',
      title: '操作',
      width: 180,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '角色名称',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'code',
      label: '角色编码',
      component: 'Input',
      rules: 'required',
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
    {
      fieldName: 'description',
      label: '描述',
      component: 'Textarea',
    },
  ];
}
