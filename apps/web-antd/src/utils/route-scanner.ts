/**
 * 项目路由组件扫描工具
 * 用于自动识别 src/views 下的页面文件并提取路由元数据
 */

import type { RouteRecordRaw } from 'vue-router';

export interface RouteCandidate {
  filePath: string;     // 原始 glob 路径，如 /src/views/mdm/system/menu/index.vue
  relative: string;     // 展示用相对路径，如 mdm/system/menu
  component: string;    // 可直接存入数据库的组件路径，如 mdm/system/menu/index.vue
  name: string;         // 建议路由名称，如 MdmSystemMenu
  path: string;         // 建议路由路径，如 /mdm/system/menu
  title: string;        // 建议菜单标题，如 Mdm / System / Menu
  permission: string;   // 建议权限标识，如 mdm:system:menu:view
}

type RouteModule = {
  default?: RouteRecordRaw[];
};

type StaticRouteHint = Pick<RouteCandidate, 'name' | 'path' | 'title'>;

const routeModules = import.meta.glob<RouteModule>(
  '/src/router/routes/modules/**/*.ts',
  { eager: true },
);
const rawRouteModules = import.meta.glob<string>(
  '/src/router/routes/modules/**/*.ts',
  { eager: true, import: 'default', query: '?raw' },
);

function normalizeViewComponentPath(path: string) {
  return path
    .replace(/^#\/views\//, '')
    .replace(/^\/src\/views\//, '')
    .replace(/^\/+/, '');
}

function toPascalCase(value: string) {
  return value
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toAbsoluteRoutePath(parentPath: string, path?: string) {
  if (!path) {
    return parentPath || '/';
  }
  if (path.startsWith('/')) {
    return path;
  }
  const normalizedParent = parentPath.endsWith('/')
    ? parentPath.slice(0, -1)
    : parentPath;
  return `${normalizedParent}/${path}`.replace(/\/+/g, '/');
}

function collectComponentPathsFromSource(source: string) {
  return [
    ...source.matchAll(
      /component:\s*\(\)\s*=>\s*import\('#\/views\/([^'"`]+\.vue)'\)/g,
    ),
  ].map((match) => normalizeViewComponentPath(match[1] || ''));
}

function flattenRoutesWithView(
  routes: RouteRecordRaw[],
  parentPath = '',
  result: StaticRouteHint[] = [],
) {
  for (const route of routes) {
    const fullPath = toAbsoluteRoutePath(parentPath, String(route.path || ''));

    if (typeof route.component === 'function') {
      result.push({
        name: String(route.name || ''),
        path: fullPath,
        title: String(route.meta?.title || ''),
      });
    }

    if (Array.isArray(route.children) && route.children.length > 0) {
      flattenRoutesWithView(route.children, fullPath, result);
    }
  }

  return result;
}

function collectStaticRouteHints() {
  const hints = new Map<string, StaticRouteHint>();
  for (const [modulePath, module] of Object.entries(routeModules)) {
    const routes = Array.isArray(module.default) ? module.default : [];
    const routeHints = flattenRoutesWithView(routes);
    const rawSource = rawRouteModules[modulePath];
    const componentPaths = rawSource
      ? collectComponentPathsFromSource(rawSource)
      : [];

    for (const [index, componentPath] of componentPaths.entries()) {
      const routeHint = routeHints[index];
      if (!routeHint) {
        continue;
      }
      hints.set(componentPath, routeHint);
    }
  }

  return hints;
}

const staticRouteHints = collectStaticRouteHints();

/**
 * 扫描 views 下所有 .vue 文件并返回候选路由对象
 * @param modules Vite 的 import.meta.glob 结果
 */
export function processRawModules(modules: Record<string, any>): RouteCandidate[] {
  return Object.keys(modules)
    .filter((key) => !key.includes('/modules/') && !key.includes('/components/'))
    .map((filePath) => {
      // 1. 获取真实组件路径，保证和 pageMap 的 key 可对齐
      // /src/views/mdm/system/menu/index.vue -> mdm/system/menu/index.vue
      const component = filePath
        .replace(/^\/src\/views\//, '')
        .replace(/^\/+/, '');

      // 2. 获取展示用路由相对路径
      // mdm/system/menu/index.vue -> mdm/system/menu
      const relative = component
        .replace(/\/index\.vue$/, '')
        .replace(/\.vue$/, '');

      // 3. 生成路由路径 /mdm/system/menu
      const fallbackPath = '/' + relative;

      // 4. 生成大驼峰名称 MdmSystemMenu
      const fallbackName = toPascalCase(relative);

      // 5. 生成分级标题 Mdm / System / Menu
      const fallbackTitle = relative
        .split('/')
        .filter(Boolean)
        .map((s) => toPascalCase(s))
        .join(' / ');

      const routeHint = staticRouteHints.get(component);
      const name = routeHint?.name || fallbackName;
      const path = routeHint?.path || fallbackPath;
      const title = routeHint?.title || fallbackTitle;

      // 6. 生成权限标识 mdm:system:menu:query
      const permission = relative.split('/').filter(Boolean).join(':') + ':query';

      return {
        filePath,
        relative,
        component,
        name,
        path,
        title,
        permission,
      };
    })
    .sort((a, b) => a.relative.localeCompare(b.relative));
}
