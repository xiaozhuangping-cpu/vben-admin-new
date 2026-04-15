<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine, SvgDownloadIcon } from '@vben/icons';

import { Alert, Button, Empty, message, Table, Upload } from 'ant-design-vue';

import { getDictItemOptionsApi } from '#/api/mdm/dict';
import {
  createDynamicMasterDataRecordApi,
  getDynamicMasterDataRecordsApi,
} from '#/api/mdm/master-data';
import {
  getModelDefinitionDetailApi,
  getModelFieldListApi,
} from '#/api/mdm/model-definition';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);
const fileList = ref<UploadFile[]>([]);
const importing = ref(false);
const importResult = ref<{
  failedCount: number;
  failures: Array<{ field: string; message: string; rowNo: number; }>;
  successCount: number;
}>({
  failedCount: 0,
  failures: [],
  successCount: 0,
});
const dictOptionsMap = ref<
  Record<string, Array<{ label: string; value: string }>>
>({});
const relationMetaMap = ref<
  Record<
    string,
    {
      idMap: Map<string, string>;
      tableName: string;
      titleFieldCode: string;
      titleMap: Map<string, string>;
    }
  >
>({});

const importableFields = computed(() =>
  (currentData.value?.fields || [])
    .filter(
      (field: any) =>
        field.status !== false &&
        !field.systemField &&
        field.dataType !== 'attachment',
    )
    .sort((a: any, b: any) => Number(a.sort ?? 10) - Number(b.sort ?? 10)),
);

const resultColumns = [
  { dataIndex: 'rowNo', key: 'rowNo', title: '行号', width: 80 },
  { dataIndex: 'field', key: 'field', title: '字段', width: 180 },
  { dataIndex: 'message', key: 'message', title: '错误信息' },
];

function escapeExcelCell(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeFieldCode(code?: string) {
  return String(code || '')
    .trim()
    .toLowerCase();
}

function downloadExcel(filename: string, rows: string[][]) {
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => String.raw`<td style="mso-number-format:'\@';">${escapeExcelCell(cell)}</td>`).join('')}</tr>`,
    )
    .join('');
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body>
  <table border="1">
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
  const blob = new Blob(['\uFEFF', html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getFieldExample(field: any) {
  switch (String(field?.dataType || '')) {
    case 'boolean': {
      return '是';
    }
    case 'date': {
      return '2026-04-15';
    }
    case 'dict': {
      const firstOption = dictOptionsMap.value[field.dictCode || '']?.[0];
      return String(firstOption?.label || firstOption?.value || '');
    }
    case 'int4': {
      return '100';
    }
    case 'numeric': {
      return '100.00';
    }
    case 'relation_master': {
      return '请输入关联主数据标题';
    }
    case 'timestamptz': {
      return '2026-04-15 10:00:00';
    }
    default: {
      return '';
    }
  }
}

function getFieldRemark(field: any) {
  const parts: string[] = [];
  if (field.isRequired) {
    parts.push('必填');
  }
  if (field.dataType === 'dict' && field.dictName) {
    parts.push(`字典：${field.dictName}`);
  }
  if (field.dataType === 'relation_master' && field.relatedDefinitionName) {
    parts.push(`关联：${field.relatedDefinitionName}`);
  }
  parts.push(`类型：${field.dataType || 'text'}`);
  return parts.join('；');
}

async function ensureDictOptionsMap() {
  const dictCodes = [
    ...new Set(
      importableFields.value
        .filter((field: any) => field.dataType === 'dict' && field.dictCode)
        .map((field: any) => String(field.dictCode)),
    ),
  ];

  const entries = await Promise.all(
    dictCodes.map(async (dictCode) => [
      dictCode,
      await getDictItemOptionsApi(dictCode),
    ]),
  );
  dictOptionsMap.value = Object.fromEntries(entries);
}

async function fetchAllRows(tableName: string) {
  const rows: any[] = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    const result = await getDynamicMasterDataRecordsApi(tableName, {
      page,
      pageSize,
    });
    if (result.items.length === 0) {
      break;
    }
    rows.push(...result.items);
    if (result.items.length < pageSize) {
      break;
    }
    page += 1;
  }

  return rows;
}

async function ensureRelationMeta(relatedDefinitionId?: string) {
  const definitionId = String(relatedDefinitionId || '');
  if (!definitionId) {
    return null;
  }
  if (relationMetaMap.value[definitionId]) {
    return relationMetaMap.value[definitionId];
  }

  const [definition, fields] = await Promise.all([
    getModelDefinitionDetailApi(definitionId),
    getModelFieldListApi(definitionId),
  ]);
  const activeFields = [...fields]
    .filter((field: any) => field.status !== false)
    .toSorted((a: any, b: any) => Number(a.sort ?? 10) - Number(b.sort ?? 10));
  const titleField =
    activeFields.find((field: any) => field.isTitle) ??
    activeFields.find((field: any) => field.listVisible) ??
    activeFields[0];
  const tableName = String(definition?.tableName || '');
  if (!tableName) {
    return null;
  }

  const rows = await fetchAllRows(tableName);
  const titleFieldCode = normalizeFieldCode(titleField?.code);
  const titleMap = new Map<string, string>();
  const idMap = new Map<string, string>();

  rows.forEach((row: any) => {
    const id = String(row?.id || '').trim();
    const title = String(
      row?.[titleFieldCode] ?? row?.entityname ?? row?.name ?? row?.id ?? '',
    ).trim();
    if (id) {
      idMap.set(id.toLowerCase(), id);
    }
    if (title) {
      titleMap.set(title.toLowerCase(), id);
    }
  });

  const meta = {
    idMap,
    tableName,
    titleFieldCode,
    titleMap,
  };

  relationMetaMap.value = {
    ...relationMetaMap.value,
    [definitionId]: meta,
  };
  return meta;
}

async function handleDownloadTemplate() {
  await ensureDictOptionsMap();

  const rows = [
    importableFields.value.map((field: any) => String(field.name || '')),
    importableFields.value.map((field: any) => normalizeFieldCode(field.code)),
    importableFields.value.map((field: any) => getFieldRemark(field)),
    importableFields.value.map((field: any) => getFieldExample(field)),
  ];

  downloadExcel(
    `${String(currentData.value?.masterDataTitle || '主数据')}_导入模板.xls`,
    rows,
  );
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function parseImportRows(content: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const trs = [...doc.querySelectorAll('table tr')];
  if (trs.length < 2) {
    throw new Error('导入文件格式不正确，请先下载模板再填写数据');
  }

  const fieldCodes = [...trs[1].querySelectorAll('td,th')].map((cell) =>
    normalizeFieldCode(cell.textContent || ''),
  );
  const dataRows = trs
    .slice(3)
    .map((tr) =>
      [...tr.querySelectorAll('td,th')].map((cell) =>
        String(cell.textContent || '').trim(),
      ),
    );

  return dataRows
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row, index) => ({
      rowNo: index + 4,
      values: Object.fromEntries(
        fieldCodes.map((code, columnIndex) => [
          code,
          String(row[columnIndex] || '').trim(),
        ]),
      ),
    }));
}

async function transformCellValue(field: any, rawValue: string) {
  const value = String(rawValue || '').trim();
  if (!value) {
    return null;
  }

  switch (String(field?.dataType || '')) {
    case 'boolean': {
      if (['1', 'true', 'Y', 'y', '是'].includes(value)) {
        return true;
      }
      if (['0', 'false', 'N', 'n', '否'].includes(value)) {
        return false;
      }
      throw new Error('布尔值仅支持：是/否/true/false/1/0');
    }
    case 'int4': {
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        throw new TypeError('整数格式不正确');
      }
      return parsed;
    }
    case 'dict': {
      const options = dictOptionsMap.value[field.dictCode || ''] || [];
      const matched = options.find(
        (item) =>
          String(item.label).trim() === value ||
          String(item.value).trim() === value,
      );
      if (!matched) {
        throw new Error('字典值不存在');
      }
      return matched.value;
    }
    case 'numeric': {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        throw new TypeError('数字格式不正确');
      }
      return parsed;
    }
    case 'relation_master': {
      const meta = await ensureRelationMeta(field.relatedDefinitionId);
      const matchedId =
        meta?.idMap.get(value.toLowerCase()) ??
        meta?.titleMap.get(value.toLowerCase());
      if (!matchedId) {
        throw new Error('未匹配到关联主数据');
      }
      return matchedId;
    }
    default: {
      return value;
    }
  }
}

async function handleImport() {
  const targetFile = fileList.value[0]?.originFileObj as File | undefined;
  if (!targetFile) {
    message.warning('请先选择导入文件');
    return;
  }
  if (!currentData.value?.tableName) {
    message.warning('当前模型未发布，暂时无法导入');
    return;
  }

  importing.value = true;
  importResult.value = { failedCount: 0, failures: [], successCount: 0 };

  try {
    await ensureDictOptionsMap();
    const content = await readFileAsText(targetFile);
    const rows = parseImportRows(content);
    const failures: Array<{ field: string; message: string; rowNo: number; }> =
      [];
    let successCount = 0;

    for (const row of rows) {
      const payload: Record<string, any> = {};
      let hasError = false;

      for (const field of importableFields.value) {
        const fieldCode = normalizeFieldCode(field.code);
        const rawValue = String(row.values[fieldCode] || '').trim();

        if (!rawValue) {
          if (field.isRequired) {
            failures.push({
              field: String(field.name || field.code || ''),
              message: '必填字段不能为空',
              rowNo: row.rowNo,
            });
            hasError = true;
          }
          continue;
        }

        try {
          payload[fieldCode] = await transformCellValue(field, rawValue);
        } catch (error: any) {
          failures.push({
            field: String(field.name || field.code || ''),
            message: String(error?.message || '字段值格式不正确'),
            rowNo: row.rowNo,
          });
          hasError = true;
        }
      }

      if (hasError) {
        continue;
      }

      try {
        await createDynamicMasterDataRecordApi(currentData.value.tableName, {
          ...payload,
          status: 'draft',
        });
        successCount += 1;
      } catch (error: any) {
        failures.push({
          field: '-',
          message: String(error?.message || '保存失败'),
          rowNo: row.rowNo,
        });
      }
    }

    importResult.value = {
      failedCount: failures.length,
      failures,
      successCount,
    };

    if (successCount > 0) {
      message.success(`导入完成，成功 ${successCount} 条`);
      emit('success');
    }
    if (failures.length === 0) {
      modalApi.close();
    }
  } catch (error: any) {
    console.error('import master data failed', error);
    message.error(String(error?.message || '导入失败，请检查导入文件格式'));
  } finally {
    importing.value = false;
  }
}

function handleBeforeUpload(file: File) {
  if (
    !String(file.name || '')
      .toLowerCase()
      .endsWith('.xls')
  ) {
    message.warning('当前版本仅支持导入系统生成的 .xls 模板文件');
    return false;
  }
  fileList.value = [
    {
      name: file.name,
      originFileObj: file,
      status: 'done',
      uid: `${Date.now()}`,
    },
  ];
  return false;
}

const [Modal, modalApi] = useVbenModal({
  title: '主数据导入',
  onCancel() {
    fileList.value = [];
    importResult.value = { failedCount: 0, failures: [], successCount: 0 };
  },
  onConfirm: () => handleImport(),
  async onOpenChange(isOpen) {
    if (!isOpen) {
      fileList.value = [];
      importResult.value = { failedCount: 0, failures: [], successCount: 0 };
      return;
    }
    currentData.value = modalApi.getData<any>();
    await ensureDictOptionsMap();
  },
});
</script>

<template>
  <Modal confirm-text="开始导入" :confirm-loading="importing">
    <div class="space-y-4 p-2">
      <Alert
        message="请先下载系统生成的导入模板，按模板填写后再上传。当前版本仅支持导入模板 .xls 文件，系统字段会自动排除，导入数据默认保存为草稿。"
        show-icon
        type="info"
      />

      <div class="flex items-center gap-3">
        <Button type="primary" @click="handleDownloadTemplate">
          <SvgDownloadIcon class="mr-1 size-4" />
          下载导入模板
        </Button>
      </div>

      <div
        class="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center"
      >
        <Upload.Dragger
          accept=".xls"
          :before-upload="handleBeforeUpload"
          :file-list="fileList"
          :max-count="1"
        >
          <p class="ant-upload-drag-icon flex justify-center">
            <ArrowUpToLine class="size-10 text-gray-400" />
          </p>
          <p class="ant-upload-text">点击或拖拽导入模板文件到这里上传</p>
          <p class="ant-upload-hint">仅支持系统导出的 .xls 模板文件</p>
        </Upload.Dragger>
      </div>

      <div v-if="importResult.successCount > 0 || importResult.failedCount > 0">
        <div class="mb-3 text-sm">
          导入结果：成功 {{ importResult.successCount }} 条，失败
          {{ importResult.failedCount }} 条
        </div>
        <Table
          v-if="importResult.failures.length > 0"
          :columns="resultColumns"
          :data-source="importResult.failures"
          :pagination="false"
          :row-key="
            (record) => `${record.rowNo}-${record.field}-${record.message}`
          "
          size="small"
        />
        <Empty v-else description="本次导入没有错误记录" />
      </div>
    </div>
  </Modal>
</template>
