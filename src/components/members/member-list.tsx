import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Shield, Crown, User, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface TeamMemberWithUser {
    id: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    userId: string;
    teamId: string;
    createdAt: string;
    user?: {
        id: string;
        name?: string | null;
        email: string;
        image?: string | null;
        username?: string | null;
    };
}

interface TeamMemberListProps {
    members: TeamMemberWithUser[];
    currentUserId?: string;
    onChangeRole?: (memberId: string, newRole: 'OWNER' | 'ADMIN' | 'MEMBER') => void;
    onRemove?: (memberId: string) => void;
}

function getRoleIcon(role: string) {
    switch (role) {
        case 'OWNER':
            return <Crown className="h-3 w-3 text-yellow-500" />;
        case 'ADMIN':
            return <Shield className="h-3 w-3 text-blue-500" />;
        default:
            return <User className="h-3 w-3 text-muted-foreground" />;
    }
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (role) {
        case 'OWNER':
            return 'default';
        case 'ADMIN':
            return 'secondary';
        default:
            return 'outline';
    }
}

export function TeamMemberList({ members, currentUserId, onChangeRole, onRemove }: TeamMemberListProps) {
    if (!members.length) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Members</p>
                <p className="text-sm">Invite team members to collaborate.</p>
            </div>
        );
    }

    // Sort by role priority: OWNER > ADMIN > MEMBER
    const sortedMembers = [...members].sort((a, b) => {
        const priority = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
        return priority[a.role] - priority[b.role];
    });

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedMembers.map((member) => {
                        const isCurrentUser = member.userId === currentUserId;
                        const isOwner = member.role === 'OWNER';

                        return (
                            <TableRow key={member.id} data-testid={`member-${member.id}`}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.user?.image || undefined} />
                                            <AvatarFallback>
                                                {(member.user?.name || member.user?.email || '?').slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">
                                                {member.user?.name || member.user?.username || 'Unknown'}
                                                {isCurrentUser && <span className="text-muted-foreground ml-1">(you)</span>}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {member.user?.email}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {onChangeRole && !isOwner ? (
                                        <Select
                                            value={member.role}
                                            onValueChange={(value) => onChangeRole(member.id, value as any)}
                                        >
                                            <SelectTrigger className="w-[120px] h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                                <SelectItem value="MEMBER">Member</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant={getRoleBadgeVariant(member.role)}>
                                            {getRoleIcon(member.role)}
                                            <span className="ml-1">{member.role}</span>
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(member.createdAt).toLocaleDateString()}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {!isOwner && !isCurrentUser && onRemove && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => onRemove(member.id)}
                                                    data-testid={`remove-member-${member.id}`}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Remove from Team
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
