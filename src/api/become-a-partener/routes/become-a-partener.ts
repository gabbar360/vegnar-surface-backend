/**
 * become-a-partener router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/become-a-parteners',
      handler: 'become-a-partener.create',
      config: {
        auth: false,
      },
    },
  ],
};
