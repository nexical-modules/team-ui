import React from "react";
import { TeamSwitcher } from "@modules/team-ui/src/components/team-switcher";
import { useNavData } from "@/lib/ui/nav-context";

import type { TeamWithRelations } from "@modules/team-api/src/sdk";


export default function TeamSwitcherRegistryItem() {
    const { context } = useNavData();
    const teams = (context?.teams as TeamWithRelations[]) || [];
    const user = context?.user as { email?: string } | null;

    if (!user) return null;

    return <TeamSwitcher teams={teams} currentUserEmail={user.email} />;
}
