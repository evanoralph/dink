declare module "meteor/meteor" {
  namespace Meteor {
    interface UserProfile {
      displayName?: string;
      city?: string;
      skillLevel?: number;
      onboardingComplete?: boolean;
      reliabilityCompleted?: number;
      reliabilityNoShows?: number;
      reliabilityScore?: number;
      reliabilityLevel?: "new" | "reliable" | "highly_reliable";
      suspended?: boolean;
      deletedAt?: Date;
      inviteCode?: string;
      inviteCount?: number;
      invitedBy?: string;
      phone?: string;
      /** P4-01 Elo-like rating (default 1000). */
      rating?: number;
    }
    interface User {
      profile?: UserProfile;
    }
  }
}

declare module "meteor/accounts-base" {
  namespace Accounts {
    function _hashLoginToken(token: string): string;
    function _generateStampedLoginToken(): { token: string; when: Date };
    function _insertLoginToken(
      userId: string,
      stamped: { token: string; when: Date },
    ): Promise<void> | void;
    function _checkPasswordAsync(
      user: Meteor.User,
      password: string,
    ): Promise<{ userId: string; error?: Error }>;
  }
}
