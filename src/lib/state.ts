export function setActiveTeam(teamId: string) {
    // Set cookie for 1 year
    document.cookie = `active-team=${teamId}; path=/; max-age=31536000; SameSite=Lax`;
}

export function getActiveTeam(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(^| )active-team=([^;]+)/);
    return match ? match[2] : null;
}
