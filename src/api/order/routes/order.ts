/**
 * order router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::order.order');

const customRoutes = {
  routes: [
    {
      method: 'POST',
      path: '/orders/create',
      handler: 'order.createOrder',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/orders/verify',
      handler: 'order.verifyPayment',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

export default customRoutes;
