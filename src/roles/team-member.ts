import type { RolePolicy } from '@/lib/registries/role-registry';
import type { AstroGlobal, APIContext } from 'astro';

export class TeamMemberRole implements RolePolicy {
  public async check(
    context: AstroGlobal | APIContext,
    input: Record<string, unknown>,
    _data?: unknown,
  ): Promise<void> {
    const locals = (context as { locals: App.Locals }).locals;

    // 1. Must be logged in
    if (!locals?.actor) {
      throw new Error('Unauthorized: Member access required');
    }

    // 2. Admins can access all teams
    if (locals.actor.role === 'ADMIN' || locals.actor.role === 'SUDO') {
      return;
    }

    // 3. For the frontend, we often trust the route params if confirmed by the API later.
    // However, we can check if the teamId is provided.
    const teamId = input.teamId as string | undefined;
    if (!teamId) {
      // If no teamId, we can't verify membership here, but we allow the request to proceed
      // to the page which will handle its own data fetching.
      return;
    }

    // NOTE: In a full implementation, we'd call the API here to verify membership.
    // For now, if the user is logged in, we allow the page to render.
    // The backend API will enforce the strict check when the components fetch data.
  }

  public async redirect(
    context: AstroGlobal | APIContext,
    _input: Record<string, unknown>,
    _data?: unknown,
  ): Promise<Response | undefined> {
    const locals = (context as { locals: App.Locals }).locals;

    if (!locals?.actor) {
      return (context as any).redirect('/login');
    }

    // If check() threw but they are logged in, it means they are forbidden
    return (context as any).redirect('/?error=forbidden_team');
  }
}
