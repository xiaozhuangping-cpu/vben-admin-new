import type { Component, DefineComponent } from 'vue';

import type {
  AccessModeType,
  GenerateMenuAndRoutesOptions,
  RouteRecordRaw,
} from '@vben/types';

import { defineComponent, h } from 'vue';

import {
  cloneDeep,
  generateMenus,
  generateRoutesByBackend,
  generateRoutesByFrontend,
  isFunction,
  isString,
  mapTree,
} from '@vben/utils';

async function generateAccessible(
  mode: AccessModeType,
  options: GenerateMenuAndRoutesOptions,
) {
  const { router } = options;

  options.routes = cloneDeep(options.routes);

  // 生成路由
  const accessibleRoutes = await generateRoutes(mode, options);

  const root = router.getRoutes().find((item) => item.path === '/');
  const rootChildren: RouteRecordRaw[] = [];

  // 动态添加到router实例内
  accessibleRoutes.forEach((route) => {
    if (root && !route.meta?.noBasicLayout) {
      // 后端权限模式下按本次授权结果重建 Root.children，
      // 避免旧账号残留或静态业务路由持续挂在根布局下。
      if (route.children && route.children.length > 0) {
        delete route.component;
      }

      rootChildren.push(route);
    } else {
      if (route.name && router.hasRoute(route.name)) {
        router.removeRoute(route.name);
      }
      router.addRoute(route);
    }
  });

  if (root) {
    root.children = rootChildren;
    if (root.name) {
      router.removeRoute(root.name);
    }
    router.addRoute(root);
  }

  // 生成菜单
  const accessibleMenus = generateMenus(accessibleRoutes, options.router);

  return { accessibleMenus, accessibleRoutes };
}

/**
 * Generate routes
 * @param mode
 * @param options
 */
async function generateRoutes(
  mode: AccessModeType,
  options: GenerateMenuAndRoutesOptions,
) {
  const { forbiddenComponent, roles, routes } = options;

  let resultRoutes: RouteRecordRaw[] = routes;
  switch (mode) {
    case 'backend': {
      resultRoutes = await generateRoutesByBackend(options);
      break;
    }
    case 'frontend': {
      resultRoutes = await generateRoutesByFrontend(
        routes,
        roles || [],
        forbiddenComponent,
      );
      break;
    }
    case 'mixed': {
      const [frontend_resultRoutes, backend_resultRoutes] = await Promise.all([
        generateRoutesByFrontend(routes, roles || [], forbiddenComponent),
        generateRoutesByBackend(options),
      ]);
      resultRoutes = mergeRoutesByName(
        backend_resultRoutes,
        frontend_resultRoutes,
      );
      break;
    }
  }

  /**
   * 调整路由树，做以下处理：
   * 1. 对未添加redirect的路由添加redirect
   * 2. 将懒加载的组件名称修改为当前路由的名称（如果启用了keep-alive的话）
   */
  resultRoutes = mapTree(resultRoutes, (route) => {
    // 重新包装component，使用与路由名称相同的name以支持keep-alive的条件缓存。
    if (
      route.meta?.keepAlive &&
      isFunction(route.component) &&
      route.name &&
      isString(route.name)
    ) {
      const originalComponent = route.component as () => Promise<{
        default: Component | DefineComponent;
      }>;
      route.component = async () => {
        const component = await originalComponent();
        if (!component.default) return component;
        return defineComponent({
          name: route.name as string,
          setup(props, { attrs, slots }) {
            return () => h(component.default, { ...props, ...attrs }, slots);
          },
        });
      };
    }

    // 如果有redirect或者没有子路由，则直接返回
    if (route.redirect || !route.children || route.children.length === 0) {
      return route;
    }
    const firstChild = route.children[0];

    // 如果子路由不是以/开头，则直接返回,这种情况需要计算全部父级的path才能得出正确的path，这里不做处理
    if (!firstChild?.path || !firstChild.path.startsWith('/')) {
      return route;
    }

    route.redirect = firstChild.path;
    return route;
  });

  return resultRoutes;
}

/**
 * 根据 name 合并前后端路由
 * @param baseRoutes 后端路由
 * @param extraRoutes 前端路由
 */
function mergeRoutesByName(
  baseRoutes: RouteRecordRaw[],
  extraRoutes: RouteRecordRaw[],
): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = [];
  const routeMap = new Map<string, RouteRecordRaw>();

  for (const route of baseRoutes) {
    const clone = { ...route } as RouteRecordRaw;
    result.push(clone);
    if (clone.name && isString(clone.name)) {
      routeMap.set(clone.name as string, clone);
    }
  }

  for (const route of extraRoutes) {
    if (
      route.name &&
      isString(route.name) &&
      routeMap.has(route.name as string)
    ) {
      const existing = routeMap.get(route.name as string);
      if (!existing) {
        continue;
      }
      const existingChildren = existing.children ?? [];
      const routeChildren = route.children ?? [];

      const merged = {
        ...route,
        ...existing, // keep backend as base
        meta: {
          ...route.meta,
          ...existing.meta, // backend meta wins on conflicts
        },
      } as RouteRecordRaw;

      if (existingChildren.length > 0 || routeChildren.length > 0) {
        merged.children = mergeRoutesByName(existingChildren, routeChildren);
      }

      Object.assign(existing, merged);
    } else {
      const clone = { ...route } as RouteRecordRaw;
      result.push(clone);
      if (clone.name && isString(clone.name)) {
        routeMap.set(clone.name as string, clone);
      }
    }
  }

  return result;
}

export { generateAccessible };
