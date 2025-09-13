/**
 * user-analytic controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::user-analytic.user-analytic', ({ strapi }) => ({
  async create(ctx) {
    console.log('📊 Analytics API called');
    
    const params = {
      data: ctx.request.body.data,
      request: ctx.request
    };
    
    const result = await strapi.service('api::user-analytic.user-analytic').create(params);
    
    ctx.body = {
      data: result.data || result,
      meta: {}
    };
  },

  async exportExcel(ctx) {
    try {
      const excelBuffer = await strapi.service('api::user-analytic.user-analytic').exportAllToExcel();
      
      ctx.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="analytics-${Date.now()}.xlsx"`
      });
      
      ctx.body = excelBuffer;
    } catch (error) {
      console.error('❌ Excel export failed:', error);
      ctx.throw(500, 'Excel export failed');
    }
  }
}));
