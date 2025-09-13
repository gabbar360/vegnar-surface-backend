/**
 * user-analytic router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/user-analytics',
      handler: 'user-analytic.create',
    },
    {
      method: 'GET',
      path: '/user-analytics',
      handler: 'user-analytic.find',
    },
    {
      method: 'GET',
      path: '/user-analytics/:id',
      handler: 'user-analytic.findOne',
    },
    {
      method: 'GET',
      path: '/user-analytics/export/excel',
      handler: 'user-analytic.exportExcel',
    },
  ],
};
