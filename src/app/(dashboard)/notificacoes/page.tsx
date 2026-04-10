"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const DIAS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sab" },
];

export default function NotificacoesPage() {
  const [template, setTemplate] = useState(
    "Ola {nome}! Por favor, envie a foto do progresso da obra com o nome da obra e a fase. Exemplo: Residencial Sul - Fundacao"
  );
  const [horario, setHorario] = useState("08:00");
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/notificacoes")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setTemplate(data.mensagemTemplate);
          setHorario(data.horario);
          setDiasSemana(data.diasSemana);
          setAtivo(data.ativo);
        }
      });
  }, []);

  function toggleDia(dia: number) {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  }

  async function handleSave() {
    setLoading(true);
    try {
      await fetch("/api/notificacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagemTemplate: template,
          horario,
          diasSemana,
          ativo,
        }),
      });
      toast.success("Configuracao salva");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNow() {
    setSending(true);
    try {
      const res = await fetch("/api/cron/enviar", { method: "POST" });
      const data = await res.json();
      toast.success(`Enviado: ${data.sent} mensagens, ${data.errors} erros`);
    } catch {
      toast.error("Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Notificacoes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensagem Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="template">
              Mensagem (use {"{nome}"} e {"{obras}"} como variaveis)
            </Label>
            <Textarea
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agendamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="horario">Horario de envio</Label>
            <Input
              id="horario"
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="w-32"
            />
          </div>

          <div>
            <Label>Dias da semana</Label>
            <div className="flex gap-2 mt-2">
              {DIAS.map((dia) => (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => toggleDia(dia.value)}
                  className={`px-3 py-1 rounded-md text-sm border ${
                    diasSemana.includes(dia.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                >
                  {dia.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Envio ativo</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Salvar Configuracao"}
        </Button>
        <Button variant="outline" onClick={handleSendNow} disabled={sending}>
          {sending ? "Enviando..." : "Enviar Agora (teste)"}
        </Button>
      </div>
    </div>
  );
}
