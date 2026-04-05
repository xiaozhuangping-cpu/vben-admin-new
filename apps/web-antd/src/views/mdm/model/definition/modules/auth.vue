<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { Transfer, Alert } from 'ant-design-vue';
import { ref } from 'vue';

const mockOrgData = [
  { key: '1', title: '集团总部' },
  { key: '2', title: '财务部' },
  { key: '3', title: 'IT中心' },
  { key: '4', title: '华东分部' },
  { key: '5', title: '华南分部' },
];

const targetKeys = ref<string[]>(['1', '3']);

const [Modal, modalApi] = useVbenModal({
  title: '模型权限授权',
  onConfirm: () => {
    modalApi.close();
  },
});
</script>

<template>
  <Modal>
    <div class="p-6">
      <Alert
        message="配置该数据模型的访问与管理权限。只有被授权的组织或角色才能对该模型及其数据进行操作。"
        type="info"
        show-icon
        class="mb-4"
      />
      <div class="font-bold mb-2">选择授权对象 (部门/组织)</div>
      <Transfer
        v-model:target-keys="targetKeys"
        :data-source="mockOrgData"
        :render="(item) => item.title"
        :list-style="{ width: '300px', height: '400px' }"
      />
    </div>
  </Modal>
</template>
