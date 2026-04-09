import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { getUserGroupListApi } from '#/api/mdm/user-group';

export const useColumns = (): VxeGridProps<any>['columns'] => [
  { title: '序号', type: 'seq', width: 60 },
  { field: 'name', title: '主题名称', minWidth: 150 },
  { field: 'code', title: '主题编码', width: 150 },
  { field: 'order', title: '排序', width: 80 },
  { field: 'description', title: '描述', minWidth: 200 },
  { field: 'userGroupName', title: '所属用户组', width: 150 },
  {
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 150,
  },
];

export const useSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入主题名称',
    },
    fieldName: 'name',
    label: '主题名称',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入主题编码',
    },
    fieldName: 'code',
    label: '主题编码',
    rules: 'required',
  },
  {
    component: 'InputNumber',
    componentProps: {
      min: 0,
      placeholder: '排序',
    },
    fieldName: 'order',
    label: '排序',
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '请输入描述',
    },
    fieldName: 'description',
    label: '描述',
  },
  {
    component: 'ApiSelect',
    componentProps: {
      api: async () => {
        const { items } = await getUserGroupListApi({ pageSize: 1000 });
        return items.map((g: any) => ({ label: g.name, value: g.id }));
      },
      placeholder: '请选择所属用户组',
    },
    fieldName: 'userGroupId',
    label: '所属用户组',
  },
];
