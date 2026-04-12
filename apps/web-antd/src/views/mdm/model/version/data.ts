export function useColumns() {
  return [
    { type: 'seq', width: 60 },
    { field: 'modelName', title: '对应模型', minWidth: 180 },
    {
      field: 'version',
      title: '版本号',
      width: 120,
      slots: { default: 'version' },
    },
    {
      field: 'status',
      title: '版本状态',
      width: 120,
      slots: { default: 'status' },
    },
    { field: 'publishTime', title: '发布时间', width: 180 },
    { field: 'publisher', title: '发布人', width: 140 },
    { field: 'remark', title: '版本备注', minWidth: 240 },
    {
      field: 'action',
      title: '操作',
      width: 140,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}
