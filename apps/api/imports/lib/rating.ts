import { Meteor } from "meteor/meteor";
import { MatchSets, Matches, RatingHistory } from "../collections";
import { logInfo } from "./logger";

export const DEFAULT_RATING = 1000;
export const RATING_K = 32;

export function expectedScore(rA: number, rB: number) {
  return 1 / (1 + 10 ** ((rB - rA) / 400));
}

export function ratingDelta(rMe: number, rOpp: number, score: 0 | 1) {
  return Math.round(RATING_K * (score - expectedScore(rMe, rOpp)));
}

export function setWins(sets: Array<{ team1Score: number; team2Score: number }>) {
  let t1 = 0;
  let t2 = 0;
  for (const s of sets) {
    if (s.team1Score > s.team2Score) t1 += 1;
    else if (s.team2Score > s.team1Score) t2 += 1;
  }
  return { t1, t2, winner: t1 === t2 ? 0 : t1 > t2 ? 1 : 2 };
}

export async function ensureRating(userId: string) {
  const user = await Meteor.users.findOneAsync(userId);
  if (!user || user.profile?.deletedAt) return DEFAULT_RATING;
  if (typeof user.profile?.rating === "number") return user.profile.rating;
  await Meteor.users.updateAsync(userId, { $set: { "profile.rating": DEFAULT_RATING } });
  return DEFAULT_RATING;
}

export async function applyMatchRatings(matchId: string) {
  const match = await Matches.findOneAsync(matchId);
  if (!match?._id || match.ratingApplied || match.status === "voided") {
    logInfo("rating.skip", { matchId, reason: "missing_applied_or_void" });
    return;
  }
  const sets = await MatchSets.find({ matchId: match._id }).fetchAsync();
  const { winner } = setWins(sets);
  if (!winner) {
    logInfo("rating.skip", { matchId, reason: "draw" });
    return;
  }
  const team1 = match.team1UserIds.filter(Boolean);
  const team2 = match.team2UserIds.filter(Boolean);
  if (!team1.length || !team2.length) return;

  const r1s = await Promise.all(team1.map((id) => ensureRating(id)));
  const r2s = await Promise.all(team2.map((id) => ensureRating(id)));
  const avg1 = r1s.reduce((s, n) => s + n, 0) / r1s.length;
  const avg2 = r2s.reduce((s, n) => s + n, 0) / r2s.length;
  const d1 = ratingDelta(avg1, avg2, winner === 1 ? 1 : 0);
  const d2 = ratingDelta(avg2, avg1, winner === 2 ? 1 : 0);

  const now = new Date();
  async function bump(userId: string, before: number, delta: number) {
    const after = Math.max(100, before + delta);
    await Meteor.users.updateAsync(userId, { $set: { "profile.rating": after } });
    await RatingHistory.insertAsync({
      userId,
      matchId: match._id!,
      before,
      after,
      delta: after - before,
      createdAt: now,
    });
  }

  for (let i = 0; i < team1.length; i++) await bump(team1[i], r1s[i], d1);
  for (let i = 0; i < team2.length; i++) await bump(team2[i], r2s[i], d2);

  await Matches.updateAsync(match._id, { $set: { ratingApplied: true } });
  logInfo("rating.applied", { matchId, winner, d1, d2, team1: team1.length, team2: team2.length });
}

export async function reverseMatchRatings(matchId: string) {
  const rows = await RatingHistory.find({ matchId, reversed: { $ne: true } }).fetchAsync();
  for (const row of rows) {
    const user = await Meteor.users.findOneAsync(row.userId);
    const current = typeof user?.profile?.rating === "number" ? user.profile.rating : DEFAULT_RATING;
    const restored = Math.max(100, current - row.delta);
    await Meteor.users.updateAsync(row.userId, { $set: { "profile.rating": restored } });
    if (row._id) await RatingHistory.updateAsync(row._id, { $set: { reversed: true } });
  }
  await Matches.updateAsync(matchId, { $set: { ratingApplied: false, disputed: true, status: "voided" } });
  logInfo("rating.reversed", { matchId, count: rows.length });
}
