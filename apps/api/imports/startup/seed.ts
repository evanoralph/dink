import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
import {
  AvailabilityRules,
  Courts,
  FeatureFlags,
  PricingRules,
  VenueMemberships,
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
  await ensureUser(playerEmail, playerPassword, "Demo Player", ["player"]);
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
      // Clark Freeport approx
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
  ];

  // Backfill listing fields on existing seed venues (safe no-op if already set).
  for (const sample of samples) {
    const venue = await Venues.findOneAsync({ name: sample.name });
    if (!venue?._id) continue;
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    if (!venue.location) {
      $set.location = {
        type: "Point",
        coordinates: [sample.lng, sample.lat],
      };
    }
    if (!venue.imageUrls?.length) $set.imageUrls = sample.imageUrls;
    if (!venue.description || venue.description.includes("seed venue for Dink MVP")) {
      $set.description = sample.description;
    }
    if (venue.ratingAvg === undefined) $set.ratingAvg = 0;
    if (venue.ratingCount === undefined) $set.ratingCount = 0;
    if (Object.keys($set).length > 1) {
      await Venues.updateAsync(venue._id, { $set });
      logInfo("seed.venue.backfill", { venueId: venue._id, name: sample.name });
    }
  }

  const existing = await Venues.find().countAsync();
  if (existing > 0) {
    logInfo("seed.venues.exists", { count: existing });
    return;
  }

  const now = new Date();
  for (const sample of samples) {
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

    logInfo("seed.venue.created", { venueId, name: sample.name });
  }

  // Marketing flags: compete/coaching stay disabled until product ships (P0-03 / P0-04).
  const flags = [
    { key: "payments_stub", enabled: true, description: "Use stub payment provider" },
    { key: "show_pricing", enabled: true, description: "Marketing pricing section" },
    { key: "show_testimonials", enabled: true, description: "Marketing testimonials" },
    { key: "show_compete", enabled: false, description: "Marketing leagues/compete section (unshipped)" },
    { key: "show_coaching", enabled: false, description: "Marketing coaching section (unshipped)" },
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
