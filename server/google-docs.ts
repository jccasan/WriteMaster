import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-docs',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Docs connection (HTTP ${response.status})`);
  }

  const data = await response.json();
  connectionSettings = data?.items?.[0];

  if (!connectionSettings?.settings) {
    throw new Error('Google Docs not connected. Please connect your Google account first.');
  }

  const accessToken = connectionSettings.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Google Docs access token not found. Please reconnect your Google account.');
  }
  return accessToken;
}

// Google Docs Integration — Replit connector
export async function getUncachableGoogleDocsClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.docs({ version: 'v1', auth: oauth2Client });
}

export function extractDocId(urlOrId: string): string {
  const match = urlOrId.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]+$/.test(urlOrId)) return urlOrId;
  throw new Error("Invalid Google Doc URL or ID");
}

function extractTextFromElements(elements: any[]): string {
  let text = "";
  for (const el of elements) {
    if (el.paragraph) {
      const paraText = el.paragraph.elements
        ?.map((e: any) => e.textRun?.content || "")
        .join("") || "";
      text += paraText;
    } else if (el.table) {
      for (const row of el.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          text += extractTextFromElements(cell.content || []);
        }
      }
    }
  }
  return text;
}

export async function readGoogleDoc(docIdOrUrl: string): Promise<{ title: string; text: string; docId: string }> {
  const docs = await getUncachableGoogleDocsClient();
  const docId = extractDocId(docIdOrUrl);
  const doc = await docs.documents.get({ documentId: docId });
  const title = doc.data.title || "Untitled";
  const body = doc.data.body;
  const text = body?.content ? extractTextFromElements(body.content) : "";
  return { title, text: text.trim(), docId };
}

export async function writeGoogleDoc(docId: string, newText: string): Promise<void> {
  const docs = await getUncachableGoogleDocsClient();

  const doc = await docs.documents.get({ documentId: docId });
  const body = doc.data.body;
  const endIndex = body?.content
    ? body.content[body.content.length - 1]?.endIndex || 1
    : 1;

  const requests: any[] = [];

  if (endIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex: endIndex - 1 },
      },
    });
  }

  if (newText.trim()) {
    requests.push({
      insertText: {
        location: { index: 1 },
        text: newText,
      },
    });
  }

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    });
  }
}
