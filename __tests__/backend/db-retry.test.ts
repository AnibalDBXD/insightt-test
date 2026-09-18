/**
 * @jest-environment node
 */
import { getDb, resetMongoClient } from "../../src/lib/db";

const mockConnect = jest.fn();
const instances: unknown[] = [];

jest.mock("mongodb", () => ({
  MongoClient: class {
    constructor(public uri: string) {
      instances.push(this);
    }
    connect = mockConnect;
    db = () => ({ name: "test-db" });
  },
}));

beforeEach(() => {
  resetMongoClient();
  instances.length = 0;
  mockConnect.mockReset();
  mockConnect.mockResolvedValue(undefined);
  process.env.MONGODB_URI = "mongodb://localhost:27017";
});

describe("db client singleton", () => {
  it("reuses one connected client across calls", async () => {
    await getDb();
    await getDb();

    expect(instances.length).toBe(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("does not cache a client whose connect failed — next call retries", async () => {
    mockConnect.mockRejectedValueOnce(new Error("tlsv1 alert internal error"));

    await expect(getDb()).rejects.toThrow("tlsv1 alert internal error");

    await getDb();
    expect(instances.length).toBe(2);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it("resetMongoClient forces a fresh client on the next call", async () => {
    await getDb();
    resetMongoClient();
    await getDb();

    expect(instances.length).toBe(2);
  });

  it("rejects when MONGODB_URI is not set", async () => {
    delete process.env.MONGODB_URI;
    await expect(getDb()).rejects.toThrow("MONGODB_URI is not set");
  });
});
