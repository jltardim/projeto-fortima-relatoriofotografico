"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Lock, Loader2, MessageSquare, HardDrive, Bot, Shield, ChevronDown, ChevronUp } from "lucide-react";

type Tab = "chatwoot" | "drive" | "ia" | "seguranca";

const OPENROUTER_MODELS = [
  { id: "z-ai/glm-5.1", label: "GLM 5.1 (Z.AI)" },
  { id: "qwen/qwen3.6-plus", label: "Qwen 3.6 Plus (Gratuito)" },
  { id: "minimax/minimax-m2.7", label: "MiniMax M2.7" },
  { id: "custom", label: "ID customizado..." },
];

// ──────────────── Tela de Senha ────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Verifica se já tem senha configurada
    fetch("/api/configuracoes/config-password")
      .then((r) => r.json())
      .then((data) => {
        if (!data.hasPassword) {
          // Primeira vez — libera acesso
          onUnlock();
        }
        setLoading(false);
      });
  }, [onUnlock]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/configuracoes/config-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", password }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.valid) {
      sessionStorage.setItem("config-unlocked", "true");
      onUnlock();
    } else {
      setError("Senha incorreta");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-24">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto rounded-full bg-muted p-3 mb-2">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Acesso Restrito</CardTitle>
          <CardDescription>
            Digite a senha de administrador para acessar as configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="config-pw">Senha</Label>
              <Input
                id="config-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desbloquear
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────── Página Principal ────────────────

export default function ConfiguracoesPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("chatwoot");

  // Chatwoot
  const [cwBaseUrl, setCwBaseUrl] = useState("");
  const [cwApiToken, setCwApiToken] = useState("");
  const [cwAccountId, setCwAccountId] = useState("");
  const [cwInboxId, setCwInboxId] = useState("");

  // Drive
  const [drFolderId, setDrFolderId] = useState("");
  const [drEmail, setDrEmail] = useState("");
  const [drCredentials, setDrCredentials] = useState("");
  const [driveHelpOpen, setDriveHelpOpen] = useState(false);

  // LLM / OpenRouter
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("qwen/qwen3.6-plus");
  const [llmCustomModel, setLlmCustomModel] = useState("");

  // Seguranca
  const [newConfigPw, setNewConfigPw] = useState("");
  const [confirmConfigPw, setConfirmConfigPw] = useState("");

  const [loading, setLoading] = useState(false);

  // Verifica sessionStorage
  useEffect(() => {
    if (sessionStorage.getItem("config-unlocked") === "true") {
      setUnlocked(true);
    }
  }, []);

  // Carrega dados ao desbloquear
  useEffect(() => {
    if (!unlocked) return;

    fetch("/api/configuracoes/chatwoot").then((r) => r.json()).then((data) => {
      if (data) {
        setCwBaseUrl(data.baseUrl || "");
        setCwAccountId(data.accountId?.toString() || "");
        setCwInboxId(data.inboxId?.toString() || "");
      }
    });

    fetch("/api/configuracoes/drive").then((r) => r.json()).then((data) => {
      if (data) {
        setDrFolderId(data.folderIdRaiz || "");
        setDrEmail(data.serviceAccountEmail || "");
      }
    });

    fetch("/api/configuracoes/llm").then((r) => r.json()).then((data) => {
      if (data) {
        setLlmApiKey(data.openrouterApiKey || "");
        const model = data.openrouterModel || "qwen/qwen3.6-plus";
        const isPreset = OPENROUTER_MODELS.some((m) => m.id === model);
        if (isPreset) {
          setLlmModel(model);
        } else {
          setLlmModel("custom");
          setLlmCustomModel(model);
        }
      }
    });
  }, [unlocked]);

  if (!unlocked) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Configurações</h1>
        <PasswordGate onUnlock={() => setUnlocked(true)} />
      </div>
    );
  }

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

  async function saveLlm() {
    setLoading(true);
    try {
      const modelToSave = llmModel === "custom" ? llmCustomModel : llmModel;
      if (!modelToSave) {
        toast.error("Selecione um modelo");
        setLoading(false);
        return;
      }
      await fetch("/api/configuracoes/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openrouterApiKey: llmApiKey,
          openrouterModel: modelToSave,
        }),
      });
      toast.success("Configuração de IA salva");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword() {
    if (newConfigPw !== confirmConfigPw) {
      toast.error("As senhas não conferem");
      return;
    }
    if (newConfigPw.length < 4) {
      toast.error("Senha deve ter no mínimo 4 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/configuracoes/config-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", password: newConfigPw }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Senha de configurações atualizada");
        setNewConfigPw("");
        setConfirmConfigPw("");
      } else {
        toast.error(data.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "chatwoot", label: "Chatwoot", icon: MessageSquare },
    { id: "drive", label: "Google Drive", icon: HardDrive },
    { id: "ia", label: "IA", icon: Bot },
    { id: "seguranca", label: "Segurança", icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
            className="gap-2"
            size="sm"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* ─── Chatwoot ─── */}
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

          <Button onClick={saveChatwoot} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Chatwoot
          </Button>
        </div>
      )}

      {/* ─── Google Drive ─── */}
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

          {/* Ajuda - Como obter credenciais */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setDriveHelpOpen(!driveHelpOpen)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Como obter as credenciais do Google Drive?</CardTitle>
                {driveHelpOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {driveHelpOpen && (
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div>
                  <p className="font-medium text-foreground mb-1">1. Criar projeto no Google Cloud</p>
                  <p>Acesse console.cloud.google.com, crie um novo projeto ou selecione um existente.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">2. Ativar Google Drive API</p>
                  <p>No menu lateral, vá em &quot;APIs e Serviços&quot; &gt; &quot;Biblioteca&quot;. Pesquise &quot;Google Drive API&quot; e ative.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">3. Criar Service Account</p>
                  <p>Vá em &quot;APIs e Serviços&quot; &gt; &quot;Credenciais&quot; &gt; &quot;Criar credenciais&quot; &gt; &quot;Conta de serviço&quot;. Dê um nome e clique em &quot;Criar&quot;.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">4. Baixar JSON de credenciais</p>
                  <p>Na lista de contas de serviço, clique na conta criada. Vá na aba &quot;Chaves&quot; &gt; &quot;Adicionar chave&quot; &gt; &quot;JSON&quot;. O arquivo será baixado automaticamente. Cole o conteúdo inteiro no campo &quot;Credentials JSON&quot; acima.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">5. Compartilhar pasta do Drive</p>
                  <p>No Google Drive, crie uma pasta para as fotos das obras. Clique com botão direito &gt; &quot;Compartilhar&quot;. Adicione o email da service account (campo acima) com permissão de &quot;Editor&quot;. O ID da pasta está na URL: drive.google.com/drive/folders/<strong>ESTE_ID_AQUI</strong></p>
                </div>
              </CardContent>
            )}
          </Card>

          <Button onClick={saveDrive} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Drive
          </Button>
        </div>
      )}

      {/* ─── IA / OpenRouter ─── */}
      {tab === "ia" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OpenRouter - Inteligência Artificial</CardTitle>
              <CardDescription>
                A IA analisa mensagens do WhatsApp para identificar automaticamente a obra e fase das fotos enviadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key do OpenRouter</Label>
                <Input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                />
                <p className="text-xs text-muted-foreground">
                  Obtenha em openrouter.ai/keys
                </p>
              </div>

              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={llmModel} onValueChange={setLlmModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENROUTER_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {llmModel === "custom" && (
                <div className="space-y-2">
                  <Label>ID do Modelo (OpenRouter)</Label>
                  <Input
                    value={llmCustomModel}
                    onChange={(e) => setLlmCustomModel(e.target.value)}
                    placeholder="provider/model-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Veja modelos disponíveis em openrouter.ai/models
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={saveLlm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar IA
          </Button>
        </div>
      )}

      {/* ─── Segurança ─── */}
      {tab === "seguranca" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Senha de Acesso às Configurações</CardTitle>
              <CardDescription>
                Defina uma senha para proteger o acesso a esta página. Será solicitada sempre que alguém acessar as configurações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <Input
                  type="password"
                  value={newConfigPw}
                  onChange={(e) => setNewConfigPw(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Senha</Label>
                <Input
                  type="password"
                  value={confirmConfigPw}
                  onChange={(e) => setConfirmConfigPw(e.target.value)}
                  placeholder="Repita a senha"
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={savePassword} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Senha
          </Button>
        </div>
      )}
    </div>
  );
}
