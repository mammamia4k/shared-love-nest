import { expect, it } from "vitest";
import { EMAIL_LOGIN_ENABLED } from "@/lib/auth-settings";

it("keeps email sign-in temporarily disabled without removing its flow", () => {
  expect(EMAIL_LOGIN_ENABLED).toBe(false);
});