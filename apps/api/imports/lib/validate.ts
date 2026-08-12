import { Meteor } from "meteor/meteor";
import { z, type ZodTypeAny } from "zod";
import { logWarn } from "./logger";

/** Parse with Zod; throw Meteor.Error 400-style on failure (P1-18). */
export function parseBody<T extends ZodTypeAny>(
  schema: T,
  input: unknown,
  label: string,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    logWarn("validate.fail", { label, message, issues: result.error.issues.length });
    throw new Meteor.Error("invalid-body", message || `Invalid ${label}`);
  }
  return result.data;
}
