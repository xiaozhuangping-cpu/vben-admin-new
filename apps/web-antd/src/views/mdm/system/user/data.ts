import type { VbenFormSchema } from '#/adapter/form';

export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'username', title: '用户名', width: 140 },
    { field: 'nickname', title: '姓名', width: 120 },
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

export function useSchema(
  roleOptions: any[] = [],
  isCreate = false,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [
    {
      fieldName: 'username',
      label: '用户名',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'authEmail',
      label: '登录邮箱',
      component: 'Input',
      componentProps: {
        placeholder: '可选，未填写时可使用用户名中的邮箱',
      },
    },
    {
      fieldName: 'nickname',
      label: '姓名',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'roleIds',
      label: '角色',
      component: 'Select',
      defaultValue: [],
      componentProps: {
        mode: 'multiple',
        options: roleOptions,
        placeholder: '请选择角色',
        style: { width: '100%' },
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

  if (isCreate) {
    schema.splice(3, 0,
      {
        fieldName: 'password',
        label: '登录密码',
        component: 'VbenInputPassword',
        rules: 'required',
        componentProps: {
          passwordStrength: true,
          placeholder: '请输入登录密码',
        },
      },
      {
        fieldName: 'confirmPassword',
        label: '确认密码',
        component: 'VbenInputPassword',
        rules: 'required',
        componentProps: {
          placeholder: '请再次输入登录密码',
        },
      },
    );
  }

  return schema;
}
