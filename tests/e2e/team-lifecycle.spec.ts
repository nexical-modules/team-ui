import { test, expect } from '@tests/e2e/lib/fixtures';
import { TeamPage } from './pages/team-page';

test.describe('1. Team Lifecycle', () => {
    let teamPage: TeamPage;

    test.beforeEach(async ({ page }) => {
        teamPage = new TeamPage(page);
    });

    test.describe('1.1 Create Team', () => {
        test('User can create a new team successfully', async ({ actor, page, utils }) => {
            const teamName = utils.uniqueString('New Team');
            await actor.as('user', {}, { gotoRoot: true });

            await test.step('Open Create Team Dialog', async () => {
                await teamPage.openCreateTeamDialog();
            });

            await test.step('Submit Create Form', async () => {
                await teamPage.createTeamNameInput.fill(teamName);
                await teamPage.createTeamSubmitBtn.click();
            });

            await test.step('Verify Outcome', async () => {
                // Should redirect or reload. Verify team name is visible in header/switcher
                await expect(page.getByText(teamName)).toBeVisible();
            });
        });

        test('Fail to create team with empty name', async ({ actor, page }) => {
            await actor.as('user', {}, { gotoRoot: true });

            await teamPage.openCreateTeamDialog();

            await teamPage.createTeamNameInput.fill('');
            // Browser validation might stop it, or server.
            // If browser "required" attribute:
            await expect(teamPage.createTeamNameInput).toHaveAttribute('required', '');
        });
    });

    test.describe('1.2 Rename Team', () => {
        test('Owner can rename team', async ({ actor, page, utils }) => {
            const oldName = utils.uniqueString('Old Team');
            const newName = utils.uniqueString('New Team');

            // Setup: User with one team
            await actor.as('teamMember', {
                teams: [{
                    role: 'OWNER',
                    team: { create: { name: oldName } }
                }]
            }, { gotoRoot: true });

            await test.step('Navigate to Settings', async () => {
                // Verify team name is visible (loaded and selected)
                await expect(page.getByText(oldName)).toBeVisible();
                await teamPage.gotoSettings();
            });

            await test.step('Update Name', async () => {
                await teamPage.settingsNameInput.fill(newName);
                await teamPage.settingsSaveNameBtn.click();
            });

            await test.step('Verify Outcome', async () => {
                // Page reloads and sheet closes, so we verify in the header/switcher
                await expect(page.getByTestId('team-switcher-trigger')).toContainText(newName);
            });
        });
    });

    test.describe('1.3 Delete Team', () => {
        test('Owner can delete team permanently', async ({ actor, page, utils }) => {
            const teamName = utils.uniqueString('Delete Me');
            await actor.as('teamMember', {
                teams: [{
                    role: 'OWNER',
                    team: { create: { name: teamName } }
                }]
            }, { gotoRoot: true });

            await test.step('Navigate to Danger Zone', async () => {
                await teamPage.gotoSettings();
                await teamPage.deleteTeamBtn.click();
            });

            await test.step('Confirm Deletion', async () => {
                // Using placeholder as agreed
                await page.getByPlaceholder(teamName).fill(teamName);
                // "Delete Team" or similar localized text
                await page.getByRole('button', { name: /delete/i }).click();
            });

            await test.step('Verify Redirect', async () => {
                await expect(page).toHaveURL('/'); // Or dashboard
                // Verify team is gone (optional, but good)
                // Might need to check switcher that it's gone
            });
        });

        test('Member cannot delete team', async ({ actor, page, utils }) => {
            await actor.as('teamMember', {
                teams: [{
                    role: 'MEMBER',
                    team: { create: { name: 'Member Team' } }
                }]
            }, { gotoRoot: true });

            await teamPage.gotoSettings();
            await expect(teamPage.deleteTeamBtn).toBeHidden();
        });
    });

    test.describe('1.4 Switch Team', () => {
        test('User can switch between teams', async ({ actor, page, utils }) => {
            const teamA = utils.uniqueString('Team A');
            const teamB = utils.uniqueString('Team B');

            await actor.as('teamMember', {
                teams: [
                    { role: 'OWNER', team: { create: { name: teamA } } },
                    { role: 'OWNER', team: { create: { name: teamB } } }
                ]
            }, { gotoRoot: true });

            await test.step('Switch to Team B', async () => {
                await teamPage.switchTeam(teamB);
            });

            await test.step('Verify Team B Active', async () => {
                // Check switcher trigger text
                await expect(page.getByTestId('team-switcher-trigger')).toContainText(teamB);
            });
        });
    });
});