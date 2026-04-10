import { google, drive_v3 } from "googleapis";
import { db } from "@/lib/db";

let driveClient: drive_v3.Drive | null = null;

export async function getDriveClient(): Promise<drive_v3.Drive> {
  if (driveClient) return driveClient;

  const config = await db.driveConfig.findFirst();
  if (!config) throw new Error("Google Drive nao configurado");

  const credentials = JSON.parse(config.credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

export async function getRootFolderId(): Promise<string> {
  const config = await db.driveConfig.findFirst();
  if (!config) throw new Error("Google Drive nao configurado");
  return config.folderIdRaiz;
}
