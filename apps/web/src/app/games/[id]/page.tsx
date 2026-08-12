import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ChannelChat } from "@/components/ChannelChat";
import { FriendButton } from "@/components/FriendButton";
import {
  JoinGameButton,
  LeaveGameButton,
  PlayAgainButton,
} from "@/components/GameActions";
import { RepeatWeeklyButton } from "@/components/RepeatWeeklyButton";
import { GameRsvpBar } from "@/components/GameRsvp";
import { MatchConfirmPanel, MatchResultForm } from "@/components/MatchResultForm";
import { ReportButton } from "@/components/ReportButton";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Game } from "@/lib/types";
import { track } from "@/lib/analytics";
import { logInfo } from "@/lib/logger";

type MatchDoc = {
  _id: string;
  status: string;
  team1UserIds: string[];
  team2UserIds: string[];
  confirmedBy?: string[];
  submittedBy?: string;
};

type RosterPlayer = {
  userId: string;
  status: string;
  displayName?: string;
  reliabilityLevel?: string;
};

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await apiFetch<{
    game: Game;
    players: RosterPlayer[];
    match: MatchDoc | null;
    sets: Array<{ setNumber: number; team1Score: number; team2Score: number }>;
  }>(`/api/v1/games/${id}`);
  logInfo("page.gameDetail", {
    gameId: id,
    players: data.players.length,
    hasMatch: Boolean(data.match),
  });
  track("game_viewed", { gameId: id, userId: user?._id, status: data.game.status });

  const mine = user ? data.players.find((p) => p.userId === user._id) : undefined;
  const going = data.players.filter((p) => p.status === "joined");
  const waitlist = data.players.filter((p) => p.status === "waitlist");
  const joined = mine?.status === "joined";
  const canJoin =
    Boolean(user) &&
    mine?.status !== "joined" &&
    mine?.status !== "waitlist" &&
    ["open", "full"].includes(data.game.status);
  const canLeave = Boolean(user) && joined && ["open", "full"].includes(data.game.status);
  const isOrganizer = Boolean(user && data.game.organizerUserId === user._id);
  const inviteUrl = `/games/join?code=${encodeURIComponent(data.game.inviteCode)}`;

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">{data.game.format}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>
          Game detail
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {new Date(data.game.startsAt).toLocaleString()} · skill {data.game.skillMin}–
          {data.game.skillMax}
        </p>
        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <div>
            Going: {data.game.playerCount}/{data.game.capacity}
            {(data.game.waitlistCount || waitlist.length) > 0
              ? ` · waitlist ${data.game.waitlistCount || waitlist.length}`
              : ""}
          </div>
          <div style={{ marginTop: 8 }}>Status: {data.game.status}</div>
          <div style={{ marginTop: 8 }}>
            Invite: <code>{data.game.inviteCode}</code>{" "}
            <Link href={inviteUrl} style={{ color: "var(--court-500)", fontWeight: 600 }}>
              Share link
            </Link>
          </div>
          {user && ["open", "full"].includes(data.game.status) && (
            <GameRsvpBar gameId={id} current={mine?.status} />
          )}
          {user && (canJoin || canLeave || data.game.status === "completed" || isOrganizer) && (
            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {canJoin && (
                <JoinGameButton
                  gameId={id}
                  label={data.game.playerCount >= data.game.capacity ? "Join waitlist" : undefined}
                />
              )}
              {canLeave && <LeaveGameButton gameId={id} />}
              {data.game.status === "completed" && <PlayAgainButton gameId={id} />}
              {isOrganizer && ["open", "full", "completed"].includes(data.game.status) && (
                <RepeatWeeklyButton gameId={id} />
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <strong>Lobby</strong>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 6 }}>
            {data.players.map((p) => (
              <li key={p.userId} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {p.displayName || p.userId.slice(0, 8)} · {p.status === "joined" ? "going" : p.status}
                {p.reliabilityLevel && p.reliabilityLevel !== "new"
                  ? ` · ${p.reliabilityLevel.replace("_", " ")}`
                  : ""}
                {user && p.userId !== user._id && <FriendButton userId={p.userId} label="Follow" />}
              </li>
            ))}
            {data.players.length === 0 && <li>No RSVPs yet</li>}
          </ul>
          {user && data.game.organizerUserId !== user._id && (
            <div style={{ marginTop: 12 }}>
              <ReportButton targetType="user" targetId={data.game.organizerUserId} label="Report organizer" />
            </div>
          )}
        </div>

        {user && !data.match && ["open", "full"].includes(data.game.status) && (
          <MatchResultForm gameId={id} playerIds={going.map((p) => p.userId)} />
        )}

        {user && data.match && (
          <MatchConfirmPanel
            match={data.match}
            sets={data.sets || []}
            currentUserId={user._id}
          />
        )}
        {data.match && (
          <p style={{ marginTop: 16 }}>
            <Link href={`/matches/${data.match._id}/share`} style={{ color: "var(--court-500)", fontWeight: 700 }}>
              Share match card
            </Link>
          </p>
        )}
        {user && (joined || mine?.status === "waitlist" || mine?.status === "maybe" || isOrganizer) && (
          <ChannelChat channelType="game" channelId={id} />
        )}
      </main>
    </>
  );
}
