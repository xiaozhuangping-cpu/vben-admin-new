import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';

import { message } from 'ant-design-vue';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

import { mergeDynamicMdmDataMenus } from './dynamic-mdm-data';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible('backend', {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      const resp = await getAllMenusApi();
      const menuList = resp as any[];

      // Flat to Tree transformation
      const listToTree = (list: any[], parentId: string | null = null): any[] => {
        return list
          .filter((item) => item.parent_id === parentId)
          .map((item) => {
            const children = listToTree(list, item.id);
            const menu: any = {
              name: item.name,
              path: item.path,
              component: item.component,
              meta: {
                title: item.title,
                icon: item.icon,
                order: item.order_no,
                hideMenu: item.hide_menu,
                keepAlive: item.keep_alive,
              },
            };
            if (children.length > 0) {
              menu.children = children;
            }
            return menu;
          });
      };

      let treeMenus = listToTree(menuList);
      treeMenus = await mergeDynamicMdmDataMenus(treeMenus);
      return treeMenus;
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
