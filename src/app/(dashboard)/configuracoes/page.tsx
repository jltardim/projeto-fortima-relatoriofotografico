"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<"chatwoot" | "drive">("chatwoot");

  // Chatwoot
  const [cwBaseUrl, setCwBaseUrl] = useState("");
  const [cwApiToken, setCwApiToken] = useState("");
  const [cwAccountId, setCwAccountId] = useState("");
  const [cwInboxId, setCwInboxId] = useState("");
  const [cwDbHost, setCwDbHost] = useState("");
  const [cwDbPort, setCwDbPort] = useState("5432");
  const [cwDbName, setCwDbName] = useState("");
  const [cwDbUser, setCwDbUser] = useState("");
  const [cwDbPassword, setCwDbPassword] = useState("");

  // Drive
  const [drFolderId, setDrFolderId] = useState("");
  const [drEmail, setDrEmail] = useState("");
  const [drCredentials, setDrCredentials] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/configuracoes/chatwoot").then((r) => r.json()).then((data) => {
      if (data) {
        setCwBaseUrl(data.baseUrl || "");
        setCwAccountId(data.accountId?.toString() || "");
        setCwInboxId(data.inboxId?.toString() || "");
        setCwDbHost(data.dbHost || "");
        setCwDbPort(data.dbPort?.toString() || "5432");
        setCwDbName(data.dbName || "");
        setCwDbUser(data.dbUser || "");
      }
    });

    fetch("/api/configuracoes/drive").then((r) => r.json()).then((data) => {
      if (data) {
        setDrFolderId(data.folderIdRaiz || "");
        setDrEmail(data.serviceAccountEmail || "");
      }
    });
  }, []);

  async function saveChatwoot() {
    setLoading(true);
    try {
      await fetch("/api/configuracoes/chatwoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: cwBaseUrl,
          apiToken: cwApiToken,
          accountId: cwAccountId,
          inboxId: cwInboxId,
          dbHost: cwDbHost,
          dbPort: cwDbPort,
          dbName: cwDbName,
          dbUser: cwDbUser,
          dbPassword: cwDbPassword,
        }),
      });
      toast.success("Chatwoot configurado");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  async function saveDrive() {
    setLoading(true);
    try {
      await fetch("/api/configuracoes/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderIdRaiz: drFolderId,
          serviceAccountEmail: drEmail,
          credentialsJson: drCredentials,
        }),
      });
      toast.success("Google Drive configurado");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Configuracoes</h1>

      <div className="flex gap-2">
        <Button
          variant={tab === "chatwoot" ? "default" : "outline"}
          onClick={() => setTab("chatwoot")}
        >
          Chatwoot
        </Button>
        <Button
          variant={tab === "drive" ? "default" : "outline"}
          onClick={() => setTab("drive")}
        >
          Google Drive
        </Button>
      </div>

      {tab === "chatwoot" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API do Chatwoot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>URL Base</Label>
                <Input value={cwBaseUrl} onChange={(e) => setCwBaseUrl(e.target.value)} placeholder="https://chatwoot.example.com" />
              </div>
              <div>
                <Label>API Token</Label>
                <Input type="password" value={cwApiToken} onChange={(e) => setCwApiToken(e.target.value)} placeholder="Token de acesso" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Account ID</Label>
                  <Input value={cwAccountId} onChange={(e) => setCwAccountId(e.target.value)} placeholder="1" />
                </div>
                <div>
                  <Label>Inbox ID (WhatsApp)</Label>
                  <Input value={cwInboxId} onChange={(e) => setCwInboxId(e.target.value)} placeholder="1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Banco de Dados (PostgreSQL)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Host</Label>
                  <Input value={cwDbHost} onChange={(e) => setCwDbHost(e.target.value)} placeholder="localhost" />
                </div>
                <div>
                  <Label>Porta</Label>
                  <Input value={cwDbPort} onChange={(e) => setCwDbPort(e.target.value)} placeholder="5432" />
                </div>
              </div>
              <div>
                <Label>Nome do Banco</Label>
                <Input value={cwDbName} onChange={(e) => setCwDbName(e.target.value)} placeholder="chatwoot_production" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Usuario</Label>
                  <Input value={cwDbUser} onChange={(e) => setCwDbUser(e.target.value)} placeholder="chatwoot_reader" />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={cwDbPassword} onChange={(e) => setCwDbPassword(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveChatwoot} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Chatwoot"}
          </Button>
        </div>
      )}

      {tab === "drive" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Drive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>ID da Pasta Raiz</Label>
                <Input value={drFolderId} onChange={(e) => setDrFolderId(e.target.value)} placeholder="ID da pasta do Google Drive" />
              </div>
              <div>
                <Label>Email da Service Account</Label>
                <Input value={drEmail} onChange={(e) => setDrEmail(e.target.value)} placeholder="sa@project.iam.gserviceaccount.com" />
              </div>
              <div>
                <Label>Credentials JSON</Label>
                <Textarea
                  value={drCredentials}
                  onChange={(e) => setDrCredentials(e.target.value)}
                  placeholder='Cole aqui o JSON da service account...'
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveDrive} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Drive"}
          </Button>
        </div>
      )}
    </div>
  );
}
