import { Factory } from '@tests/integration/lib/factory';
import type { Actor } from '@tests/e2e/lib/actor';
import crypto from 'node:crypto';

export const actors = {
    teamMember: async (actor: Actor, params: any = {}) => {
        const { teams, ...userParams } = params;

        // 1. Prepare user params (let user actor handle default password, etc if it was generic)
        // But since we are creating user here to attach teams, we might need to handle it.
        // Actually, the goal is to decouple. The BEST way is to let 'user' actor create the user, then we attach teams?
        // No, we need to create the user WITH teams in one go for efficiency if possible, OR create user then add members.
        // Factory.create('user') can take memberships.

        // However, 'user' actor defined in user module should NOT know about memberships.
        // So the 'teamMember' actor will:
        // 1. Create User with memberships (using Factory which IS aware of schema via prisma)
        // 2. OR Create User then Create Memberships.

        // Ideally:
        const { hashPassword } = await import('@modules/user-api/tests/integration/factory');
        const password = userParams.password || 'Password123!';

        // 1. Preprocess teams to ensure Prisma compatibility
        const processedTeams = (teams || []).map((t: any) => {
            const membership = { ...t };

            // If No team ID or creation provided, provide a default
            if (!membership.teamId && !membership.team) {
                membership.team = { create: { name: 'Default Team' } };
            }

            // Handle nested invitations setup
            if (membership.team?.create) {
                const teamCreate = membership.team.create;
                if (teamCreate.invitations?.create) {
                    const invList = Array.isArray(teamCreate.invitations.create)
                        ? teamCreate.invitations.create
                        : [teamCreate.invitations.create];

                    teamCreate.invitations.create = invList.map((inv: any) => ({
                        token: crypto.randomUUID(),
                        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                        ...inv,
                        // Fix role/teamRole mismatch if present
                        ...(inv.role && ['MEMBER', 'ADMIN', 'OWNER'].includes(inv.role) ? {
                            teamRole: inv.role,
                            role: 'EMPLOYEE'
                        } : {})
                    }));
                }
            }
            return membership;
        });

        let user;
        if (userParams.email) {
            user = await Factory.prisma.user.findUnique({ where: { email: userParams.email } });
        }

        if (!user) {
            user = await Factory.create('user', {
                role: userParams.role || 'EMPLOYEE',
                status: userParams.status || 'ACTIVE',
                password: hashPassword(password),
                ...userParams, // email etc
                memberships: { create: processedTeams }
            });
        }

        // 2. Login using the user actor logic - or just reuse the user actor for login?
        // actor.as('user') would try to create if not found.
        // If we just want to login:
        // We can call actor.as('user', { email: user.email, password }) 
        // But actor.as checks cache.

        // SImple: Just call login API directly here too, or delegate.
        // Let's delegate to 'user' actor for login since it handles auth logic?
        // But 'user' actor creates user if not found.
        // If we pass email that exists, it just logs in.

        return actor.as('user', { email: user.email, password }, { gotoRoot: false });
    }
};
