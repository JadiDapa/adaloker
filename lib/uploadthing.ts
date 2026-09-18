import { UTApi } from "uploadthing/server";

const globalForUploadThing = global as unknown as { utapi: UTApi };

export const utapi = globalForUploadThing.utapi ?? new UTApi();

if (process.env.NODE_ENV !== "production") globalForUploadThing.utapi = utapi;
