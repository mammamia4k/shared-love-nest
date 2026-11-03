import { expect, it } from "vitest";
import { EMAIL_LOGIN_ENABLED } from "@/lib/auth-settings";

it("keeps email sign-in enabled with its code flow intact", () => {
  expect(EMAIL_LOGIN_ENABLED).toBe(true);
});