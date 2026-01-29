"use client"

import * as React from "react"
import { useTransition, useState } from "react"
import { api } from "@/lib/api/api"
import { useTranslation } from "react-i18next"
import { setActiveTeam } from "@modules/team-ui/src/lib/state"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export function CreateTeamDialog({
    children,
    open: externalOpen,
    onOpenChange: externalOnOpenChange
}: {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const { t } = useTranslation()
    const [internalOpen, setInternalOpen] = useState(false)

    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        const formData = new FormData(event.currentTarget)

        startTransition(async () => {
            try {
                const result = await api.team.createTeam({ name: formData.get("name") as string });

                if (result.success && result.data?.id) {
                    setActiveTeam(result.data.id)
                    setOpen(false)
                    window.location.reload()
                } else if (!result.success) {
                    setError(result.error || t('team.create.error.failed'));
                } else {
                    window.location.reload()
                }
            } catch (err: any) {
                setError(err.message || t('team.create.error.failed'));
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent className="team-dialog-content" data-testid="create-team-dialog-content">
                <DialogHeader>
                    <DialogTitle>{t('team.create.dialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('team.create.dialog.description')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="team-dialog-form">
                    <div className="team-form-group">
                        <Label htmlFor="name">{t('team.create.dialog.name_label')}</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={t('team.create.dialog.name_placeholder')}
                            required
                            data-testid="create-team-name-input"
                        />
                    </div>
                    {error && (
                        <p className="team-form-error">{error}</p>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={isPending} data-testid="create-team-submit-btn">
                            {isPending && <Loader2 className="team-loader-icon" />}
                            {t('team.create.dialog.submit_button')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
