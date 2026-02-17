// GENERATED CODE - DO NOT MODIFY
import { db } from '@/lib/core/db';
import { TeamAuthService } from '@modules/team-api/src/services/team-auth-service';
import type { APIContext, MiddlewareNext } from 'astro';

export default {
  onRequest: async (context: any, next: any) => {
    // 1. Check for Team API Key
    const authHeader = context.request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ne_team_')) {
      const rawKey = authHeader.replace('Bearer ', '');
      const team = await TeamAuthService.validateKey(rawKey);

      if (team) {
        context.locals.actor = { type: 'team', id: team.id };
        return next();
      }
    }

    // 2. Use User Session from locals (populated by user middleware)
    const user = context.locals.navData?.context?.user;

    if (user?.email) {
      console.log('[Middleware:Team] Fetching teams for:', user.email);
      // Fetch teams for the user
      const userTeams = await db.team.findMany({
        where: {
          members: {
            some: {
              user: {
                email: user.email,
              },
            },
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          invitations: true,
        },
      });

      console.log('[Middleware:Team] Found teams:', userTeams.length);

      // Merge into navData
      context.locals.navData = {
        ...context.locals.navData,
        context: {
          ...context.locals.navData?.context,
          teams: userTeams,
        },
      };
    }

    return next();
  },
};

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  const publicRoutes: string[] = [];
  if (publicRoutes.some((route) => context.url.pathname.startsWith(route))) return next();
  // Session Hydration
  // Session Hydration
  // Expects 'session' to be available on locals (configured via adapter)
  const session = (context.locals as any).session;
  if (session) {
    const user = await session.get('user');
    if (user) {
      // Compatibility with Actor system
      context.locals.actor = user;
      context.locals.actorType = 'user';
    }
  }
  // Dynamic Bouncer Pattern: Validate Actor Status
  if (context.locals.actor) return next();
  return next();
}
export default { onRequest };
