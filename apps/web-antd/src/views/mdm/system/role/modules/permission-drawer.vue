<script lang="ts" setup>
import { ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { Tree, message } from 'ant-design-vue';
import { getMenuListApi } from '#/api/mdm/rbac-menu';
import { getRoleMenusApi, setRoleMenusApi } from '#/api/mdm/rbac-role';

const emit = defineEmits(['success']);
const treeData = ref<any[]>([]);
const checkedKeys = ref<string[]>([]);
const currentRoleId = ref<string>('');
const currentRoleName = ref<string>('');

const [Drawer, drawerApi] = useVbenDrawer({
  onConfirm: async () => {
    try {
      drawerApi.setState({ confirmLoading: true });
      await setRoleMenusApi(currentRoleId.value, checkedKeys.value);
      message.success('权限配置已保存');
      drawerApi.close();
      emit('success');
    } catch (error) {
      console.error(error);
    } finally {
      drawerApi.setState({ confirmLoading: false });
    }
  },
  onOpenChange: async (isOpen) => {
    if (isOpen) {
      const data = drawerApi.getData<any>();
      currentRoleId.value = data.id;
      currentRoleName.value = data.name || '';
      
      // 加载菜单
      const menuResp = await getMenuListApi();
      const flatList = Array.isArray(menuResp) ? menuResp : [];
      
      const listToTree = (list: any[], parentId: string | null = null): any[] => {
        return list
          .filter(item => item.parent_id === parentId)
          .map(item => ({
            key: item.id,
            title: item.title,
            children: listToTree(list, item.id)
          }));
      };
      treeData.value = listToTree(flatList);
      
      // 加载已选菜单
      const selectedKeys = await getRoleMenusApi(currentRoleId.value);
      checkedKeys.value = selectedKeys;
    }
  },
  title: '菜单授权',
});
</script>

<template>
  <Drawer>
    <div class="p-4">
      <div class="mb-3 text-sm text-gray-500">
        当前角色: <span class="font-medium text-gray-800">{{ currentRoleName || '-' }}</span>
      </div>
      <Tree
        v-model:checkedKeys="checkedKeys"
        :tree-data="treeData"
        checkable
        default-expand-all
      />
    </div>
  </Drawer>
</template>
