import type { Router } from 'vue-router';

import type { RouteRecordStringComponent } from '@vben/types';

import { accessRoutes } from './routes';

import {
  getDynamicMasterDataChildrenRoutes,
  loadDynamicMasterDataItems,
} from '#/views/mdm/data/shared/master-data';

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
      router.addRoute('MdmData', {
        ...route,
        path: toAbsoluteMdmDataPath(String(route.path)),
      });
    }
  }
}

export async function mergeDynamicMdmDataMenus(
  menus: RouteRecordStringComponent[],
) {
  await loadDynamicMasterDataItems();
  const dynamicChildren = getDynamicMasterDataChildrenRoutes().map((route) => ({
    meta: route.meta,
    name: route.name,
    path: toAbsoluteMdmDataPath(String(route.path)),
  }));

  return menus.map((menu) => {
    if (menu.name !== 'MdmData') {
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
