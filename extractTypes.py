with open('demo/src/pages/activities/match-detail/MatchLineupField.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's extract types to MatchLineupTypes.ts
types_content = '''export interface SquadMemberUser {
  id?: string;
  name?: string;
  user_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface SquadMember {
  id: string;
  isGuest?: boolean;
  user?: SquadMemberUser;
  member?: SquadMemberUser;
  metadata?: { shirt_number?: string; [key: string]: unknown };
  data?: {
    jersey_number?: string;
    functional_role?: string;
    [key: string]: unknown;
  };
  functional_roles?: string[];
}

export const getSquadMemberName = (p: SquadMember): string => {
  const user = p.user || p.member;
  if (!user) return "Unknown";
  if (user.name) return user.name;
  if (user.user_name) return user.user_name;
  const full = ${user.first_name || ""} .trim();
  if (full) return full;
  if (user.email) return user.email;
  return "Unknown";
};

export const getUserKey = (p: SquadMember): string => {
  const user = p.user || p.member;
  if (user?.id) return String(user.id);
  return String(p.id);
};
'''
with open('demo/src/pages/activities/match-detail/MatchLineupTypes.ts', 'w', encoding='utf-8') as f:
    f.write(types_content)

print("success types")
