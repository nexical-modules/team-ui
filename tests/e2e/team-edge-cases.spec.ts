
import { test, expect } from '@tests/e2e/lib/fixtures';
import { TeamPage } from './pages/team-page';

test.describe('5. Robustness & Edge Cases', () => {
    let teamPage: TeamPage;

    test.beforeEach(async ({ page }) => {
        teamPage = new TeamPage(page);
    });

    test.describe('Mobile Responsive', () => {
        test.use({ viewport: { width: 375, height: 667 } });

        test('Team Settings sheet works on mobile', async ({ actor, page }) => {
            await actor.as('teamMember', {
                teams: [{
                    role: 'OWNER',
                    team: { create: { name: 'Mobile Team' } }
                }]
            }, { gotoRoot: true });

            // Open mobile drawer
            await page.getByTestId('shell-mobile-menu-btn').click();
            await expect(page.getByTestId('team-switcher-trigger')).toBeVisible();

            await teamPage.gotoSettings();
            await expect(teamPage.settingsSheet).toBeVisible();
        });
    });

    test.describe('Invalid Invitation Links', () => {
        test('Visiting invalid token shows error', async ({ actor, page, utils }) => {
            // Need to be logged in to see the error page instead of redirects
            await actor.as('user', {}, { gotoRoot: true });

            await page.goto('/invite/invalid-token-12345');
            // Expect error page or message
            await expect(page.getByTestId('invite-error-card')).toBeVisible();
        });

        test('Visiting expired token shows error', async ({ actor, page, utils }) => {
            const team = await actor.data.create('team', { name: 'Expired Team' });

            // Login as a new user with membership to the team
            await actor.as('user', {
                memberships: {
                    create: {
                        role: 'OWNER',
                        teamId: team.id
                    }
                }
            });

            // Create expired invite
            const invite = await actor.data.create('invitation', {
                teamId: team.id,
                email: utils.uniqueEmail(),
                expires: new Date(Date.now() - 86400000).toISOString() // Yesterday
            });

            await page.goto(`/invite/${invite.token}`);

            if (await page.getByTestId('invite-error-card').isVisible()) {
                const content = await page.getByTestId('invite-error-card').textContent();
                throw new Error(`Invitation NOT FOUND (Invalid instead of Expired): ${content}`);
            }

            await expect(page.getByTestId('invite-expired-card')).toBeVisible();
        });
    });

    test.describe('Self-Invitation', () => {
        test('User cannot invite themselves', async ({ actor, page }) => {
            const user = await actor.as('teamMember', {
                teams: [{
                    role: 'OWNER',
                    team: { create: { name: 'Self Team' } }
                }]
            }, { gotoRoot: true });

            await teamPage.gotoSettings();
            await teamPage.inviteMember(user.email);
            // Expect error toast or validation
            await expect(page.getByTestId('invite-member-error')).toBeVisible();
            await expect(page.getByTestId('invite-member-error')).toContainText(/user is already a member/i);
        });
    });
});
