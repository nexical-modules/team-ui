import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/api";
import { Copy, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import type { TeamApiKey } from "@modules/team-api/src/sdk";

interface CreateKeyDialogProps {
    teamId: string;
    onKeyCreated: (key: TeamApiKey) => void;
}

export function CreateKeyDialog({ teamId, onKeyCreated }: CreateKeyDialogProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [rawKey, setRawKey] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = await api.team.teamApiKey.createKey({ teamId, name });

            setRawKey((data as any).rawKey);
            onKeyCreated((data as any).key || data);
            toast.success("Service key created successfully");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (rawKey) {
            navigator.clipboard.writeText(rawKey);
            toast.success("Key copied to clipboard");
        }
    };

    const handleClose = () => {
        setOpen(false);
        setRawKey(null);
        setName("");
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogTrigger asChild>
                <Button onClick={() => setOpen(true)} data-testid="create-key-trigger">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("team.settings.keys.create_button", "Create Key")}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("team.settings.keys.create_dialog.title", "Create Service Key")}</DialogTitle>
                    <DialogDescription>
                        {t("team.settings.keys.create_dialog.description", "Create a key for automated services (CI/CD, Bots). You will only see it once.")}
                    </DialogDescription>
                </DialogHeader>

                {!rawKey ? (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="keyName">{t("team.settings.keys.name_label", "Key Name")}</Label>
                            <Input
                                id="keyName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. GitHub Actions"
                                required
                                data-testid="create-key-name-input"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                {t("core.common.cancel", "Cancel")}
                            </Button>
                            <Button type="submit" disabled={loading} data-testid="create-key-submit">
                                {loading ? t("core.common.creating", "Creating...") : t("core.common.create", "Create")}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">
                                {t("team.settings.keys.warning_copy", "Make sure to copy your service key now. You won't be able to see it again!")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("team.settings.keys.your_key", "Your Service Key")}</Label>
                            <div className="flex gap-2">
                                <Input value={rawKey} readOnly className="font-mono" data-testid="create-key-value" />
                                <Button size="icon" variant="outline" onClick={handleCopy}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleClose} data-testid="create-key-done">
                                {t("core.common.done", "Done")}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
