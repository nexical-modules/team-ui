# Team Workflows & E2E Testing Strategy

This document outlines the comprehensive workflows, edge cases, and expected conditional outcomes for Team-based interactions in ArcNexus.

**Scope**:
*   **Included**: Team creation, deletion, settings updates, member management (invite/remove/role), API Key management, and Search/Filtering.
*   **Excluded**: User authentication (covered in [USERS.md](./USERS.md)), specific Billing flows (covered in BILLING.md), and Project-specific logic.

## 0. Definitions & Roles

**Team Roles**:
*   **Owner**: Creator of the team. Has full access, including billing and team deletion. Cannot be removed unless another owner exists.
*   **Admin**: Can manage members and settings, but cannot delete the team or manage billing.
*   **Member**: Standard access. Can view settings (read-only) or basic project access.

**Site Roles**:
*   **Admin**: Super-user. Cannot be invited via Team Invite flow (security restriction).
*   **User/Employee**: Standard user.

**System States**:
*   **Authenticated**: User is logged in.
*   **Unauthenticated**: User is a guest/visitor.
*   **Locale**: Different languages (affects email templates).

---

## 1. Team Lifecycle

### 1.1 Create Team
**Goal**: Create a new collaborative organization/team.
**Pre-requisite**: User is logged in.
**Steps**:
1.  Open "Create Team" Dialog (from Team Switcher/Header).
2.  Enter `Team Name` (e.g., "Acme Corp").
3.  Click "Create Team" / Submit.

**Outcomes**:
*   **Success**:
    *   Team created in DB with a new UUID.
    *   Creator added as **OWNER** in `TeamMembers`.
    *   Browser cookie `active-team` updated to new ID.
    *   UI redirects to the new Team Dashboard.
    *   Team Switcher displays the new team as active.
*   **Failure - Missing Name**: Client/Server validation error "Name is required".
*   **Edge Case - Name Length**: Very long names (>50 chars) should be truncated in UI but saved correctly in DB.

### 1.2 Rename Team
**Goal**: Update team identity.
**Pre-requisite**: Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Team Settings (`/teams/[id]/settings`).
2.  In "General" section, edit `Team Name`.
3.  Click "Save Changes".

**Outcomes**:
*   **Success**:
    *   Name updated in DB.
    *   Header/Switcher updates to reflect new name immediately (or on refresh).
    *   Toast notification "Team updated successfully".
*   **Failure - Empty Name**: Validation error prevents submission.

### 1.3 Delete Team
**Goal**: Permanently destroy team and data.
**Pre-requisite**: Role: **OWNER**.
**Steps**:
1.  Navigate to Team Settings -> Danger Zone.
2.  Click "Delete Team".
3.  Confirm Deletion Dialog appears.
4.  Type exact team name to confirm.
5.  Click "Delete Permanently".

**Outcomes**:
*   **Success**:
    *   Team and all relationships (Members, Projects, Invites, API Keys) hard deleted.
    *   Redirect to Home/Dashboard.
    *   Active team cookie cleared or switched to another available team.
*   **Failure - Unauthorized**: Admin/Member cannot see button or action is blocked (403).
*   **Failure - Name Mismatch**: Confirmation button remains disabled or alerts if typo in confirmation input.

### 1.4 Switch Team
**Goal**: Navigate between multiple teams.
**Pre-requisite**: User belongs to Team A and Team B.
**Steps**:
1.  Open Team Switcher (Nav Drawer/Header).
2.  Click "Team B".

**Outcomes**:
*   **Success**:
    *   `active-team` cookie updates to Team B's ID.
    *   Page reloads or updates content to Team B data.
    *   URL might update if it contained the previous team slug/ID.
*   **Edge Case - No Teams**: If user leaves all teams, show "Create Team" or "Empty State" dashboard.

---

## 2. Membership Management

### 2.1 Invite New User (Unregistered Email)
**Goal**: Onboard a person who does not have an ArcNexus account.
**Pre-requisite**: Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Team Settings -> Members.
2.  Click "Invite Member" to open dialog.
3.  Enter `Email` (unused in system, e.g., `new@example.com`).
4.  Select `Role` (Member/Admin).
5.  Click "Send Invitation".

**Outcomes**:
*   **Success**:
    *   `Invitation` record created in DB (Expires in 7 days).
    *   Email sent to `new@example.com` with **Register Link** containing token.
    *   Hook `team.invitation_created` dispatched.
    *   UI shows email in "Pending Invitations" list.
*   **Failure - Duplicate Invite**: Error "Invitation already sent" if pending invite exists for same email.
*   **Failure - Invalid Email**: Client-side validation for email format.
*   **Security - Admin Block**: Attempting to invite with `siteRole=ADMIN` (via API tampering) returns 403 Forbidden.

### 2.2 Invite Existing User (Direct Add)
**Goal**: Add an existing platform user to the team.
**Pre-requisite**: Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Team Settings -> Members.
2.  Click "Invite Member".
3.  Enter `Email` (user exists in system, e.g., `existing@example.com`).
4.  Select `Role`.
5.  Click "Send Invitation".

**Outcomes**:
*   **Success (Immediate Join)**:
    *   User added to `TeamMembers` table immediately (Direct Add).
    *   **NO** `Invitation` record created.
    *   Hook `team.member_added` dispatched.
    *   User receives "You have been added to [Team Name]" email.
    *   User appears in Member list immediately.
*   **Failure - Already Member**: Error "User is already a member."

### 2.3 Resend Invitation
**Goal**: Retry sending an invitation to a user who missed the email.
**Pre-requisite**: Pending invitation exists. Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Team Settings -> Pending Invites.
2.  Find target invitation.
3.  Click "Resend Invitation".

**Outcomes**:
*   **Success**:
    *   `Invitation` token rotated (new UUID).
    *   `Invitation` expiry extended (7 days from now).
    *   Email resent with new link.
    *   Hook `team.invitation_resent` dispatched.
    *   Toast notification "Invitation resent".

### 2.4 Accept Invitation (Register Flow)
**Goal**: New user registers and auto-joins via invite link.
**Steps**:
1.  User clicks link in email (`/register?email=...&token=...` or `/invite/[token]`).
2.  System validates token.
3.  User completes Registration Form (Password, Name).

**Outcomes**:
*   **Success**:
    *   Account created.
    *   `TeamMember` record created linking new User to Team.
    *   `Invitation` record deleted.
    *   Redirected to Team Dashboard.
*   **Edge Case - Existing Account**: If user tries to register with email that already exists, prompt to Login instead.

### 2.5 Accept Invitation (Login Flow / Existing User)
**Goal**: User clicks invite link but already has account (or is forced to login).
**Steps**:
1.  User clicks `/invite/[token]`.
2.  System detects unauthenticated -> Redirects to Login.
3.  User logs in.
4.  System presents "Accept Invitation" screen with Team details.
5.  User clicks "Accept Invitation".

**Outcomes**:
*   **Success**:
    *   `TeamMember` record created.
    *   `Invitation` record deleted.
    *   Redirected to Team Dashboard.
*   **Failure - Wrong Account**: Logged in as `userA`, but invite was for `userB`. Show specific error "This invitation is for [email]".

### 2.6 Modify Member Role
**Goal**: Promote/Demote member.
**Pre-requisite**: Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Member List.
2.  Find target user.
3.  Open Actions Menu (...) -> "Promote to Admin" / "Demote to Member".
4.  Confirm if dialog appears.

**Outcomes**:
*   **Success**:
    *   `TeamMember` role updated in DB.
    *   UI updates badge/label immediately.
*   **Failure - Self Demotion**: Validation if trying to demote self (unless another Admin exists).
*   **Failure - Owner Handling**: Admin cannot demote Owner.

### 2.7 Remove Member
**Goal**: Revoke team access.
**Pre-requisite**: Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Member List.
2.  Find target user.
3.  Actions Menu -> "Remove from Team".
4.  Confirm Deletion Dialog.

**Outcomes**:
*   **Success**:
    *   `TeamMember` record deleted.
    *   User loses access immediately (on next request/refresh).
*   **Failure - Remove Self**: Should use "Leave Team" flow instead.
*   **Failure - Remove Owner**: Admin cannot remove Owner.

### 2.8 Leave Team
**Goal**: Voluntarily exit team.
**Pre-requisite**: User is a member of the team.
**Steps**:
1.  Navigate to Team Settings -> Members (or User Profile > Teams).
2.  Click "Leave Team" button.
3.  Confirm warning dialog.

**Outcomes**:
*   **Success**:
    *   `TeamMember` record deleted for current user.
    *   Redirect to Home or another team.
*   **Failure - Last Owner**: Cannot leave if only owner. Error "You must promote another member to Owner before leaving."

### 2.9 Revoke Invitation
**Goal**: Cancel a pending invite.
**Pre-requisite**: Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Team Settings -> Pending Invites section.
2.  Click "Revoke" (Trash icon) next to invite.
3.  Confirm if requested.

**Outcomes**:
*   **Success**:
    *   Invitation deleted from DB.
    *   Token becomes invalid immediately.
    *   Removed from UI list.

---

## 3. Developer Resources (API Keys)

### 3.1 Create API Key
**Goal**: Generate credentials for programmatic access.
**Pre-requisite**: Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Team Settings -> API Keys (`/teams/[id]/settings/keys`).
2.  Click "Create New Key".
3.  Enter `Name` (e.g., "CI/CD Pipeline").
4.  (Optional) Set Expiration.
5.  Click "Create".

**Outcomes**:
*   **Success**:
    *   Key generated and displayed **ONCE** to the user.
    *   Key record saved in DB (hashed/masked).
    *   UI shows the new key in the list.
*   **Constraint**: User must copy key immediately; it cannot be retrieved later.

### 3.2 List API Keys (Filtering)
**Goal**: Find specific keys in a long list.
**Pre-requisite**: Multiple keys exist.
**Steps**:
1.  Navigate to Team Settings -> API Keys.
2.  Enter search text in filter bar (if available) or rely on default sort (descending creation date).

**Outcomes**:
*   **Success**:
    *   List updates to show matching keys.
    *   Masked keys are shown (e.g. `pk_live_...`).

### 3.3 Revoke API Key
**Goal**: Invalidate credentials.
**Pre-requisite**: Role: **OWNER** or **ADMIN**.
**Steps**:
1.  Navigate to Team Settings -> API Keys.
2.  Find key to revoke.
3.  Click "Revoke" / "Delete".
4.  Confirm.

**Outcomes**:
*   **Success**:
    *   Key deleted from DB.
    *   Any active scripts using this key start failing with 401 Unauthorized.

---

## 4. Access Control & Permissions (Negative Testing)

| Scenario | Actor | Action | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Member Access Settings** | Member | Navigates to `/teams/[id]/settings` | Can view basic info but inputs are disabled. "Danger Zone" is hidden. |
| **Member Manage Members** | Member | Tries to Invite/Remove users | Buttons hidden. API calls return 403 Forbidden. |
| **Admin Delete Team** | Admin | Clicks "Delete Team" | Button hidden or disabled. API returns 403. |
| **Admin Manage Billing** | Admin | Navigates to Billing | Redirects or shows "Owner only" message. |
| **Cross-Team Access** | User (Team A) | Navigates to `/teams/[id-of-team-b]` | 403 Forbidden (if not member of Team B). |
| **Non-Existent Team** | User | Navigates to `/teams/99999` | 404 Not Found. |
| **Site Admin Invite** | Owner | Tries to invite email with `siteRole: ADMIN` | 403 Forbidden. |

---

## 5. Robustness & Complex Edge Cases

These scenarios represent deep edge cases that E2E tests should verify to ensure system resilience.

### 5.1 Invitation Logic Details
*   **Expired Token**: Accessing an invite link after 7 days (or configured expiry).
    *   *Expect*: Error page "Invitation Expired".
*   **Revoked Token**: Accessing a link after admin revoked it.
    *   *Expect*: Error page "Invitation Invalid".
*   **Resent Token**: Accessing the *old* link after a Resend action rotated the token.
    *   *Expect*: Error page "Invitation Invalid" (Security check: old tokens should die).
*   **Invite Yourself**: Sending an invite to the current user's email.
    *   *Expect*: Error "You are already a member" (via Direct Add flow) or distinct error.

### 5.2 Race Conditions & Concurrency
*   **Concurrent Remove**: Admin A removes User X, Admin B tries to promote User X simultaneously.
    *   *Expected*: One succeeds, one fails (User not found/Member not found).
*   **Invite/Revoke Race**: Admin revokes invite moments before User clicks "Accept".
    *   *Expected*: User sees "Invalid Invitation" error.
*   **Double Join**: User clicks "Accept" twice rapidly.
    *   *Expected*: First succeeds, second returns "Already a member" or ignores (Should not create duplicate records).

### 5.3 Limits & Quotas
*   **Max Teams**: User creates 50 teams (or system limit).
    *   *Expect*: Block creation with clear error.
*   **Invitation Spam**: User sends 100 invites to same email.
    *   *Expected*: Rate limit or de-duplication (409 Conflict).

### 5.4 Data Integrity
*   **Orphaned Resources**: Team is deleted; what happens to its Projects/Keys?
    *   *Expected*: Cascade delete (Projects, Chats, API Keys deleted).
*   **Re-creation**: Delete Team "Alpha", Create new Team "Alpha".
    *   *Expected*: Allowed. New UUID. Old links do not work.

### 5.5 Mobile & Responsive Workflows
*   **Navigation**: Verify Team Switcher and Settings are accessible via the Mobile Drawer/Sheet.
*   **Tables**: Verify Member list is usable on mobile (e.g., stacked layout or scrollable).
