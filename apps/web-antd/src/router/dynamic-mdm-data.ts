import type { Router } from 'vue-router';

import type { RouteRecordStringComponent } from '@vben/types';

import {
  getDynamicMasterDataChildrenRoutes,
  loadDynamicMasterDataItems,
} from '#/views/mdm/data/shared/master-data';

import { accessRoutes } from './routes';

let loaded = false;

function toAbsoluteMdmDataPath(path: string) {
  const normalized = path.replace(/^\/+/, '');
  return `/mdm/data/${normalized}`;
}

export async function ensureDynamicMdmDataRoutes(router: Router) {
  if (!loaded) {
    await loadDynamicMasterDataItems();
    loaded = true;
  }

  const dynamicRoutes = getDynamicMasterDataChildrenRoutes();
  const mdmDataRoute = accessRoutes.find((route) => route.name === 'MdmData');
  if (!mdmDataRoute) {
    return;
  }

  mdmDataRoute.children ||= [];

  for (const route of dynamicRoutes) {
    if (!mdmDataRoute.children.some((item) => item.name === route.name)) {
      mdmDataRoute.children.push(route);
    }

    if (!router.hasRoute(String(route.name))) {
      // 只有当父级路由已经注册到 router 中时，才手动添加动态子路由
      // 否则，在 generateAccess 过程中会通过 accessRoutes 中的引用自动注册
      if (router.hasRoute('MdmData')) {
        router.addRoute('MdmData', {
          ...route,
          path: toAbsoluteMdmDataPath(String(route.path)),
        });
      }
    }
  }
}

export async function mergeDynamicMdmDataMenus(
  menus: RouteRecordStringComponent[],
) {
  await loadDynamicMasterDataItems();
  const dynamicChildren = getDynamicMasterDataChildrenRoutes().map((route) => ({
    component: 'mdm/data/maintenance/index.vue',
    meta: route.meta,
    name: route.name,
    path: toAbsoluteMdmDataPath(String(route.path)),
  }));

  return menus.map((menu) => {
    if (!['MdmData', 'MdmDataMaintenance'].includes(String(menu.name || ''))) {
      return menu;
    }

    const children = [...(menu.children || [])];
    for (const child of dynamicChildren) {
      if (!children.some((item: any) => item.name === child.name)) {
        children.push(child as any);
      }
    }

    return {
      ...menu,
      children,
    };
  });
}
