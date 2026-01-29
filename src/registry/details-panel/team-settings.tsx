import React from 'react';
import { useTranslation } from 'react-i18next';
import { TeamSettingsContent } from '../../components/team-settings';
import { useNavData } from "@/lib/ui/nav-context";
import { Loader2 } from 'lucide-react';
import { getActiveTeam } from '@modules/team-ui/src/lib/state';
import { api } from '@/lib/api/api';

// We need to fetch the FULL team data because NavContext usually only has basic team info
// TeamSettingsContent expects TeamWithMembers (User relations etc)

export default function TeamSettingsDetailsPanel(props: any) {
    const { t } = useTranslation();
    const { context } = useNavData();
    const [team, setTeam] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Get teamId from props (passed via setDetailPanel second arg) or active team
    const teamId = props.teamId || getActiveTeam();

    React.useEffect(() => {
        if (!teamId) {
            setLoading(false);
            return;
        }

        async function fetchTeam() {
            try {
                // We need a way to fetch team details with members
                // Assuming api.team.get(id) returns full data or we need a specific endpoint
                // Checking sdk... api.team.get usually returns standard team object
                // But TeamSettingsContent needs members.
                // We might need to fetch members separately or use an endpoint that includes them.
                // For now, let's try api.team.getById(teamId)
                const result = await api.team.get(teamId);

                if (!result.success || !result.data) {
                    setError((result as any).error || "Team not found");
                    setLoading(false);
                    return;
                }

                const teamData = result.data;

                // Fetching members
                const membersResponse = await api.team.teamMember.list({ filters: { teamId } });
                const invitationsResponse = await api.team.invitation.list({ filters: { teamId } });

                const members = (membersResponse as any).data || [];
                const invitations = (invitationsResponse as any).data || [];

                setTeam({
                    ...teamData,
                    members,
                    invitations
                });
            } catch (err: any) {
                console.error("Failed to load team settings", err);
                setError(err.message || "Failed to load team");
            } finally {
                setLoading(false);
            }
        }

        fetchTeam();
    }, [teamId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin size-8 text-primary" />
            </div>
        );
    }

    if (!team) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                Team not found.
            </div>
        );
    }

    // Current User Email from context
    const currentUserEmail = (context?.user as any)?.email;

    return (
        <div className="team-settings-panel h-full overflow-y-auto">
            <div className="team-settings-panel-header mb-6">
                <h2 className="text-xl font-semibold tracking-tight">{t('team.settings.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('team.settings.description')}</p>
            </div>
            <TeamSettingsContent team={team} currentUserEmail={currentUserEmail} />
        </div>
    );
}
