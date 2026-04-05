export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'modelName', title: '对应模型', width: 140 },
    {
      field: 'version',
      title: '版本号',
      width: 100,
      slots: { default: 'version' },
    },
    {
      field: 'status',
      title: '版本状态',
      width: 120,
      slots: { default: 'status' },
    },
    { field: 'publishTime', title: '发布时间', width: 160 },
    { field: 'publisher', title: '发布人', width: 100 },
    { field: 'remark', title: '版本备注', minWidth: 200 },
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
    {
      field: 'modelId',
      label: '选择模型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '客户主体', value: '1' },
          { label: '物料主数据', value: '2' },
        ],
      },
    },
    {
      field: 'remark',
      label: '版本备注',
      component: 'InputTextArea',
      required: true,
    },
  ];
}
