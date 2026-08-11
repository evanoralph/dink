export const ROLES = [
  "player",
  "coach",
  "organizer",
  "venue_staff",
  "venue_owner",
  "admin",
] as const;

export type Role = (typeof ROLES)[number];
