
const CLIENT_ID = "SEU_CLIENT_ID_AQUI.apps.googleusercontent.com"; // Substituir pelo Client ID real
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

export class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private fileName = "financeiro_ricardo_cloud.json";

  async init(): Promise<void> {
    return new Promise((resolve) => {
      const gapi = (window as any).gapi;
      const google = (window as any).google;

      if (!gapi || !google) {
        console.warn("Scripts do Google não carregados.");
        resolve();
        return;
      }

      gapi.load("client", async () => {
        await gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });

        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error) return;
            this.accessToken = resp.access_token;
            localStorage.setItem("fm_drive_token", resp.access_token);
            resolve();
          },
        });
        resolve();
      });
    });
  }

  async authenticate(): Promise<void> {
    return new Promise((resolve) => {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  async uploadData(data: string): Promise<boolean> {
    if (!this.accessToken) this.accessToken = localStorage.getItem("fm_drive_token");
    if (!this.accessToken) return false;

    try {
      const gapi = (window as any).gapi;
      
      // Busca se o arquivo já existe
      const response = await gapi.client.drive.files.list({
        q: `name = '${this.fileName}' and trashed = false`,
        fields: "files(id)",
      });

      const files = response.result.files;
      const fileId = files.length > 0 ? files[0].id : null;

      const boundary = "-------314159265358979323846";
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const metadata = {
        name: this.fileName,
        mimeType: "application/json",
      };

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        data +
        close_delim;

      const path = fileId 
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

      const method = fileId ? "PATCH" : "POST";

      await fetch(path, {
        method: method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      return true;
    } catch (error) {
      console.error("Erro no upload Drive:", error);
      return false;
    }
  }

  async downloadData(): Promise<any | null> {
    if (!this.accessToken) this.accessToken = localStorage.getItem("fm_drive_token");
    if (!this.accessToken) return null;

    try {
      const gapi = (window as any).gapi;
      const response = await gapi.client.drive.files.list({
        q: `name = '${this.fileName}' and trashed = false`,
        fields: "files(id)",
      });

      const files = response.result.files;
      if (files.length === 0) return null;

      const fileId = files[0].id;
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      return await fileResponse.json();
    } catch (error) {
      console.error("Erro no download Drive:", error);
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!(this.accessToken || localStorage.getItem("fm_drive_token"));
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem("fm_drive_token");
  }
}

export const driveService = new GoogleDriveService();
