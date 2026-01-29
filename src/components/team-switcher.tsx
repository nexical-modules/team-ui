"use client"

import * as React from "react"
import { Users, Plus, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { CreateTeamDialog } from "./create-team-dialog"
import { TeamSettings } from "./team-settings"
import { setActiveTeam, getActiveTeam } from "@modules/team-ui/src/lib/state"
import type { TeamWithRelations } from "@modules/team-api/src/sdk";
import { useShellStore } from "@/lib/ui/shell-store";

interface TeamSwitcherProps {
    teams: TeamWithRelations[]
    currentUserEmail?: string | null
}

export function TeamSwitcher({ teams, currentUserEmail }: TeamSwitcherProps) {
    const { t } = useTranslation()
    const { setDetailPanel } = useShellStore()
    const [activeTeamId, setActiveTeamId] = React.useState<string>("")
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
        const stored = getActiveTeam()
        if (stored && teams.some(t => t.id === stored)) {
            setActiveTeamId(stored)
        } else if (teams.length > 0) {
            setActiveTeamId(teams[0].id)
        }
    }, [teams])

    const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

    const handleTeamChange = (value: string) => {
        if (value === "CREATE_NEW_TEAM") {
            setCreateDialogOpen(true)
            return
        }
        setActiveTeam(value)
        setActiveTeamId(value)
        window.location.reload()
    }

    const currentTeam = teams.find(t => t.id === activeTeamId)


    if (!isMounted) return null;

    return (
        <div className="team-switcher-container flex flex-row items-center gap-2 w-full">
            <div className="team-switcher-wrapper flex-1 min-w-0">
                {teams.length > 0 ? (
                    <Select value={activeTeamId} onValueChange={handleTeamChange}>
                        <SelectTrigger className="team-switcher-trigger h-[48px] w-full" data-testid="team-switcher-trigger">
                            <div className="team-switcher-trigger-content flex items-center gap-3 overflow-hidden">
                                <Users className="team-switcher-icon size-6 shrink-0" />
                                <SelectValue placeholder={t('team.switcher.label')} />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="w-[--radix-select-trigger-width]">
                            {teams.filter(t => t.id).map((t) => (
                                <SelectItem key={t.id} value={String(t.id)} data-testid={`team-switcher-item-${t.id}`} className="py-3 text-base">
                                    {t.name}
                                </SelectItem>
                            ))}
                            <SelectItem
                                value="CREATE_NEW_TEAM"
                                className="py-3 text-base border-t mt-1 font-medium text-primary cursor-pointer"
                                data-testid="team-switcher-create-item"
                            >
                                <span className="flex items-center gap-3">
                                    <Plus className="size-5 shrink-0" />
                                    <span>{t('team.create.dialog.submit_button')}</span>
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <Button
                        variant="outline"
                        className="team-switcher-create-empty h-[48px] w-full justify-start gap-3"
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        <Plus className="team-switcher-icon-sm size-6" />
                        {t('team.create.dialog.submit_button')}
                    </Button>
                )}
            </div>

            <CreateTeamDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />

            {/* Edit Team Button - Positioned to the right */}
            {currentTeam && (
                <div className="team-edit-button-wrapper shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="team-settings-trigger h-12 w-12"
                        data-testid="open-team-settings"
                        onClick={() => setDetailPanel("team-settings", { teamId: currentTeam.id })}
                    >
                        <Settings className="icon-2xl" />
                        <span className="sr-only">{t('team.settings.title')}</span>
                    </Button>
                </div>
            )}
        </div>
    )
}
