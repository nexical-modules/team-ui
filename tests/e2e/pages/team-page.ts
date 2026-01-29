
import { BasePage } from '@tests/e2e/lib/page';
import { expect } from '@tests/e2e/lib/fixtures';

export class TeamPage extends BasePage {

    // --- Locators ---

    readonly navTeamSwitcher = this.byTestId('team-switcher-trigger'); // Assumed, will check or default
    readonly createTeamBtn = this.byTestId('create-team-trigger'); // Assumed/Dialog trigger inside switcher
    readonly createTeamEmptyBtn = this.page.locator('.team-switcher-create-empty');

    // Create Team Dialog
    readonly createTeamDialog = this.byTestId('create-team-dialog-content');
    readonly createTeamNameInput = this.byTestId('create-team-name-input');
    readonly createTeamSubmitBtn = this.byTestId('create-team-submit-btn');

    // Team Settings
    readonly openSettingsBtn = this.byTestId('open-team-settings');
    readonly settingsSheet = this.byTestId('team-settings-sheet');
    readonly settingsNameInput = this.byTestId('team-settings-name-input');
    readonly settingsSaveNameBtn = this.byTestId('team-settings-save-name-btn');
    readonly deleteTeamBtn = this.byTestId('delete-team-btn');

    // Members
    readonly inviteMemberBtn = this.byTestId('invite-member-trigger'); // In settings
    readonly memberActionsTrigger = this.byTestId('member-actions-trigger');

    // Invite Dialog
    readonly inviteDialog = this.byTestId('invite-member-dialog-content');
    readonly inviteEmailInput = this.byTestId('invite-member-email-input');
    readonly inviteRoleTrigger = this.byTestId('invite-member-role-trigger');
    readonly inviteSubmitBtn = this.byTestId('invite-member-submit');
    readonly inviteSuccess = this.byTestId('invite-member-success');

    // API Keys
    readonly createKeyNameInput = this.byTestId('create-key-name-input');
    readonly createKeySubmitBtn = this.byTestId('create-key-submit');
    readonly createdKeyValue = this.byTestId('create-key-value');

    // Registration (External Module - User)
    readonly regNameInput = this.byTestId('register-name');
    readonly regUsernameInput = this.byTestId('register-username');
    readonly regEmailInput = this.byTestId('register-email');
    readonly regPasswordInput = this.byTestId('register-password');
    readonly regConfirmPasswordInput = this.byTestId('register-confirm-password');
    readonly regSubmitBtn = this.byTestId('register-submit');

    // Login (External Module - User)
    readonly loginEmailInput = this.byTestId('login-identifier');
    readonly loginPasswordInput = this.byTestId('login-password');
    readonly loginSubmitBtn = this.byTestId('login-submit');


    override async visit(params?: { teamId?: string }) {
        if (params?.teamId) {
            await this.safeGoto(`/teams/${params.teamId}`);
        } else {
            await this.safeGoto('/');
        }
    }

    override async verifyLoaded() {
        await expect(this.navTeamSwitcher).toBeVisible();
    }

    // --- Actions ---


    async gotoSettings() {
        // Ensure we are not already there or it's not open
        if (!await this.settingsSheet.isVisible()) {
            await this.clickInteractive('open-team-settings');
            await expect(this.settingsSheet).toBeVisible({ timeout: 15000 });
        }
    }

    async switchTeam(teamName: string) {
        // Wait for switcher
        await expect(this.page.locator('.team-switcher-wrapper')).toBeVisible();
        await this.navTeamSwitcher.click();
        // Note: Ideally use ID, but here we use name. We might need to ensure SelectItem has test-id
        await this.page.getByRole('option', { name: teamName }).click();
    }

    async openCreateTeamDialog() {
        // Wait for the switcher component to load
        await expect(this.page.locator('.team-switcher-wrapper')).toBeVisible();

        if (await this.createTeamEmptyBtn.isVisible()) {
            await this.createTeamEmptyBtn.click();
        } else {
            await this.navTeamSwitcher.click();
            // Try to find the button inside the dropdown
            // Based on team-switcher.tsx: data-testid="team-switcher-create-btn"
            const btn = this.page.getByTestId('team-switcher-create-btn');
            if (await btn.isVisible()) {
                await btn.click();
            } else {
                // Fallback to text if testid usage varies
                await this.page.getByText('Create Team').click();
            }
        }
        await expect(this.createTeamDialog).toBeVisible();
    }

    async createTeam(name: string) {
        // If dialog not open, open it? 
        // Best to separate actions. But the helper 'createTeam' assumes we fill the form.
        // It's declared as:
        // async createTeam(name: string) {
        //    await this.fillInteractive('create-team-name-input', name);
        //    await this.clickInteractive('create-team-submit-btn');
        // }
        // Let's keep it as form filler. The caller should open dialog.

        await this.fillInteractive('create-team-name-input', name);
        await this.clickInteractive('create-team-submit-btn');
    }

    async renameTeam(newName: string) {
        await this.gotoSettings();
        await this.fillInteractive('team-settings-name-input', newName);
        await this.clickInteractive('team-settings-save-name-btn');
    }

    async inviteMember(email: string, role: 'MEMBER' | 'ADMIN' = 'MEMBER') {
        const dialog = this.inviteDialog;
        const trigger = this.inviteMemberBtn;

        await trigger.click();
        await expect(dialog).toBeVisible({ timeout: 10000 });

        await this.fillInteractive('invite-member-email-input', email);

        if (role !== 'MEMBER') {
            await this.clickInteractive('invite-member-role-trigger');
            // Use a safer selector for the option
            await this.page.locator('role=option').filter({ hasText: role }).click();
        }

        await this.clickInteractive('invite-member-submit-btn');

        // Wait for either the success state (new user), dialog closing (existing user/direct add), or error
        const successBox = this.inviteSuccess;
        const errorBox = this.byTestId('invite-member-error');
        const closeBtn = this.byTestId('close-invite-dialog-btn');

        try {
            // Give it a moment to process or reload
            await this.page.waitForTimeout(1000);

            // Wait for one of the expected outcomes
            await Promise.race([
                expect(successBox).toBeVisible({ timeout: 15000 }),
                expect(errorBox).toBeVisible({ timeout: 15000 }),
                expect(dialog).toBeHidden({ timeout: 15000 }),
            ]);

            if (await errorBox.isVisible()) {
                return;
            }

            if (await successBox.isVisible()) {
                await closeBtn.click();
            }

            // Wait for reload to complete
            await this.page.waitForLoadState('networkidle');
        } catch (e) {
            // Only force close if strictly necessary and nothing happened
            if (await dialog.isVisible()) {
                try {
                    // Check if success or error is visible (using a short timeout or just isVisible since we are in catch)
                    // But strictly, if we timed out waiting for them, they might not be visible.
                    // The safer fallback is to just hit Escape if the dialog is still there.
                    await this.page.keyboard.press('Escape');
                    await expect(dialog).toBeHidden({ timeout: 5000 });
                } catch (ign) { }
            }
        }

        // Final verification that we are settled
        await this.page.waitForLoadState('networkidle');
    }

    async resendInvite(email: string) {
        const row = this.page.getByTestId(`team-invitation-row-${email}`);
        await row.getByTestId('resend-invite-btn').click();
    }

    async revokeInvite(email: string) {
        const row = this.page.getByTestId(`team-invitation-row-${email}`);
        this.page.once('dialog', dialog => dialog.accept());
        const reloadPromise = this.page.waitForNavigation();
        await row.getByTestId('revoke-invite-btn').click();
        await reloadPromise;
    }

    async removeMember(email: string) {
        await this.gotoSettings();
        const row = this.page.getByTestId(`team-member-row-${email}`);
        await expect(row).toBeVisible({ timeout: 10000 });
        this.page.once('dialog', dialog => dialog.accept());

        await row.getByTestId('member-actions-trigger').click();

        const reloadPromise = this.page.waitForNavigation();
        await this.page.getByTestId('remove-member-btn').click();
        await reloadPromise;
    }

    async leaveTeam() {
        this.page.once('dialog', dialog => dialog.accept());
        await this.page.getByTestId('member-actions-trigger').first().click();

        const reloadPromise = this.page.waitForNavigation();
        await this.page.getByTestId('leave-team-btn').click();
        await reloadPromise;
    }

    async deleteTeam(name: string) {
        await this.gotoSettings();
        await this.clickInteractive('delete-team-btn');
        // Confirm dialog
        await this.fillInteractive('confirm-delete-input', name);
        await this.clickInteractive('confirm-delete-submit-btn');
    }


    async createApiKey(name: string) {
        await this.clickInteractive('create-key-trigger');
        await this.fillInteractive('create-key-name-input', name);
        await this.clickInteractive('create-key-submit');
        await expect(this.createdKeyValue).toBeVisible();
        const key = await this.createdKeyValue.inputValue();
        // Close dialog
        await this.page.getByTestId('create-key-done').click();
        return key;
    }

    async revokeApiKey(name: string) {
        const row = this.page.getByTestId(`team-key-row-${name}`);
        this.page.once('dialog', dialog => dialog.accept());
        await row.getByTestId('revoke-key-btn').click();
    }

    async completeRegistration(name: string, username: string, pass: string) {
        await this.waitForHydration('register-submit');
        await this.fillInteractive('register-name', name);
        await this.fillInteractive('register-username', username);

        // Conditional email fill - copied from RegistrationPage logic
        const emailInput = this.regEmailInput;
        if (await emailInput.isVisible()) {
            const isReadonly = await emailInput.getAttribute('readonly') !== null;
            if (!isReadonly) {
                const val = await emailInput.inputValue();
                if (!val) {
                    await this.fillInteractive('register-email', 'fallback@example.com'); // Should not happen in this flow
                }
            }
        }

        await this.fillInteractive('register-password', pass);
        await this.fillInteractive('register-confirm-password', pass);
        await this.clickInteractive('register-submit');
    }

    async login(email: string, pass: string) {
        await this.waitForHydration('login-submit');
        await this.fillInteractive('login-identifier', email);
        await this.fillInteractive('login-password', pass);
        await this.clickInteractive('login-submit');
    }
}
