import { describe, expect, it } from "vitest";
import {
  resolveUploadFilePath,
  parseUploadPublicPath,
} from "@/lib/uploads/paths";

describe("upload paths", () => {
  it("builds a safe public path", () => {
    const resolved = resolveUploadFilePath({
      projectId: "proj1",
      sourceId: "src1",
      ext: "png",
    });
    expect(resolved?.publicPath).toBe("/api/uploads/proj1/src1.png");
  });

  it("rejects path traversal in ids", () => {
    expect(
      resolveUploadFilePath({
        projectId: "../etc",
        sourceId: "src1",
        ext: "png",
      }),
    ).toBeNull();
  });

  it("parses public paths and rejects garbage", () => {
    expect(parseUploadPublicPath("/api/uploads/p/s.jpg")).toEqual({
      projectId: "p",
      sourceId: "s",
      ext: "jpg",
    });
    expect(parseUploadPublicPath("/api/uploads/../../x")).toBeNull();
  });
});
