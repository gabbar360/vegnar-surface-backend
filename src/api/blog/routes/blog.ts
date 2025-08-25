/**
 * blog router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::blog.blog', {
  config: {
    find: {
      middlewares: [
        (ctx, next) => {
          ctx.query.populate = 'image';
          return next();
        }
      ]
    },
    findOne: {
      middlewares: [
        (ctx, next) => {
          ctx.query.populate = 'image';
          return next();
        }
      ]
    }
  }
});
