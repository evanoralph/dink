import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
import {
  AvailabilityRules,
  CoachProfiles,
  Courts,
  FeatureFlags,
  GroupMembers,
  Groups,
  LadderEntries,
  Ladders,
  LeagueMembers,
  Leagues,
  PricingRules,
  Tournaments,
  VenueMemberships,
  VenuePacks,
  Venues,
} from "../collections";
import {
  assertSeedPasswordsSafe,
  blockUnsafeProdSeed,
  decideSeedOnStartup,
  logSeedDecision,
} from "../lib/seedPolicy";
import { logInfo } from "../lib/logger";
import { ROLES } from "../lib/roles";

async function ensureUser(email: string, password: string, displayName: string, roles: string[]) {
  let user = await Accounts.findUserByEmail(email);
  if (!user) {
    const userId = await Accounts.createUserAsync({
      email,
      password,
      profile: {
        displayName,
        city: "Angeles City",
        skillLevel: 3.5,
        onboardingComplete: true,
      },
    });
    user = await Meteor.users.findOneAsync(userId);
    logInfo("seed.user.created", { email, userId });
  } else {
    logInfo("seed.user.exists", { email, userId: user._id });
  }
  for (const role of roles) {
    await Roles.createRoleAsync(role, { unlessExists: true });
    await Roles.addUsersToRolesAsync(user!._id!, role);
  }
  return user!;
}

export async function seedIfNeeded() {
  // P0-07: prod-like runtimes default seed OFF; default demo passwords blocked in prod.
  const decision = decideSeedOnStartup();
  logSeedDecision(decision);
  if (!decision.run) return;

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@dink.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
  const ownerEmail = process.env.SEED_OWNER_EMAIL || "owner@dink.local";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "Owner123!";
  const playerEmail = process.env.SEED_PLAYER_EMAIL || "player@dink.local";
  const playerPassword = process.env.SEED_PLAYER_PASSWORD || "Player123!";

  const passwordCheck = assertSeedPasswordsSafe(
    [adminPassword, ownerPassword, playerPassword],
    decision.requireCustomPasswords,
  );
  if (!passwordCheck.ok) {
    blockUnsafeProdSeed(passwordCheck.reason);
  }

  for (const role of ROLES) {
    await Roles.createRoleAsync(role, { unlessExists: true });
  }

  await ensureUser(adminEmail, adminPassword, "Dink Admin", ["admin", "player"]);
  const owner = await ensureUser(ownerEmail, ownerPassword, "Venue Owner", [
    "venue_owner",
    "player",
  ]);
  const player = await ensureUser(playerEmail, playerPassword, "Demo Player", ["player", "coach"]);
  logInfo("seed.users.ready", {
    adminEmail,
    ownerEmail,
    playerEmail,
    requireCustomPasswords: decision.requireCustomPasswords,
  });

  const samples = [
    {
      name: "Clark Paddle Club",
      city: "Angeles City",
      address: "Clark Freeport, Pampanga",
      indoor: true,
      covered: true,
      airConditioned: true,
      courtCount: 4,
      priceFrom: 500,
      lat: 15.1859,
      lng: 120.5598,
      imageUrls: [
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80",
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&q=80",
      ],
      description:
        "Indoor air-conditioned courts near Clark. Easy parking, pro shop, and evening open play.",
      courts: ["Court 1", "Court 2", "Court 3", "Court 4"],
    },
    {
      name: "Pampanga Pickle Center",
      city: "Angeles City",
      address: "San Fernando Rd, Pampanga",
      indoor: false,
      covered: true,
      airConditioned: false,
      courtCount: 6,
      priceFrom: 450,
      lat: 15.1455,
      lng: 120.595,
      imageUrls: [
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&q=80",
      ],
      description:
        "Covered outdoor courts with cool evening breeze. Great for groups and weekend ladders.",
      courts: ["Court A", "Court B", "Court C", "Court D", "Court E", "Court F"],
    },
    {
      name: "Helios Courts Pasig",
      city: "Pasig",
      address: "Pasig City, Metro Manila",
      indoor: true,
      covered: true,
      airConditioned: true,
      courtCount: 8,
      priceFrom: 600,
      lat: 14.5764,
      lng: 121.0851,
      imageUrls: [
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80",
      ],
      description:
        "Metro Manila indoor club with eight courts, lockers, and coaching lanes.",
      courts: Array.from({ length: 8 }, (_, i) => `Court ${i + 1}`),
    },
    // P2-09: extra pilot-city inventory (idempotent by name).
    {
      name: "The Pickle Yard Clark",
      city: "Angeles City",
      address: "M.A. Roxas Hwy, Clark Freeport",
      indoor: false,
      covered: true,
      airConditioned: false,
      courtCount: 4,
      priceFrom: 400,
      lat: 15.176,
      lng: 120.53,
      imageUrls: ["https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&q=80"],
      description: "Covered Clark courts for evening open play and walk-in doubles.",
      courts: ["Yard 1", "Yard 2", "Yard 3", "Yard 4"],
    },
    {
      name: "Ortigas Rec Courts",
      city: "Pasig",
      address: "Ortigas Center, Pasig",
      indoor: true,
      covered: true,
      airConditioned: true,
      courtCount: 3,
      priceFrom: 650,
      lat: 14.586,
      lng: 121.061,
      imageUrls: ["https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80"],
      description: "CBD indoor courts — after-work slots and weekend round robins.",
      courts: ["Rec 1", "Rec 2", "Rec 3"],
    },
  ];

  const now = new Date();
  for (const sample of samples) {
    const existingVenue = await Venues.findOneAsync({ name: sample.name });
    if (existingVenue?._id) {
      const $set: Record<string, unknown> = { updatedAt: new Date() };
      if (!existingVenue.location) {
        $set.location = { type: "Point", coordinates: [sample.lng, sample.lat] };
      }
      if (!existingVenue.imageUrls?.length) $set.imageUrls = sample.imageUrls;
      if (!existingVenue.description || existingVenue.description.includes("seed venue for Dink MVP")) {
        $set.description = sample.description;
      }
      if (existingVenue.ratingAvg === undefined) $set.ratingAvg = 0;
      if (existingVenue.ratingCount === undefined) $set.ratingCount = 0;
      if (Object.keys($set).length > 1) {
        await Venues.updateAsync(existingVenue._id, { $set });
        logInfo("seed.venue.backfill", { venueId: existingVenue._id, name: sample.name });
      }
      continue;
    }

    const venueId = await Venues.insertAsync({
      name: sample.name,
      city: sample.city,
      address: sample.address,
      indoor: sample.indoor,
      covered: sample.covered,
      airConditioned: sample.airConditioned,
      courtCount: sample.courtCount,
      priceFrom: sample.priceFrom,
      currency: "PHP",
      status: "approved",
      ownerUserId: owner._id!,
      staffUserIds: [owner._id!],
      description: sample.description,
      imageUrls: sample.imageUrls,
      location: {
        type: "Point",
        coordinates: [sample.lng, sample.lat],
      },
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await VenueMemberships.insertAsync({
      venueId,
      userId: owner._id!,
      role: "venue_owner",
      createdAt: now,
    });

    for (const courtName of sample.courts) {
      const courtId = await Courts.insertAsync({
        venueId,
        name: courtName,
        surface: "acrylic",
        active: true,
        createdAt: now,
      });

      for (let day = 0; day < 7; day++) {
        await AvailabilityRules.insertAsync({
          courtId,
          venueId,
          dayOfWeek: day,
          startTime: "06:00",
          endTime: "22:00",
          slotDurationMin: 60,
        });
      }

      await PricingRules.insertAsync({
        venueId,
        courtId,
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: "06:00",
        endTime: "22:00",
        price: sample.priceFrom,
        pricingType: "hourly",
      });
    }

    logInfo("seed.venue.created", { venueId, name: sample.name, city: sample.city });
  }

  if (player._id && !player.profile?.inviteCode) {
    await Meteor.users.updateAsync(player._id, {
      $set: { "profile.inviteCode": "DEMO01", "profile.inviteCount": 0 },
    });
  }

  const groupName = "Clark Lunch Bunch";
  let group = await Groups.findOneAsync({ name: groupName });
  if (!group && player._id) {
    const groupId = await Groups.insertAsync({
      name: groupName,
      city: "Angeles City",
      description: "Weekday open play near Clark. Bring a paddle.",
      creatorUserId: player._id,
      visibility: "public",
      memberCount: 1,
      createdAt: now,
    });
    await GroupMembers.insertAsync({
      groupId,
      userId: player._id,
      role: "owner",
      status: "joined",
      joinedAt: now,
    });
    group = await Groups.findOneAsync(groupId);
    logInfo("seed.group.created", { groupId, name: groupName });
  }

  if (player._id && typeof player.profile?.rating !== "number") {
    await Meteor.users.updateAsync(player._id, { $set: { "profile.rating": 1000 } });
  }

  if (player._id && !(await Leagues.findOneAsync({ name: "Angeles Weeknight League" }))) {
    const leagueId = await Leagues.insertAsync({
      name: "Angeles Weeknight League",
      city: "Angeles City",
      seasonName: "Pilot Season",
      format: "doubles",
      status: "open",
      creatorUserId: player._id,
      createdAt: now,
    });
    await LeagueMembers.insertAsync({
      leagueId,
      userId: player._id,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      joinedAt: now,
    });
    logInfo("seed.league.created", { leagueId });
  }

  if (player._id && !(await Ladders.findOneAsync({ name: "Clark Ladder" }))) {
    const ladderId = await Ladders.insertAsync({
      name: "Clark Ladder",
      city: "Angeles City",
      creatorUserId: player._id,
      createdAt: now,
    });
    await LadderEntries.insertAsync({
      ladderId,
      userId: player._id,
      rank: 1,
      wins: 0,
      losses: 0,
      joinedAt: now,
    });
    logInfo("seed.ladder.created", { ladderId });
  }

  if (player._id && !(await Tournaments.findOneAsync({ name: "Sunday Showdown" }))) {
    const tournamentId = await Tournaments.insertAsync({
      name: "Sunday Showdown",
      city: "Angeles City",
      startsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      entryFee: 0,
      currency: "PHP",
      format: "single_elim",
      capacity: 8,
      status: "open",
      creatorUserId: player._id,
      createdAt: now,
    });
    logInfo("seed.tournament.created", { tournamentId });
  }

  const firstVenue = await Venues.findOneAsync({ name: "Clark Paddle Club" });
  if (firstVenue?._id && !(await VenuePacks.findOneAsync({ venueId: firstVenue._id, name: "Weeknight Pass" }))) {
    await VenuePacks.insertAsync({
      venueId: firstVenue._id,
      name: "Weeknight Pass",
      price: 1500,
      currency: "PHP",
      discountPct: 20,
      durationDays: 30,
      visitsIncluded: 8,
      active: true,
      createdAt: now,
    });
    logInfo("seed.pack.created", { venueId: firstVenue._id });
  }

  if (player._id) {
    await CoachProfiles.upsertAsync(
      { userId: player._id },
      {
        $set: {
          userId: player._id,
          city: "Angeles City",
          bio: "Demo coach — third-shot drops and doubles positioning.",
          hourlyRate: 800,
          currency: "PHP",
          active: true,
          updatedAt: now,
        },
        $setOnInsert: { ratingAvg: 0, ratingCount: 0, createdAt: now },
      },
    );
    logInfo("seed.coach.upsert", { userId: player._id });
  }

  // Marketing flags: compete + coaching on for local/demo seed.
  const flags = [
    { key: "payments_stub", enabled: true, description: "Use stub payment provider" },
    { key: "show_pricing", enabled: true, description: "Marketing pricing section" },
    { key: "show_testimonials", enabled: true, description: "Marketing testimonials" },
    { key: "show_compete", enabled: true, description: "Marketing leagues/compete section (P4)" },
    { key: "show_coaching", enabled: true, description: "Marketing coaching section (P3)" },
  ];
  for (const flag of flags) {
    await FeatureFlags.upsertAsync(
      { key: flag.key },
      { $set: { ...flag, updatedAt: new Date() } },
    );
    logInfo("seed.feature_flag.upsert", { key: flag.key, enabled: flag.enabled });
  }

  logInfo("seed.complete");
}
