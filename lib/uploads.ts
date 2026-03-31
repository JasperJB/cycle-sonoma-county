import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { env } from "@/lib/env";

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export async function uploadMedia(args: {
  file: File;
  directory: string;
  filenameBase: string;
}) {
  if (!allowedTypes.includes(args.file.type)) {
    throw new Error("Unsupported file type");
  }

  const maxBytes = env.UPLOAD_MAX_MB * 1024 * 1024;

  if (args.file.size > maxBytes) {
    throw new Error(`File exceeds ${env.UPLOAD_MAX_MB} MB limit`);
  }

  const extension = args.file.name.split(".").pop() || "bin";
  const filename = `${args.directory}/${args.filenameBase}.${extension}`;

  if (env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, args.file, {
      access: "public",
      addRandomSuffix: true,
    });

    return blob.url;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", args.directory);
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, `${args.filenameBase}.${extension}`);
  const bytes = Buffer.from(await args.file.arrayBuffer());
  await fs.writeFile(filePath, bytes);

  return `/uploads/${args.directory}/${args.filenameBase}.${extension}`;
}
