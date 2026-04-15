import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules, traverseTreeValues } from '@vben/utils';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

import { coreRoutes, fallbackNotFoundRoute } from './core';

const dynamicRouteFiles = import.meta.glob('./modules/**/*.ts', {
  eager: true,
});

const dynamicRoutes: RouteRecordRaw[] = mergeRouteModules(dynamicRouteFiles);

const staticRoutes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      hideInMenu: true,
      title: 'Profile',
    },
    name: 'ProfileRoute',
    path: '/profile',
    children: [
      {
        component: () => import('#/views/_core/profile/index.vue'),
        meta: {
          icon: 'lucide:user',
          title: $t('page.auth.profile'),
        },
        name: 'Profile',
        path: '',
      },
    ],
  },
  {
    component: BasicLayout,
    meta: {
      hideInMenu: true,
      title: '\u6D88\u606F\u4E2D\u5FC3',
    },
    name: 'MdmSystemMessageCenterRoute',
    path: '/mdm/system/message-center',
    children: [
      {
        component: () => import('#/views/mdm/system/message-center/index.vue'),
        meta: {
          hideInMenu: true,
          icon: 'lucide:inbox',
          title: '\u6D88\u606F\u4E2D\u5FC3',
        },
        name: 'MdmSystemMessageCenter',
        path: '',
      },
    ],
  },
  {
    component: BasicLayout,
    meta: {
      hideInMenu: true,
      title: '\u65E5\u5FD7\u63D0\u9192\u914D\u7F6E',
    },
    name: 'MdmIntegrationLogNotificationRoute',
    path: '/mdm/integration/log-notification',
    children: [
      {
        component: () =>
          import('#/views/mdm/integration/log-notification/index.vue'),
        meta: {
          hideInMenu: true,
          title: '\u65E5\u5FD7\u63D0\u9192\u914D\u7F6E',
        },
        name: 'MdmIntegrationLogNotificationPage',
        path: '',
      },
    ],
  },
  {
    component: BasicLayout,
    meta: {
      hideInMenu: true,
      title: '\u6A21\u578B\u9884\u89C8',
    },
    name: 'MdmModelDefinitionPreviewRoute',
    path: '/mdm/model/definition/preview/:id',
    children: [
      {
        component: () =>
          import('#/views/mdm/model/definition/preview/index.vue'),
        meta: {
          hideInMenu: true,
          title: '\u6A21\u578B\u9884\u89C8',
        },
        name: 'MdmModelDefinitionPreview',
        path: '',
      },
    ],
  },
  {
    component: BasicLayout,
    meta: {
      hideInMenu: true,
      title: '\u4E3B\u6570\u636E\u5386\u53F2\u7248\u672C',
    },
    name: 'MdmDataHistoryRoute',
    path: '/mdm/data/history/:definitionId/:recordId',
    children: [
      {
        component: () => import('#/views/mdm/data/history/index.vue'),
        meta: {
          hideInMenu: true,
          title: '\u4E3B\u6570\u636E\u5386\u53F2\u7248\u672C',
        },
        name: 'MdmDataHistory',
        path: '',
      },
    ],
  },
  {
    component: BasicLayout,
    meta: {
      hideInMenu: true,
      title: '\u5F52\u96C6\u65E5\u5FD7\u8BE6\u60C5',
    },
    name: 'MdmIntegrationCollectionLogDetailRoute',
    path: '/mdm/integration/collection/log-detail/:id',
    children: [
      {
        component: () =>
          import('#/views/mdm/integration/collection/log-detail.vue'),
        meta: {
          hideInMenu: true,
          title: '\u5F52\u96C6\u65E5\u5FD7\u8BE6\u60C5',
        },
        name: 'MdmIntegrationCollectionLogDetail',
        path: '',
      },
    ],
  },
  {
    component: BasicLayout,
    meta: {
      hideInMenu: true,
      title: '\u5206\u53D1\u65E5\u5FD7\u8BE6\u60C5',
    },
    name: 'MdmIntegrationDistributionLogDetailRoute',
    path: '/mdm/integration/distribution/log-detail/:id',
    children: [
      {
        component: () =>
          import('#/views/mdm/integration/distribution/log-detail.vue'),
        meta: {
          hideInMenu: true,
          title: '\u5206\u53D1\u65E5\u5FD7\u8BE6\u60C5',
        },
        name: 'MdmIntegrationDistributionLogDetail',
        path: '',
      },
    ],
  },
];

const externalRoutes: RouteRecordRaw[] = [];

const routes: RouteRecordRaw[] = [
  ...coreRoutes,
  ...staticRoutes,
  ...externalRoutes,
  fallbackNotFoundRoute,
];

const coreRouteNames = traverseTreeValues(coreRoutes, (route) => route.name);

const accessRoutes = [...dynamicRoutes];

export { accessRoutes, coreRouteNames, routes };
