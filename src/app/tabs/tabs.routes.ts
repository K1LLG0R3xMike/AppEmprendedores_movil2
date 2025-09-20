import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'business',
        loadComponent: () =>
          import('../pages/business/business.page').then((m) => m.BusinessPage),
      },
      {
        path: 'ia-panel',
        loadComponent: () =>
          import('../pages/ia-panel/ia-panel.page').then((m) => m.IaPanelPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../pages/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('../pages/chat/chat.page').then((m) => m.ChatPage),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('../pages/products/products.page').then((m) => m.ProductsPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
