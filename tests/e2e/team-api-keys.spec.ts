import { test, expect } from '@tests/e2e/lib/fixtures';
import { TeamPage } from './pages/team-page';
import { hashPassword } from '@modules/user-api/tests/integration/factory';

test.describe('3. Developer Resources (API Keys)', () => {
    let teamPage: TeamPage;

    test.beforeEach(async ({ page }) => {
        teamPage = new TeamPage(page);
    });

    // Helper to go to keys page
    async function gotoKeys(page: any, teamId: string) {
        await page.goto(`/teams/${teamId}/settings/keys`);
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { name: /service keys/i })).toBeVisible();
    }

    test.describe('3.1 Create API Key', () => {
        test('Admin can create a new API key', async ({ actor, page, utils }) => {
            const keyName = utils.uniqueString('CI Key');
            const team = await actor.data.create('team', { name: 'API Key Team' });
            const user = await actor.data.create('user', {
                email: utils.uniqueEmail(),
                password: hashPassword('Password123!'),
                memberships: { create: { role: 'ADMIN', teamId: team.id } }
            });

            await actor.loginWithSession(user.id);
            await actor.as('user', { email: user.email, password: 'Password123!' }, { gotoRoot: true });

            await gotoKeys(page, team.id);

            await test.step('Create Key', async () => {
                const key = await teamPage.createApiKey(keyName);
                expect(key).toBeTruthy();
                // Check format if known, e.g. starts with pk_
                // expect(key).toMatch(/^pk_/);
            });

            await test.step('Verify Key Listed', async () => {
                await expect(page.getByTestId(`team-key-row-${keyName}`)).toBeVisible();
            });
        });
    });

    test.describe('3.2 List API Keys', () => {
        test('Can see listed keys', async ({ actor, page, utils }) => {
            const keyName = utils.uniqueString('Existing Key');
            const team = await actor.data.create('team', { name: 'API Key Team' });
            const user = await actor.data.create('user', {
                email: utils.uniqueEmail(),
                password: hashPassword('Password123!'),
                memberships: { create: { role: 'ADMIN', teamId: team.id } }
            });

            // Seed key
            await actor.data.create('teamApiKey', { teamId: team.id, name: keyName });

            await actor.loginWithSession(user.id);
            await actor.as('user', { email: user.email, password: 'Password123!' }, { gotoRoot: true });

            await gotoKeys(page, team.id);

            await expect(page.getByTestId(`team-key-row-${keyName}`)).toBeVisible();
        });
    });

    test.describe('3.3 Revoke API Key', () => {
        test('Admin can revoke key', async ({ actor, page, utils }) => {
            const keyName = utils.uniqueString('Revoke Me');
            const team = await actor.data.create('team', { name: 'API Key Team' });
            const user = await actor.data.create('user', {
                email: utils.uniqueEmail(),
                password: hashPassword('Password123!'),
                memberships: { create: { role: 'ADMIN', teamId: team.id } }
            });

            await actor.data.create('teamApiKey', { teamId: team.id, name: keyName });

            await actor.loginWithSession(user.id);
            await actor.as('user', { email: user.email, password: 'Password123!' }, { gotoRoot: true });

            await gotoKeys(page, team.id);

            await teamPage.revokeApiKey(keyName);

            await expect(page.getByTestId(`team-key-row-${keyName}`)).toBeHidden();
        });
    });
});