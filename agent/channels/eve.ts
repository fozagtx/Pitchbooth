import { timingSafeEqual } from "node:crypto";
import {
  withAuthChallenges,
  type AuthFn,
} from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

const sharedKeyAuth: AuthFn<Request> = withAuthChallenges(
  (request) => {
    const key = process.env.AGENT_SHARED_KEY;
    const authorization = request.headers.get("authorization");
    if (!key || !authorization) {
      return null;
    }

    const expected = Buffer.from(`Bearer ${key}`);
    const actual = Buffer.from(authorization);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return null;
    }

    return {
      attributes: {},
      authenticator: "pitchbooth",
      principalId: "pitchbooth-app",
      principalType: "app",
    };
  },
  [{ scheme: "Bearer" }],
);

export default eveChannel({ auth: [sharedKeyAuth] });
