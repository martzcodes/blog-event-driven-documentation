import { Readable } from "stream";

export const streamToString = async (stream: Readable): Promise<string> => {
  return new Promise((res, rej) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", rej);
    stream.on("end", () => res(Buffer.concat(chunks).toString("utf8")));
  });
};