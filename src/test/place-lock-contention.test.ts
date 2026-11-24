import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { placeLockItem, placeLockKey } from "@/lib/repo/place-lock";
import {
  cancelled,
  input,
  placeCreate,
  throttled,
  WINNER_LOCATION,
} from "./place-lock-helpers";

const send = vi.fn();

vi.mock("@/lib/repo/dynamo-client", () => ({
  getDocClient: () => ({ send }),
  getTableName: () => "rastabaaz-test",
}));

let DynamoRastabaazRepository: typeof import("@/lib/repo/dynamo").DynamoRastabaazRepository;

describe("place lock contention and recovery", () => {
  beforeAll(async () => {
    ({ DynamoRastabaazRepository } = await import("@/lib/repo/dynamo"));
  });

  beforeEach(() => {
    send.mockReset();
  });

  it("contends on one slot when two writers hit the same second spot", async () => {
    const pin = { lat: 18.929541, lng: 72.832621 };
    const near = { ...WINNER_LOCATION, id: "loc_second", lat: pin.lat, lng: pin.lng };
    const far = { ...WINNER_LOCATION, lat: 18.929819, lng: 72.832899 };

    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (placeCreate(command.input)) throw cancelled();
      if (Array.isArray(command.input.TransactItems)) return {};
      if (command.input.ConsistentRead === true) {
        const key = command.input.Key as { pk: string };
        if (key.pk === placeLockKey(input(pin)).pk) {
          return { Item: placeLockItem(input(pin), "loc_winner") };
        }
        if (key.pk === placeLockKey(input(pin), 1).pk) {
          return { Item: placeLockItem(input(pin), "loc_second", 1) };
        }
        if (key.pk === "LOC#loc_winner") return { Item: far };
        if (key.pk === "LOC#loc_second") return { Item: near };
      }
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input(pin));
    expect(result.location.id).toBe("loc_second");
  });

  it("stays on the same slot when the slug collided but the lock is free", async () => {
    let transacts = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (Array.isArray(command.input.TransactItems)) {
        transacts += 1;
        if (transacts === 1) throw cancelled();
        return {};
      }
      if (command.input.ConsistentRead === true) return { Item: undefined };
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input());

    const retry = send.mock.calls
      .map(([command]) => command.input)
      .filter((candidate) => Array.isArray(candidate.TransactItems))[1];
    const pks = retry.TransactItems.map(
      (entry: { Put: { Item: { pk: string } } }) => entry.Put.Item.pk,
    );

    expect(pks).toContain(placeLockKey(input()).pk);
    expect(pks).not.toContain(placeLockKey(input(), 1).pk);
    expect(result.location.slug).toMatch(/-[a-z0-9]{8}$/);
  });

  it("surfaces a throttled transact instead of retrying it as a collision", async () => {
    let transacts = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (Array.isArray(command.input.TransactItems)) {
        transacts += 1;
        throw throttled();
      }
      return { Items: [] };
    });

    await expect(new DynamoRastabaazRepository().createReport(input())).rejects.toThrow(
      /transaction cancelled/,
    );
    expect(transacts).toBe(1);
  });

  it("falls back to a fresh slug when no lock holder exists", async () => {
    let transacts = 0;
    send.mockImplementation(async (command: { input: Record<string, unknown> }) => {
      if (Array.isArray(command.input.TransactItems)) {
        transacts += 1;
        if (transacts === 1) throw cancelled();
        return {};
      }
      if (command.input.ConsistentRead === true) return { Item: undefined };
      return { Items: [] };
    });

    const result = await new DynamoRastabaazRepository().createReport(input());
    expect(transacts).toBe(2);
    expect(result.location.slug).toMatch(/-[a-z0-9]{8}$/);
    expect(result.connectedCount).toBe(0);
  });
});
