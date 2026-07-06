import { test } from "node:test";
import assert from "node:assert/strict";
import {
  flattenAttribution,
  readAttribution,
  parseAttributionCookie,
} from "@/lib/attribution";

test("flatten prefixes and round-trips through read", () => {
  const attr = {
    utm_source: "tiktok",
    utm_campaign: "vid3",
    referrer: "instagram.com",
    landing_path: "/start",
    ts: "123",
  };
  const flat = flattenAttribution(attr);
  assert.equal(flat.attr_utm_source, "tiktok");
  assert.equal(flat.attr_utm_campaign, "vid3");
  assert.deepEqual(readAttribution(flat), attr);
});

test("flatten drops nullish and caps value length at 480", () => {
  const flat = flattenAttribution({ a: null, b: undefined, c: "x".repeat(600) });
  assert.ok(!("attr_a" in flat));
  assert.ok(!("attr_b" in flat));
  assert.equal(flat.attr_c.length, 480);
});

test("readAttribution ignores non-attr metadata keys", () => {
  const back = readAttribution({ userId: "u1", personId: "p1", attr_utm_source: "yt" });
  assert.deepEqual(back, { utm_source: "yt" });
});

test("parseAttributionCookie tolerates malformed input", () => {
  assert.deepEqual(parseAttributionCookie(undefined), {});
  assert.deepEqual(parseAttributionCookie("not json"), {});
  assert.deepEqual(parseAttributionCookie("[1,2]"), {}); // arrays rejected
  assert.deepEqual(
    parseAttributionCookie(encodeURIComponent(JSON.stringify({ utm_source: "x" }))),
    { utm_source: "x" }
  );
});
