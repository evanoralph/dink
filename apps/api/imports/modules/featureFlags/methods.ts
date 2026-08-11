import { Meteor } from "meteor/meteor";
import { getPublicFeatureFlags } from "../../lib/featureFlags";
import { withMethodLog } from "../../lib/logger";

Meteor.methods({
  async "featureFlags.public"() {
    return withMethodLog("featureFlags.public", this.userId, async () => {
      return getPublicFeatureFlags();
    });
  },
});
