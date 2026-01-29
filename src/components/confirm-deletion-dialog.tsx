"use client"

import * as React from "react"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ConfirmDeletionDialogProps {
    trigger: React.ReactNode
    itemName: string
    itemType: string
    onConfirm: () => Promise<void>
}

export function ConfirmDeletionDialog({
    trigger,
    itemName,
    itemType,
    onConfirm,
}: ConfirmDeletionDialogProps) {
    const { t } = useTranslation()
    const [open, setOpen] = React.useState(false)
    const [isPending, startTransition] = React.useTransition()
    const [confirmName, setConfirmName] = React.useState("")

    const translatedType = t(`team.confirm_deletion.types.${itemType}`, { defaultValue: itemType });

    const handleDelete = () => {
        if (confirmName !== itemName) return;

        startTransition(async () => {
            await onConfirm();
            setOpen(false); // Close on success/completion
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (confirmName === itemName) {
                handleDelete();
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="team-dialog-content">
                <DialogHeader>
                    <DialogTitle>{t('team.confirm_deletion.title', { type: translatedType })}</DialogTitle>
                    <DialogDescription dangerouslySetInnerHTML={{
                        __html: t('team.confirm_deletion.description', { name: itemName, type: translatedType })
                    }} />
                </DialogHeader>

                <div className="team-confirm-wrapper">
                    <Alert variant="destructive">
                        <AlertTriangle className="team-alert-icon" />
                        <AlertTitle>{t('team.confirm_deletion.warning.title')}</AlertTitle>
                        <AlertDescription>
                            {t('team.confirm_deletion.warning.message', { type: translatedType })}
                        </AlertDescription>
                    </Alert>

                    <div className="team-form-group">
                        <div className="team-confirm-instruction" dangerouslySetInnerHTML={{
                            __html: t('team.confirm_deletion.instruction', { name: itemName })
                        }} />
                        <Input
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={itemName}
                            className="team-confirm-input"
                            autoComplete="off"
                            data-testid="confirm-delete-input"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                    >
                        {t('team.confirm_deletion.cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={confirmName !== itemName || isPending}
                        data-testid="confirm-delete-submit-btn"
                    >
                        {isPending ? (
                            <Loader2 className="team-loader-icon" />
                        ) : (
                            <Trash2 className="team-icon-sm" />
                        )}
                        {t('team.confirm_deletion.submit', { type: translatedType })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
