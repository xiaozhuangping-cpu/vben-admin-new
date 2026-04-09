import type { VbenFormSchema } from '#/adapter/form';

const ROLE_OPTIONS = [
  { label: '系统管理员', value: '系统管理员' },
  { label: '模型设计者', value: '模型设计者' },
  { label: '数据审核员', value: '数据审核员' },
  { label: '设备接入专家', value: '设备接入专家' },
  { label: '安全审计员', value: '安全审计员' },
];

export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'username', title: '用户名', width: 140 },
    { field: 'nickname', title: '姓名', width: 120 },
    { field: 'org', title: '所属组织', width: 150 },
    {
      field: 'roles',
      title: '角色',
      minWidth: 220,
      showOverflow: false,
      slots: { default: 'roles' },
    },
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
      width: 180,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'username',
      label: '用户名',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'nickname',
      label: '姓名',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'org',
      label: '所属组织',
      component: 'Input',
      defaultValue: '',
    },
    {
      fieldName: 'roles',
      label: '角色',
      component: 'Select',
      defaultValue: [],
      componentProps: {
        mode: 'multiple',
        options: ROLE_OPTIONS,
        placeholder: '请选择角色',
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'RadioGroup',
      defaultValue: true,
      componentProps: {
        options: [
          { label: '活动', value: true },
          { label: '冻结', value: false },
        ],
      },
    },
  ];
}
