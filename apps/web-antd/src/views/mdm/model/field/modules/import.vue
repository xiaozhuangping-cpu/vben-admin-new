<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { Upload, message } from 'ant-design-vue';
import { ArrowUpToLine } from '@vben/icons';

const [Modal, modalApi] = useVbenModal({
  title: '批量导入模型字段',
  onConfirm: () => {
    message.success('导入任务已提交，请稍后查看列表');
    modalApi.close();
  },
});
</script>

<template>
  <Modal>
    <div
      class="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg"
    >
      <Upload.Dragger name="file" action="/api/mdm/model/field/import">
        <p class="ant-upload-drag-icon flex justify-center">
          <ArrowUpToLine class="size-10 text-gray-400" />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域进行上传</p>
        <p class="ant-upload-hint">
          支持 .xls, .xlsx 格式文件，单次最大支持 500 条字段
        </p>
      </Upload.Dragger>
    </div>
  </Modal>
</template>
