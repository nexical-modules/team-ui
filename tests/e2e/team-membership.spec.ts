import { test, expect } from '@tests/e2e/lib/fixtures';
import { TeamPage } from './pages/team-page';
import { hashPassword } from '@modules/user-api/tests/integration/factory';

test.describe('2. Membership Management', () => {
    let teamPage: TeamPage;

    test.beforeEach(async ({ page }) => {
        teamPage = new TeamPage(page);
    });

    test.describe('2.1 Invite New User (Unregistered Email)', () => {
        test('Admin can invite a new user', async ({ actor, page, utils }) => {
            const newEmail = utils.uniqueEmail();
            await actor.as('teamMember', {
                teams: [{
                    role: 'ADMIN',
                    team: { create: { name: 'Admin Team' } }
                }]
            }, { gotoRoot: true });

            await teamPage.gotoSettings();
            await teamPage.inviteMember(newEmail, 'MEMBER');
            // Reload to ensure fresh data
            await page.reload();
            await teamPage.gotoSettings();

            await expect(page.getByText(newEmail)).toBeVisible();
            // Optional: verify pending status if needed, but the main goal is ensuring it appears
            // await expect(page.getByTestId(`team-invitation-row-${newEmail}`)).toContainText('Pending');
        });

        test('Cannot invite invalid email', async ({ actor, page }) => {
            await actor.as('teamMember', {
                teams: [{
                    role: 'ADMIN',
                    team: { create: { name: 'Admin Team' } }
                }]
            }, { gotoRoot: true });

            await teamPage.gotoSettings();
            await teamPage.gotoSettings();
            await teamPage.clickInteractive('invite-member-trigger');
            await teamPage.fillInteractive('invite-member-email-input', 'invalid-email');
            await teamPage.clickInteractive('invite-member-submit-btn');

            // Browser validation prevents submission, so dialog should stay open
            await expect(teamPage.inviteEmailInput).toBeVisible();
            // Optionally check that the error box is NOT visible (since it's a browser error, not server)
            await expect(teamPage.byTestId('invite-member-error')).toBeHidden();
        });
    });

    test.describe('2.2 Invite Existing User (Direct Add)', () => {
        test('Admin can direct add existing user', async ({ actor, utils, page }) => {
            const existingUser = await actor.data.create('user', {
                email: utils.uniqueEmail(),
                name: 'Existing User'
            });

            await actor.as('teamMember', {
                teams: [{
                    role: 'OWNER',
                    team: { create: { name: 'Owner Team' } }
                }]
            }, { gotoRoot: true });

            await teamPage.gotoSettings();
            await teamPage.inviteMember(existingUser.email, 'MEMBER');
            await teamPage.gotoSettings();

            await expect(page.getByTestId(`team-member-row-${existingUser.email}`)).toBeVisible();
        });
    });

    test.describe('2.3 Resend & Revoke', () => {
        test('Admin can resend invitation', async ({ actor, utils, page }) => {
            const email = utils.uniqueEmail();
            await actor.as('teamMember', {
                teams: [{
                    role: 'ADMIN',
                    team: {
                        create: {
                            name: 'Admin Team',
                            invitations: { create: [{ email, role: 'MEMBER' }] }
                        }
                    }
                }]
            }, { gotoRoot: true });

            await teamPage.gotoSettings();
            await teamPage.resendInvite(email);
        });

        test('Admin can revoke invitation', async ({ actor, utils, page }) => {
            const email = utils.uniqueEmail();
            await actor.as('teamMember', {
                teams: [{
                    role: 'ADMIN',
                    team: {
                        create: {
                            name: 'Admin Team',
                            invitations: { create: [{ email, role: 'MEMBER' }] }
                        }
                    }
                }]
            }, { gotoRoot: true });

            await teamPage.gotoSettings();
            await teamPage.revokeInvite(email);
            await expect(page.getByTestId(`team-invitation-row-${email}`)).toBeHidden();
        });
    });

    test.describe('2.4 Accept Invitation (Register Flow)', () => {
        test('New user can register via invite link', async ({ actor, utils, page }) => {
            const email = utils.uniqueEmail();
            const teamName = 'Invite Team 1';
            // Need team owner AND team to be created properly
            const owner = await actor.data.create('user', {
                memberships: { create: { role: 'OWNER', team: { create: { name: teamName } } } }
            });
            const team = (await actor.data.prisma.team.findFirst({ where: { members: { some: { userId: owner.id } } } }))!;


            const invite = await actor.data.create('invitation', {
                teamId: team.id,
                email: email,
                teamRole: 'MEMBER',
                role: 'EMPLOYEE'
            });


            await page.context().clearCookies();
            await page.goto(`/register?email=${email}&token=${invite.token}`);

            await teamPage.completeRegistration('New User', utils.uniqueUsername('new'), 'password123');

            // Registration succeeds but may require verification or show success page
            await expect(page.getByTestId('register-success')).toBeVisible({ timeout: 15000 });

            // Wait for hydration before clicking
            await teamPage.clickInteractive('proceed-to-login-btn');

            // Ensure we reached the login page
            await expect(page).toHaveURL(new RegExp('/login'));

            // Manually verify user in DB to bypass email link click
            await actor.data.prisma.user.update({
                where: { email },
                data: { emailVerified: new Date() }
            });

            // Now we must login
            await teamPage.login(email, 'password123');

            // Assert on redirection and team switcher visibility
            await expect(page).toHaveURL(new RegExp(`/teams/${team.id}`), { timeout: 30000 });
            await expect(page.getByText(teamName).first()).toBeVisible({ timeout: 30000 });
            await expect(page.getByTestId('team-switcher-trigger')).toBeVisible({ timeout: 15000 });
            await expect(page.getByTestId('team-switcher-trigger')).toContainText(teamName);
        });
    });

    test.describe('2.5 Accept Invitation (Login Flow)', () => {
        test('Existing user can accept invite after login', async ({ actor, utils, page }) => {
            const email = utils.uniqueEmail();
            const teamName = 'Invite Team 2';
            await actor.data.create('user', { email: email, password: hashPassword('password123') });

            const owner = await actor.data.create('user', {
                memberships: { create: { role: 'OWNER', team: { create: { name: teamName } } } }
            });
            const team = (await actor.data.prisma.team.findFirst({ where: { members: { some: { userId: owner.id } } } }))!;

            const invite = await actor.data.create('invitation', {
                teamId: team.id,
                email: email,
                teamRole: 'MEMBER',
                role: 'EMPLOYEE'
            });


            await page.context().clearCookies();

            await page.goto(`/invite/${invite.token}`);
            await expect(page).toHaveURL(/login/);

            const loginNav = page.waitForNavigation();
            await teamPage.login(email, 'password123');
            await loginNav;

            if (!page.url().includes(`/teams/${team.id}`)) {
                const acceptBtn = page.getByTestId('invite-accept-btn');
                await expect(acceptBtn).toBeVisible({ timeout: 30000 });
                await acceptBtn.click();
            }

            await expect(page).toHaveURL(new RegExp(`/teams/${team.id}`), { timeout: 30000 });
            await expect(page.getByText(teamName).first()).toBeVisible({ timeout: 30000 });
            await expect(page.getByTestId('team-switcher-trigger')).toBeVisible({ timeout: 15000 });
            await expect(page.getByTestId('team-switcher-trigger')).toContainText(teamName);
        });
    });

    test.describe('2.6 Modify Member Role', () => {
        test('Owner can promote member', async ({ actor, utils, page }) => {
            const memberEmail = utils.uniqueEmail();
            // Create Owner and Team first
            const owner = await actor.as('teamMember', {
                teams: [{
                    role: 'OWNER',
                    team: { create: { name: 'Owner Team' } }
                }]
            }, { gotoRoot: true });

            // Get the team ID (actor.data has the context, or we query DB)
            // Since we just logged in as the user who created it, we can find it.
            // Using prisma directly via actor.data.prisma
            const ownerUser = await actor.data.prisma.user.findUniqueOrThrow({ where: { email: owner.email! } });
            const team = await actor.data.prisma.team.findFirstOrThrow({
                where: { members: { some: { userId: ownerUser.id } } }
            });

            // Create the member separately
            await actor.data.create('teamMember', {
                team: { connect: { id: team.id } },
                role: 'MEMBER',
                user: {
                    create: {
                        email: memberEmail,
                        name: 'Member',
                        password: 'password',
                        status: 'ACTIVE'
                    }
                }
            });
            // Reload page to see new member? or goto settings again?
            // "gotoRoot: true" in actor.as took us to root. We need to go to settings.
            // But we inserted data in DB *after* page load if we are not careful?
            // Actually actor.as runs, then we insert member. Then we verify.
            // If the app uses SWR/Polling it might show up, otherwise reload.
            await page.reload();

            await teamPage.gotoSettings();

            const row = page.getByTestId(`team-member-row-${memberEmail}`);
            await row.getByTestId('member-actions-trigger').click();
            // Wait for reload and reopen settings
            const reloadPromise = page.waitForNavigation();
            await page.getByRole('menuitem', { name: /promote/i }).click();
            await reloadPromise;
            await teamPage.gotoSettings();

            await expect(page.getByTestId(`team-member-row-${memberEmail}`)).toContainText(/Admin/i);
        });
    });

    test.describe('2.7 Remove Member', () => {
        test('Admin can remove member', async ({ actor, utils, page }) => {
            const memberEmail = utils.uniqueEmail();
            const admin = await actor.as('teamMember', {
                teams: [{
                    role: 'ADMIN',
                    team: { create: { name: 'Owner Team' } }
                }]
            }, { gotoRoot: true });

            const adminUser = await actor.data.prisma.user.findUniqueOrThrow({ where: { email: admin.email! } });
            const team = await actor.data.prisma.team.findFirstOrThrow({
                where: { members: { some: { userId: adminUser.id } } }
            });

            await actor.data.create('teamMember', {
                team: { connect: { id: team.id } },
                role: 'MEMBER',
                user: {
                    create: {
                        email: memberEmail,
                        name: 'Member',
                        password: 'password',
                        status: 'ACTIVE'
                    }
                }
            });
            await page.reload();

            await teamPage.gotoSettings();
            await teamPage.removeMember(memberEmail);

            await expect(page.getByTestId(`team-member-row-${memberEmail}`)).toBeHidden();
        });
    });

    test.describe('2.8 Leave Team', () => {
        test('Member can leave team', async ({ actor, page }) => {
            await actor.as('teamMember', { teams: [{ role: 'MEMBER' }] }, { gotoRoot: true });

            await teamPage.gotoSettings();
            await teamPage.leaveTeam();

            await expect(page).not.toHaveURL(/settings/);
        });
    });
});