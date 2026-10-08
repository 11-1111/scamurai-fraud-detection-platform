import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/app/layout/DefaultLayout.vue'

const routes = [
  {
    path: '/',
    component: DefaultLayout,
    redirect: '/transactions',
    children: [
      {
        path: 'transactions',
        name: 'Transactions',
        component: () => import('@/modules/Transactions/presentation/pages/TransactionsPage.vue'),
        meta: {
          title: 'Transactions',
          description: 'Monitor and investigate payment transactions.',
        },
      },
      {
        path: 'fraud-config',
        name: 'FraudConfig',
        component: () => import('@/modules/FraudConfig/presentation/pages/FraudConfigPage.vue'),
        meta: {
          title: 'Fraud Configuration',
          description: 'View fraud features, rules, risk levels, and policies.',
        },
      },
      {
        path: 'fraud-configuration',
        redirect: { name: 'FraudConfig' },
      },
      {
        path: 'fraud-alerts',
        name: 'FraudAlerts',
        component: () => import('@/modules/FraudAlerts/presentation/pages/FraudAlertsPage.vue'),
        meta: {
          title: 'Fraud Alerts',
          description: 'Review transactions flagged by fraud rules and policies.',
        },
      },
      {
        path: 'fraud-alerts/:id',
        name: 'FraudAlertDetails',
        component: () => import('@/modules/FraudAlerts/presentation/pages/FraudAlertDetailsPage.vue'),
        meta: {
          title: 'Fraud Alert',
          description: 'Review the fraud decision, evidence and investigation history.',
        },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory('/api3dash/'),
  routes,
})

export default router
