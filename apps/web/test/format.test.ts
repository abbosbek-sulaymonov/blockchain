import { describe, expect, it } from "vitest";

import { formatToken, shortenAddress } from "../src/lib/format";

const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("shortenAddress", () => {
  it("keeps the 0x prefix and the last four characters", () => {
    expect(shortenAddress(ADDRESS)).toBe("0xf39F…2266");
  });

  it("honours a wider character count", () => {
    expect(shortenAddress(ADDRESS, 8)).toBe("0xf39Fd6e5…fFb92266");
  });

  it("leaves a string too short to shorten alone", () => {
    expect(shortenAddress("0x1234")).toBe("0x1234");
  });
});

describe("formatToken", () => {
  it("scales an 18-decimal amount down to a readable number", () => {
    expect(formatToken(100_000000000000000000n)).toBe("100");
  });

  it("rounds to two fraction digits by default", () => {
    // 1.23456 LEARN
    expect(formatToken(1_234560000000000000n)).toBe("1.23");
  });

  it("handles a zero balance", () => {
    expect(formatToken(0n)).toBe("0");
  });

  it("does not lose precision on amounts above Number.MAX_SAFE_INTEGER", () => {
    // 10 million LEARN — the raw bigint is far beyond 2^53.
    expect(formatToken(10_000_000n * 10n ** 18n)).toBe("10,000,000");
  });

  it("respects a non-default decimals value", () => {
    // USDC-style 6 decimals.
    expect(formatToken(2_500_000n, 6)).toBe("2.5");
  });
});
