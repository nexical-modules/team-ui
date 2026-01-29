import { test, expect } from '@tests/e2e/lib/fixtures';
import { TeamPage } from './pages/team-page';
import { hashPassword } from '@modules/user-api/tests/integration/factory';

test.describe('4. Access Control & Permissions', () => {
    let teamPage: TeamPage;

    test.beforeEach(async ({ page }) => {
        teamPage = new TeamPage(page);
    });

    test('Member cannot see Danger Zone', async ({ actor, page, utils }) => {
        // Explicit nested setup
        const user = await actor.data.create('user', {
            email: utils.uniqueEmail(),
            password: hashPassword('Password123!'),
            memberships: {
                create: [{
                    role: 'MEMBER',
                    team: { create: { name: 'Member Team' } }
                }]
            }
        });

        await actor.loginWithSession(user.id);
        await actor.as('user', { email: user.email, password: 'Password123!' }, { gotoRoot: true });

        // Ensure team is loaded
        await expect(teamPage.navTeamSwitcher).toBeVisible();

        await teamPage.gotoSettings();
        await expect(teamPage.deleteTeamBtn).toBeHidden();
        await expect(page.getByText('Danger Zone')).toBeHidden();
    });

    test('Member cannot invite users', async ({ actor, page, utils }) => {
        const user = await actor.data.create('user', {
            email: utils.uniqueEmail(),
            password: hashPassword('Password123!'),
            memberships: {
                create: [{
                    role: 'MEMBER',
                    team: { create: { name: 'Member Team' } }
                }]
            }
        });

        await actor.loginWithSession(user.id);
        await actor.as('user', { email: user.email, password: 'Password123!' }, { gotoRoot: true });

        await expect(teamPage.navTeamSwitcher).toBeVisible();

        await teamPage.gotoSettings();
        await expect(teamPage.inviteMemberBtn).toBeHidden();
    });

    test('Member cannot manage other members', async ({ actor, page, utils }) => {
        const team = await actor.data.create('team', { name: 'Shared Team' });
        const user = await actor.data.create('user', {
            email: utils.uniqueEmail(),
            password: hashPassword('Password123!'),
            memberships: {
                create: {
                    role: 'MEMBER',
                    teamId: team.id
                }
            }
        });
        // Create other member
        await actor.data.prisma.teamMember.create({
            data: {
                userId: (await actor.data.create('user', { email: utils.uniqueEmail() })).id,
                teamId: team.id,
                role: 'MEMBER'
            }
        });

        await actor.loginWithSession(user.id);
        await actor.as('user', { email: user.email, password: 'Password123!' }, { gotoRoot: true });

        await teamPage.gotoSettings();

        // Check availability of row
        // We need to find the element
        // Since we didn't save other member, we look for any other member row
        const rows = page.getByTestId(/team-member-row-/);
        // Expect at least 2 rows
        await expect(rows).toHaveCount(2);

        // The actions trigger should be hidden for standard member on other members
        // But users can see their OWN actions (Leave).
        // So we need to check the OTHER member's row.
        // We need the other member email.
        const otherMember = await actor.data.prisma.teamMember.findFirst({
            where: { teamId: team.id, NOT: { userId: user.id } },
            include: { user: true }
        });

        const row = page.getByTestId(`team-member-row-${otherMember!.user.email}`);
        await expect(row.getByTestId('member-actions-trigger')).toBeHidden();
    });

    test('Non-member cannot access team settings', async ({ actor, page, utils }) => {
        // Create a team with an owner
        const teamOwner = await actor.data.create('user', {
            password: hashPassword('Password123!'),
            memberships: { create: { role: 'OWNER', team: { create: { name: 'Secret Team' } } } }
        });
        const team = (await actor.data.prisma.team.findFirst({ where: { members: { some: { userId: teamOwner.id } } } }))!;

        // Login as different user
        await actor.as('user', {}, { gotoRoot: true });

        const response = await page.goto(`/teams/${team.id}/settings`);

        // Should be 404
        expect(response?.status()).toBe(404);
    });
});