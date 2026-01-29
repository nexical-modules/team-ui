import { BasePage } from '@tests/e2e/lib/page';
import { expect } from '@playwright/test';

export class TeamDashboardPage extends BasePage {
  override async visit(params?: { teamId?: string }) {
    if (params?.teamId) {
      await this.safeGoto(`/teams/${params.teamId}`);
    } else {
      await this.safeGoto('/');
    }
  }

  override async verifyLoaded() {
    await expect(this.page.getByTestId('team-switcher-trigger')).toBeVisible();
  }

  /**
   * Opens the Create Team dialog and submits the form.
   */
  async createTeam(name: string) {
    // Open dialog - assuming a button in the nav or header
    // Using a generic "create-team-trigger" which might be in the team switcher
    await this.clickInteractive('team-switcher-trigger');
    await this.clickInteractive('create-team-btn');

    await this.waitForDialog('create-team-dialog');
    await this.fillInteractive('team-name-input', name);
    await this.clickInteractive('submit-create-team');

    // Wait for the dialog to close or navigation
    await expect(this.page.getByTestId('create-team-dialog')).not.toBeVisible();
    await this.waitForToast(/Team created/i);
  }

  /**
   * Switches the active team using the Team Switcher.
   */
  async switchTeam(teamName: string) {
    await this.clickInteractive('team-switcher-trigger');
    await this.page.getByRole('menuitem', { name: teamName }).click();

    // Wait for switch - checking cookie or UI element
    await expect(this.page.getByTestId('team-switcher-trigger')).toContainText(teamName);
  }

  async verifyActiveTeam(teamName: string) {
    await expect(this.page.getByTestId('team-switcher-trigger')).toContainText(teamName);
  }
}
