import { test, expect } from '@tests/e2e/lib/fixtures';
import { TeamPage } from './pages/team-page';

test.describe('Team Settings Regression', () => {
    let teamPage: TeamPage;

    test.beforeEach(async ({ page }) => {
        teamPage = new TeamPage(page);
    });

    test('Team name should load correctly in settings form', async ({ actor, page }) => {
        const teamName = 'Regression Test Team';

        // Setup: Create a team and log in as owner
        await actor.as('teamMember', {
            teams: [{
                role: 'OWNER',
                team: { create: { name: teamName } }
            }]
        }, { gotoRoot: true });

        // Action: Open team settings
        await teamPage.gotoSettings();

        // Verification: Check if the name input contains the team name
        const nameInput = page.getByTestId('team-settings-name-input');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toHaveValue(teamName);
    });
});
