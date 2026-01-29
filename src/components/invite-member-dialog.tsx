import * as React from "react"
import { Send } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api/api"
import { type Team } from "@modules/team-api/src/sdk/types"

interface InviteMemberDialogProps {
    children?: React.ReactNode
    teams?: Team[]
}

export function InviteMemberDialog({ children, teams = [] }: InviteMemberDialogProps) {
    const { t } = useTranslation()
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [resultUrl, setResultUrl] = React.useState<string | null>(null)
    const [email, setEmail] = React.useState("")
    const [selectedTeamId, setSelectedTeamId] = React.useState<string>(teams[0]?.id || "")
    const [role, setRole] = React.useState<'ADMIN' | 'MEMBER'>('MEMBER')
    const [siteRole, setSiteRole] = React.useState<'EMPLOYEE' | 'CONTRACTOR'>('EMPLOYEE')
    const [submitted, setSubmitted] = React.useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResultUrl(null)
        setSubmitted(false)

        try {
            const data = await api.team.teamMember.inviteMember({
                teamId: selectedTeamId,
                email,
                role,
            });

            setSubmitted(true)

            if (data.url) {
                setResultUrl(data.url)
            } else {
                setOpen(false)
                window.location.reload()
            }
            setLoading(false)

        } catch (err: any) {
            setLoading(false);
            setError(err.message || "An unexpected error occurred");
        }
    }

    const resetForm = () => {
        setResultUrl(null)
        setError(null)
        setEmail("")
        setSubmitted(false)
    }

    const onOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            if (submitted && resultUrl) {
                window.location.reload()
            }
            setTimeout(resetForm, 300)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline">
                        <Send className="team-icon-sm" />
                        {t('team.invite_dialog.trigger_button')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="team-dialog-content" data-testid="invite-member-dialog-content">
                <DialogHeader>
                    <DialogTitle>{t('team.invite_dialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('team.invite_dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                {resultUrl ? (
                    <div className="team-dialog-success-wrapper" data-testid="invite-member-success">
                        <div className="team-form-success-box">
                            <Send className="team-form-success-icon" />
                            <p className="team-form-success-title">{t('team.invite_dialog.success.title')}</p>
                            <p className="team-form-success-text" dangerouslySetInnerHTML={{ __html: t('team.invite_dialog.success.text', { email }) }} />
                        </div>
                        <div className="team-dialog-success-actions">
                            <Button onClick={resetForm} variant="outline" className="team-invite-another-btn">
                                {t('team.invite_dialog.success.another_button')}
                            </Button>
                            <Button onClick={() => setOpen(false)} variant="default" data-testid="close-invite-dialog-btn">
                                {t('common.close', { defaultValue: 'Close' })}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="team-dialog-form">
                        <div className="team-form-group">
                            <Label htmlFor="team">{t('team.invite_dialog.form.team_label')}</Label>
                            <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={teams.length <= 1}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('team.invite_dialog.form.team_placeholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map(team => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="team-form-group">
                            <Label htmlFor="email">{t('team.invite_dialog.form.email_label')}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('team.invite_dialog.form.email_placeholder')}
                                required
                                className="team-input"
                                data-testid="invite-member-email-input"
                            />
                        </div>

                        <div className="team-input-row-2">
                            <div className="team-form-group">
                                <Label htmlFor="role">{t('team.invite_dialog.form.role_label')}</Label>
                                <Select value={role} onValueChange={(val) => setRole(val as 'ADMIN' | 'MEMBER')}>
                                    <SelectTrigger data-testid="invite-member-role-trigger">
                                        <SelectValue placeholder={t('team.invite_dialog.form.role_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MEMBER">{t('team.roles.MEMBER')}</SelectItem>
                                        <SelectItem value="ADMIN">{t('team.roles.ADMIN')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="team-form-group">
                                <Label htmlFor="siteRole">{t('team.invite_dialog.form.site_role_label')}</Label>
                                <Select value={siteRole} onValueChange={(val) => setSiteRole(val as 'EMPLOYEE' | 'CONTRACTOR')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('team.invite_dialog.form.site_role_placeholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EMPLOYEE">{t('team.roles.EMPLOYEE')}</SelectItem>
                                        <SelectItem value="CONTRACTOR">{t('team.roles.CONTRACTOR')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {error && (
                            <div className="team-form-error-box" data-testid="invite-member-error">
                                {error}
                            </div>
                        )}
                        <DialogFooter className="team-form-footer">
                            <Button type="submit" disabled={loading || !selectedTeamId} className="team-submit-button" data-testid="invite-member-submit-btn">
                                {loading ? t('team.invite_dialog.form.submitting') : t('team.invite_dialog.form.submit_button')}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
