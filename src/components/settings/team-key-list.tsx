import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/api";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CreateKeyDialog } from "./create-key-dialog";
import { toast } from "sonner";
import { I18nProvider } from "@/components/system/I18nProvider";

import type { TeamApiKey } from "@modules/team-api/src/sdk";

interface TeamKeyListProps {
    teamId: string;
    keys: TeamApiKey[];
    i18nData?: any;
    canManage: boolean;
}

function TeamKeyListContent({ teamId, keys: initialKeys, canManage }: { teamId: string, keys: TeamApiKey[], canManage: boolean }) {
    const { t } = useTranslation();
    const [keys, setKeys] = useState<TeamApiKey[]>(initialKeys);

    const handleKeyCreated = (newKey: TeamApiKey) => {
        setKeys([newKey, ...keys]);
    };

    const handleRevoke = async (id: string) => {
        if (!confirm(t("team.settings.keys.revoke_confirm", "Are you sure you want to revoke this service key?"))) return;

        try {
            await api.team.teamApiKey.delete(id);
            setKeys(keys.filter((k: any) => (k as any).id !== id));
            toast.success(t("team.settings.keys.revoked_success", "Key revoked"));
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to revoke key");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">{t("team.settings.keys.title", "Service Keys")}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t("team.settings.keys.subtitle", "Manage API keys for external services and bots.")}
                    </p>
                </div>
                {canManage && <CreateKeyDialog teamId={teamId} onKeyCreated={handleKeyCreated} />}
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("team.settings.keys.table.name", "Name")}</TableHead>
                            <TableHead>{t("team.settings.keys.table.last_used", "Last Used")}</TableHead>
                            <TableHead>{t("team.settings.keys.table.created", "Created")}</TableHead>
                            {canManage && <TableHead className="w-[100px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {keys.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canManage ? 4 : 3} className="text-center py-8 text-muted-foreground">
                                    {t("team.settings.keys.empty", "No active service keys found.")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            keys.map((key) => (
                                <TableRow key={key.id} data-testid={`team-key-row-${key.name}`}>
                                    <TableCell className="font-medium">{key.name}</TableCell>
                                    <TableCell>
                                        {key.lastUsedAt
                                            ? new Date(key.lastUsedAt).toLocaleDateString()
                                            : t("team.settings.keys.never", "Never")}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(key.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    {canManage && (
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRevoke(key.id)}
                                                data-testid="revoke-key-btn"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export function TeamKeyList({ teamId, keys, i18nData, canManage }: TeamKeyListProps) {
    return (
        <I18nProvider
            initialLanguage={i18nData?.language}
            initialStore={i18nData?.store}
            availableLanguages={i18nData?.availableLanguages}
        >
            <TeamKeyListContent teamId={teamId} keys={keys} canManage={canManage} />
        </I18nProvider>
    );
}
