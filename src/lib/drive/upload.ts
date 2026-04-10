import { Readable } from "stream";
import { getDriveClient, getRootFolderId } from "./client";
import { buildFileName, getExtensionFromMimeType } from "./naming";

async function findOrCreateFolder(
  parentId: string,
  folderName: string
): Promise<string> {
  const drive = await getDriveClient();

  // Search for existing folder
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return folder.data.id!;
}

async function getNextSequential(folderId: string): Promise<number> {
  const drive = await getDriveClient();

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(name)",
    spaces: "drive",
    orderBy: "name desc",
    pageSize: 1000,
  });

  if (!res.data.files || res.data.files.length === 0) {
    return 1;
  }

  let maxSeq = 0;
  for (const file of res.data.files) {
    const match = file.name?.match(/^(\d+)_/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }

  return maxSeq + 1;
}

export async function uploadPhoto(
  obraNome: string,
  faseNome: string,
  imageBuffer: Buffer,
  mimeType: string,
  date: Date
): Promise<{ fileId: string; folderId: string; fileName: string }> {
  const rootFolderId = await getRootFolderId();
  const drive = await getDriveClient();

  // Create/find obra folder
  const obraFolderId = await findOrCreateFolder(rootFolderId, obraNome);

  // Create/find fase folder inside obra
  const faseFolderId = await findOrCreateFolder(obraFolderId, faseNome);

  // Get next sequential number
  const seq = await getNextSequential(faseFolderId);

  // Build filename
  const ext = getExtensionFromMimeType(mimeType);
  const fileName = buildFileName(seq, faseNome, obraNome, date, ext);

  // Upload file
  const stream = new Readable();
  stream.push(imageBuffer);
  stream.push(null);

  const uploadRes = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [faseFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id",
  });

  return {
    fileId: uploadRes.data.id!,
    folderId: faseFolderId,
    fileName,
  };
}
