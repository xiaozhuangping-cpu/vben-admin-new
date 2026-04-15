import type { Router } from 'vue-router';

import type { RouteRecordStringComponent } from '@vben/types';

import { getAllMenusApi } from '#/api';
import {
  getDynamicMasterDataChildrenRoutes,
  loadDynamicMasterDataItems,
} from '#/views/mdm/data/shared/master-data';

import { accessRoutes } from './routes';

let loaded = false;

function isDynamicMasterRouteName(name: string) {
  return name.startsWith('MdmDataDynamic');
}

function collectMenuNames(menus: any[]) {
  const names = new Set<string>();

  const walk = (items: any[]) => {
    for (const item of items) {
      const name = String(item?.name || '');
      if (name) {
        names.add(name);
      }
      if (Array.isArray(item?.children) && item.children.length > 0) {
        walk(item.children);
      }
    }
  };

  walk(menus);
  return names;
}

function canUseDynamicMasterMenus(menuNames: Set<string>) {
  return menuNames.has('MdmData') || menuNames.has('MdmDataMaintenance');
}

function toAbsoluteMdmDataPath(path: string) {
  const normalized = path.replace(/^\/+/, '');
  return `/mdm/data/${normalized}`;
}

export async function ensureDynamicMdmDataRoutes(router: Router) {
  if (!loaded) {
    await loadDynamicMasterDataItems();
    loaded = true;
  }

  const allowedMenuNames = collectMenuNames(await getAllMenusApi());
  const allDynamicRoutes = getDynamicMasterDataChildrenRoutes();
  const dynamicRoutes = canUseDynamicMasterMenus(allowedMenuNames)
    ? allDynamicRoutes
    : [];
  const mdmDataRoute = accessRoutes.find((route) => route.name === 'MdmData');
  if (!mdmDataRoute) {
    return;
  }

  const staticChildren = (mdmDataRoute.children || []).filter(
    (route) => !isDynamicMasterRouteName(String(route.name || '')),
  );
  mdmDataRoute.children = [...staticChildren];

  for (const route of dynamicRoutes) {
    if (!mdmDataRoute.children.some((item) => item.name === route.name)) {
      mdmDataRoute.children.push(route);
    }

    if (!router.hasRoute(String(route.name)) && // 只有当父级路由已经注册到 router 中时，才手动添加动态子路由
      // 否则，在 generateAccess 过程中会通过 accessRoutes 中的引用自动注册
      router.hasRoute('MdmData')) {
        router.addRoute('MdmData', {
          ...route,
          path: toAbsoluteMdmDataPath(String(route.path)),
        });
      }
  }

  for (const route of allDynamicRoutes) {
    const routeName = String(route.name || '');
    if (
      (!canUseDynamicMasterMenus(allowedMenuNames) ||
        !dynamicRoutes.some((item) => String(item.name || '') === routeName)) &&
      router.hasRoute(routeName)
    ) {
      router.removeRoute(routeName);
    }
  }
}

export async function mergeDynamicMdmDataMenus(
  menus: RouteRecordStringComponent[],
) {
  await loadDynamicMasterDataItems();
  const allowedMenuNames = collectMenuNames(menus as any[]);
  if (!canUseDynamicMasterMenus(allowedMenuNames)) {
    return menus;
  }

  const dynamicChildMap = new Map(
    getDynamicMasterDataChildrenRoutes().map((route) => [
      String(route.name || ''),
      {
        component: 'mdm/data/maintenance/index.vue',
        meta: route.meta,
        name: route.name,
        path: toAbsoluteMdmDataPath(String(route.path)),
      },
    ]),
  );

  return menus.map((menu) => {
    if (!['MdmData', 'MdmDataMaintenance'].includes(String(menu.name || ''))) {
      return menu;
    }

    const existingChildren = menu.children || [];
    const children = existingChildren.map((child: any) => {
      const dynamicChild = dynamicChildMap.get(String(child?.name || ''));
      return dynamicChild
        ? {
            ...child,
            ...dynamicChild,
            meta: {
              ...child.meta,
              ...dynamicChild.meta,
              domCached: true,
              keepAlive: true,
            },
          }
        : child;
    });

    const existingNames = new Set(
      existingChildren.map((child: any) => String(child?.name || '')),
    );
    const appendedChildren = [...dynamicChildMap.values()]
      .filter((child) => !existingNames.has(String(child.name || '')))
      .toSorted((a, b) =>
        String(a.meta?.title || '').localeCompare(
          String(b.meta?.title || ''),
          'zh-CN',
        ),
      );

    return {
      ...menu,
      children: [...children, ...appendedChildren],
    };
  });
}
