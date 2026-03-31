import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadMedia } from "@/lib/uploads";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const directory = String(formData.get("directory") || "general");
  const filenameBase = String(formData.get("filenameBase") || crypto.randomUUID());

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Missing upload file" }, { status: 400 });
  }

  try {
    const url = await uploadMedia({ file, directory, filenameBase });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 400 },
    );
  }
}
