'use client';

import * as React from 'react';
import {
  Settings,
  MoreHorizontal,
  Shield,
  Trash2,
  LogOut,
  UserPlus,
  RefreshCw,
  X,
  Info,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  type Team,
  type TeamMember,
  type Invitation,
  type User,
} from '@modules/team-api/src/sdk/types';
import { api } from '@/lib/api/api';
import { ConfirmDeletionDialog } from './confirm-deletion-dialog';
import { cn } from '@/lib/core/utils';

// Re-importing locally to ensure it resolves
import { InviteMemberDialog as LocalInviteMemberDialog } from './invite-member-dialog';

type TeamWithMembers = Team & {
  members: (TeamMember & { user: User })[];
  invitations: Invitation[];
};

interface TeamSettingsProps {
  team?: TeamWithMembers;
  currentUserEmail?: string | null;
}

export function TeamSettingsContent({
  team,
  currentUserEmail,
  className,
}: TeamSettingsProps & { className?: string }) {
  const { t } = useTranslation();
  const [isPending, startTransition] = React.useTransition();

  const [_actionState, setActionState] = React.useState<{
    success?: boolean;
    error?: string;
  } | null>(null);

  // If logic: team is required
  if (!team) return null;

  const currentUserMember = team.members.find((m: any) => m.user.email === currentUserEmail);
  const isOwner = currentUserMember?.role === 'OWNER';
  const isAdmin = currentUserMember?.role === 'ADMIN' || isOwner;

  const handleRoleChange = (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    startTransition(async () => {
      try {
        await api.team.teamMember.update(memberId, { role: newRole });
        window.location.reload();
      } catch (err: any) {
        setActionState({ error: err.message || t('team.settings.members.error.update_role') });
      }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (!confirm(t('team.settings.members.confirm.remove'))) return;

    startTransition(async () => {
      try {
        await api.team.teamMember.delete(memberId);
        window.location.reload();
      } catch (err: any) {
        setActionState({ error: err.message || t('team.settings.members.error.remove_member') });
      }
    });
  };

  const handleRevokeInvitation = (invitationId: string) => {
    if (!confirm(t('team.settings.invitations.revoke_confirm'))) return;

    startTransition(async () => {
      try {
        await api.team.teamMember.deleteInvitation(invitationId);
        window.location.reload();
      } catch (err: any) {
        setActionState({ error: err.message || t('team.settings.invitations.revoke_error') });
      }
    });
  };

  const handleResendInvitation = (invitationId: string) => {
    startTransition(async () => {
      try {
        await api.team.teamMember.resendInvitation(invitationId, { invitationId });
        alert(t('team.settings.invitations.resend_success'));
      } catch (err: any) {
        setActionState({ error: err.message || t('team.settings.invitations.resend_error') });
      }
    });
  };

  const handleDeleteTeam = async () => {
    try {
      await api.team.delete(team.id);
      window.location.href = '/';
    } catch (err: any) {
      alert(err.message || t('team.settings.danger.error'));
    }
  };

  const handleRenameTeam = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const formData = new FormData(event.currentTarget);
      try {
        await api.team.update(team.id, { name: formData.get('name') as string });
        window.location.reload();
      } catch (err: any) {
        alert(err.message || t('team.settings.general.error'));
      }
    });
  };

  return (
    <div className={cn('team-settings-wrapper', className)}>
      {/* General Info */}
      <div className="team-settings-section">
        <h3 className="team-settings-section-title">{t('team.settings.general.title')}</h3>
        <form onSubmit={handleRenameTeam} className="team-form-group">
          <label className="team-form-label" htmlFor="teamName">
            {t('team.settings.general.name_label')}
          </label>
          <div className="team-settings-field-row">
            <Input
              id="teamName"
              name="name"
              defaultValue={team.name}
              disabled={!isAdmin}
              className="team-settings-name-input"
              data-testid="team-settings-name-input"
            />
            {isAdmin && (
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                data-testid="team-settings-save-name-btn"
              >
                {t('team.settings.general.save')}
              </Button>
            )}
          </div>
          {!isAdmin && (
            <p className="team-settings-helper-text">{t('team.settings.general.admin_only')}</p>
          )}
        </form>
      </div>

      {/* Members */}
      <div className="team-settings-section">
        <h3 className="team-settings-section-header">
          <div className="team-settings-header-title-wrapper">
            {t('team.settings.members.title')}
            <Badge variant="secondary">{team.members.length}</Badge>
          </div>
          {isAdmin && (
            <LocalInviteMemberDialog teams={[team]}>
              <Button
                size="sm"
                variant="outline"
                className="team-settings-invite-trigger"
                data-testid="invite-member-trigger"
              >
                <UserPlus className="team-icon-xs" />
                {t('team.settings.members.invite_button')}
              </Button>
            </LocalInviteMemberDialog>
          )}
        </h3>
        <div className="team-member-list">
          {team.members.map((member: any) => (
            <div
              key={member.id}
              className="team-member-item"
              data-testid={`team-member-row-${member.user.email}`}
            >
              <div className="team-member-info pl-2">
                <div>
                  <p className="team-member-name text-lg font-medium">
                    {member.user.name || t('team.settings.members.unknown_user')}
                  </p>
                  <p className="team-member-email text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
              </div>
              <div className="team-member-actions">
                <Badge
                  variant={
                    member.role === 'OWNER'
                      ? 'default'
                      : member.role === 'ADMIN'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {t(`team.roles.${member.role}`)}
                </Badge>

                {/* Actions */}
                {(isAdmin || member.userId === currentUserMember?.userId) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="team-action-menu-trigger h-12 w-12"
                        disabled={isPending}
                        data-testid="member-actions-trigger"
                      >
                        <MoreHorizontal className="icon-2xl" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        {t('team.settings.members.actions.label')}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* Role Management */}
                      {isOwner && member.userId !== currentUserMember?.userId && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'ADMIN')}
                            className="flex items-center cursor-pointer p-2"
                            data-testid="promote-member-btn"
                          >
                            <Shield className="team-icon-sm mr-2 shrink-0" />{' '}
                            {t('team.settings.members.actions.promote')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'MEMBER')}
                            className="flex items-center cursor-pointer p-2"
                            data-testid="demote-member-btn"
                          >
                            <Users className="team-icon-sm mr-2 shrink-0" />{' '}
                            {t('team.settings.members.actions.demote')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}

                      {/* Remove Member */}
                      {(isOwner || (isAdmin && member.role === 'MEMBER')) &&
                        member.userId !== currentUserMember?.userId && (
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="team-destructive-action text-destructive focus:text-destructive flex items-center cursor-pointer p-2"
                            data-testid="remove-member-btn"
                          >
                            <Trash2 className="team-icon-sm mr-2 shrink-0" />{' '}
                            {t('team.settings.members.actions.remove')}
                          </DropdownMenuItem>
                        )}

                      {/* Leave Team */}
                      {member.userId === currentUserMember?.userId && (
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          className="team-destructive-action text-destructive focus:text-destructive flex items-center cursor-pointer p-2"
                          data-testid="leave-team-btn"
                        >
                          <LogOut className="team-icon-sm mr-2 shrink-0" />{' '}
                          {t('team.settings.members.actions.leave')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {team.invitations && team.invitations.length > 0 && (
        <div className="team-settings-section">
          <h3 className="team-settings-section-header">
            <div className="team-settings-header-title-wrapper">
              {t('team.settings.invitations.title')}
              <Badge variant="secondary">{team.invitations.length}</Badge>
            </div>
          </h3>
          <div className="team-member-list">
            {team.invitations.map((invite: any) => {
              const isExpired = new Date() > new Date(invite.expires);
              return (
                <div
                  key={invite.id}
                  className="team-member-item"
                  data-testid={`team-invitation-row-${invite.email}`}
                >
                  <div className="team-member-info pl-2">
                    <div>
                      <p className="team-member-name text-lg font-medium">{invite.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* @ts-expect-error: generated type mismatch */}
                        <Badge variant="outline">
                          {t(`team.roles.${invite.teamRole || invite.role}`)}
                        </Badge>
                        {isExpired && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <Info className="w-3 h-3" /> {t('team.settings.invitations.expired')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="team-member-actions">
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="team-action-menu-trigger h-12 w-12"
                            disabled={isPending}
                            data-testid="invite-actions-trigger"
                          >
                            <MoreHorizontal className="icon-2xl" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {t('team.settings.invitations.actions.label', 'Invitation Actions')}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleResendInvitation(invite.id)}
                            className="flex items-center cursor-pointer p-2"
                            data-testid="resend-invite-btn"
                          >
                            <RefreshCw className="w-4 h-4 mr-2 shrink-0" />{' '}
                            {t('team.settings.invitations.resend_button')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRevokeInvitation(invite.id)}
                            className="text-destructive focus:text-destructive flex items-center cursor-pointer p-2"
                            data-testid="revoke-invite-btn"
                          >
                            <X className="w-4 h-4 mr-2 shrink-0" />{' '}
                            {t('team.settings.invitations.revoke_button')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {isOwner && (
        <div className="team-danger-zone">
          <h3 className="team-danger-title">{t('team.settings.danger.title')}</h3>
          <div className="team-danger-card">
            <div>
              <h4 className="team-danger-header">{t('team.settings.danger.delete_title')}</h4>
              <p className="team-danger-description">{t('team.settings.danger.delete_desc')}</p>
            </div>
            <ConfirmDeletionDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  data-testid="delete-team-btn"
                >
                  <Trash2 className="team-icon-sm" />
                  {t('team.settings.danger.delete_button')}
                </Button>
              }
              itemName={team.name}
              itemType="team"
              onConfirm={handleDeleteTeam}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamSettings({ team, currentUserEmail }: TeamSettingsProps) {
  const { t } = useTranslation();

  if (!team) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="team-settings-trigger h-12 w-12"
          data-testid="open-team-settings"
        >
          <Settings className="icon-2xl" />
          <span className="sr-only">{t('team.settings.title')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className="team-settings-sheet-content"
        aria-describedby={undefined}
        data-testid="team-settings-sheet"
      >
        <SheetHeader className="team-settings-header">
          <SheetTitle>{t('team.settings.title')}</SheetTitle>
          <SheetDescription>{t('team.settings.description')}</SheetDescription>
        </SheetHeader>
        <TeamSettingsContent team={team} currentUserEmail={currentUserEmail} />
      </SheetContent>
    </Sheet>
  );
}
