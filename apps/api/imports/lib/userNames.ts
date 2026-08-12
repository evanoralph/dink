import { Meteor } from "meteor/meteor";

export async function displayNames(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map<string, string>();
  const users = await Meteor.users
    .find({ _id: { $in: ids } }, { fields: { "profile.displayName": 1 } })
    .fetchAsync();
  return new Map(users.map((u) => [u._id!, u.profile?.displayName || "Player"]));
}
