// GENERATED CODE - DO NOT MODIFY
import type { APIContext, MiddlewareNext } from 'astro';

export default {
  onRequest: async (context: APIContext, next: MiddlewareNext) => {
    // 1. Check for Team API Key
    const authHeader = context.request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ne_team_')) {
      // NOTE: Direct DB/Backend imports are forbidden in UI modules.
      // This should be done via API request or in an API module middleware.
      // E.g., const team = await api.teamApiKey.validate(rawKey);
      // For now, removing to fix build
    }

    // 2. Use User Session from locals (populated by user middleware)
    const user = context.locals.navData?.context?.user;

    if (user?.email) {
      console.info(
        '[Middleware:Team] Found user, fetching teams omitted in frontend middleware for edge compatibility.',
      );
      // NOTE: Teams should be fetched via API call or client component,
      // not directly via DB in frontend Edge middleware.
      context.locals.navData = {
        ...context.locals.navData,
        context: {
          ...context.locals.navData?.context,
          teams: [], // Fallback or fetch via api later
        },
      };
    }

    return next();
  },
};
