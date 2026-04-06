import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

export const useColumns = (
  routeName?: string,
): VxeGridProps<any>['columns'] => {
  if (routeName === 'MdmDataStore') {
    return [
      { title: '序号', type: 'seq', width: 60 },
      { field: 'entityCode', title: '店铺编码', width: 140 },
      { field: 'entityName', title: '店铺名称', minWidth: 160 },
      { field: 'externalCode', title: '外部编码', width: 120 },
      { field: 'channelType', title: '渠道类型', width: 120 },
      { field: 'orgStructure', title: '组织结构', width: 140 },
      { field: 'platform', title: '所属平台', width: 120 },
      { field: 'authCode', title: '授权码', width: 120 },
      { field: 'authToken', title: '授权令牌', width: 140 },
      { field: 'authExpiry', title: '授权过期时间', width: 160 },
      { field: 'merchantId', title: '商家编号', width: 120 },
      { field: 'contact', title: '联系人', width: 100 },
      { field: 'mobile', title: '手机', width: 120 },
      { field: 'phone', title: '电话', width: 120 },
      { field: 'addressArea', title: '省市区', width: 160 },
      { field: 'addressDetail', title: '详细地址', minWidth: 200 },
      { field: 'version', title: '版本', width: 80 },
      {
        field: 'status',
        slots: { default: 'status' },
        title: '生效状态',
        width: 100,
      },
      { field: 'createBy', title: '创建人', width: 100 },
      { field: 'createTime', title: '创建时间', width: 160 },
      {
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 200,
      },
    ];
  }

  return [
    { title: '序号', type: 'seq', width: 60 },
    { field: 'entityCode', title: '主数据编码', width: 140 },
    { field: 'entityName', title: '主数据名称', minWidth: 160 },
    { field: 'version', title: '版本', width: 80 },
    {
      field: 'status',
      slots: { default: 'status' },
      title: '生效状态',
      width: 100,
    },
    { field: 'createBy', title: '创建人', width: 100 },
    { field: 'createTime', title: '创建时间', width: 160 },
    {
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 260,
    },
  ];
};

export const useSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入名称',
    },
    fieldName: 'entityName',
    label: '名称',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入编码',
    },
    fieldName: 'entityCode',
    label: '编码',
    rules: 'required',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '正常', value: 'normal' },
        { label: '审核中', value: 'pending' },
        { label: '失效', value: 'invalid' },
      ],
      placeholder: '请选择状态',
    },
    fieldName: 'status',
    label: '状态',
    defaultValue: 'pending',
  },
  {
    component: 'InputTextArea',
    componentProps: {
      placeholder: '其他属性数据...',
    },
    fieldName: 'properties',
    label: '业务属性',
  },
];

export const useSearchSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    fieldName: 'entityName',
    label: '名称',
  },
  {
    component: 'Input',
    fieldName: 'entityCode',
    label: '编码',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '正常', value: 'normal' },
        { label: '审核中', value: 'pending' },
        { label: '失效', value: 'invalid' },
      ],
    },
    fieldName: 'status',
    label: '状态',
  },
];
