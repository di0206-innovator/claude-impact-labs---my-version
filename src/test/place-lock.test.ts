import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clusterKey, MATCH_METERS, metersBetween } from "@/lib/geo";
import { placeLockItem, placeLockKey } from "@/lib/repo/place-lock";
import {
  cancelled,
  input,
  placeCreate,
  WINNER_LOCATION,
} from "./place-lock-helpers";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "rastabaaz-test",
}));

let DynamoRastabaazRepository: typeof import("@/lib/repo/dynamo").DynamoRastabaazRepository;

describe("the place lock", () => {
  beforeAll(async () => {
    ({ DynamoRastabaazRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  it("keys on the geo cell and the problem, not the slug", () => {
    const key = placeLockKey(input({ issueType: "pothole" }));
    expect(key.pk).toBe(`PLACE#${clusterKey(18.9298, 72.8328)}#pothole`);
    expect(key.sk).toBe("LOCK");

    // Same spot, different problem: a different lock, so both can be created.
    expect(placeLockKey(input({ issueType: "waterlogging" })).pk).not.toBe(key.pk);
    // Same problem, same spot: the same lock, so only one writer wins.
    expect(placeLockKey(input({ lat: 18.92980001 })).pk).toBe(key.pk);
  });

  it("is written inside the create transact", async () => {
    // nearby query pages (25 cells), then the transact
    send.mockResolvedValue({ Items: [] });
    await new DynamoRastabaazRepository().createReport(input());

    const transact = send.mock.calls
      .map(([command]) => command.input)
      .find((candidate) => Array.isArray(candidate.TransactItems));
    const locks = transact.TransactItems.map(
      (entry: { Put: { Item: { pk: string } } }) => entry.Put.Item.pk,
    );

    expect(locks).toContain(placeLockKey(input()).pk);
    for (const entry of transact.TransactItems) {
      expect(entry.Put.ConditionExpression).toBe("attribute_not_exists(pk)");
    }
  });

  it("joins the winner on a cancelled transact instead of minting a duplicate", async () => {
    let call = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      call += 1;
      if (placeCreate(command.input)) throw cancelled();
      if (Array.isArray(command.input.TransactItems)) return {};
      // Consistent reads: the lock, then the location it names.
      if (command.input.ConsistentRead === true) {
        const key = command.input.Key as { pk: string };
        if (key.pk === placeLockKey(input()).pk) return { Item: placeLockItem(input(), "loc_winner") };
        if (key.pk === "LOC#loc_winner") return { Item: WINNER_LOCATION };
      }
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input());

    expect(result.location.id).toBe("loc_winner");
    expect(result.report.locationId).toBe("loc_winner");

    const consistent = send.mock.calls
      .map(([command]) => command.input)
      .filter((candidate) => candidate.ConsistentRead === true);
    expect(consistent.length).toBeGreaterThanOrEqual(2);

    const transacts = send.mock.calls.filter(([command]) =>
      Array.isArray(command.input.TransactItems),
    );
    expect(transacts.filter(([command]) => placeCreate(command.input))).toHaveLength(1);
    expect(transacts).toHaveLength(2);
    expect(call).toBeGreaterThan(1);
  });

  it("refuses to merge a lock holder outside the match radius", async () => {
    const pin = { lat: 18.929541, lng: 72.832621 };
    const far = { ...WINNER_LOCATION, lat: 18.929819, lng: 72.832899 };
    expect(placeLockKey(input({ lat: far.lat, lng: far.lng })).pk).toBe(
      placeLockKey(input(pin)).pk,
    );
    expect(metersBetween(pin.lat, pin.lng, far.lat, far.lng)).toBeGreaterThan(MATCH_METERS);

    let transacts = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (Array.isArray(command.input.TransactItems)) {
        transacts += 1;
        if (transacts === 1) throw cancelled();
        return {};
      }
      if (command.input.ConsistentRead === true) {
        const key = command.input.Key as { pk: string };
        if (key.pk.startsWith("PLACE#")) return { Item: placeLockItem(input(pin), "loc_winner") };
        if (key.pk === "LOC#loc_winner") return { Item: far };
      }
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input(pin));

    expect(result.location.id).not.toBe("loc_winner");
    expect(result.connectedCount).toBe(0);

    const retry = send.mock.calls
      .map(([command]) => command.input)
      .filter((candidate) => Array.isArray(candidate.TransactItems))[1];
    const pks = retry.TransactItems.map(
      (entry: { Put: { Item: { pk: string } } }) => entry.Put.Item.pk,
    );
    expect(pks).toContain(placeLockKey(input(pin), 1).pk);
    expect(placeLockKey(input(pin), 1).pk).not.toBe(placeLockKey(input(pin)).pk);
  });
});
