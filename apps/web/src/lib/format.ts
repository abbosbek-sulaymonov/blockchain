import { formatUnits } from "viem";

/** `0x1234…abcd` — the standard way to show an address without eating the layout. */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length < 2 * chars + 2) {
    return address;
  }
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Token amounts are integers on-chain. 18 decimals means 1 LEARN is 10^18 wei-equivalent. */
export function formatToken(amount: bigint, decimals = 18, maxFractionDigits = 2): string {
  const asNumber = Number(formatUnits(amount, decimals));
  return asNumber.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
}

/** Unix seconds from `block.timestamp` to something a human reads. */
export function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}

export function formatRelative(unixSeconds: number, now = Date.now()): string {
  const deltaSeconds = Math.round((unixSeconds * 1000 - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.35],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ];

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  let value = deltaSeconds;

  for (const [unit, step] of units) {
    if (Math.abs(value) < step) {
      return formatter.format(Math.round(value), unit);
    }
    value /= step;
  }

  return formatter.format(Math.round(value), "year");
}
