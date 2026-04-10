import { describe, it, expect } from "vitest";
import {
  normalizeName,
  buildFileName,
  getExtensionFromMimeType,
} from "@/lib/drive/naming";

describe("normalizeName", () => {
  it("remove acentos", () => {
    expect(normalizeName("Fundação")).toBe("fundacao");
    expect(normalizeName("Alvenaria Básica")).toBe("alvenaria-basica");
  });

  it("substitui espacos por hifens", () => {
    expect(normalizeName("Residencial Sul")).toBe("residencial-sul");
  });

  it("remove caracteres especiais", () => {
    expect(normalizeName("Obra #1 (nova)")).toBe("obra-1-nova");
  });

  it("remove hifens duplicados e nas bordas", () => {
    expect(normalizeName("  Obra  ")).toBe("obra");
    expect(normalizeName("--teste--")).toBe("teste");
  });

  it("converte para lowercase", () => {
    expect(normalizeName("ESTRUTURA")).toBe("estrutura");
  });
});

describe("buildFileName", () => {
  it("formata nome completo com sequencial de 3 digitos", () => {
    const date = new Date("2026-04-10T00:00:00Z");
    const result = buildFileName(1, "Fundação", "Residencial Sul", date, "jpg");
    expect(result).toBe("001_fundacao_residencial-sul_2026-04-10.jpg");
  });

  it("incrementa sequencial corretamente", () => {
    const date = new Date("2026-04-10T00:00:00Z");
    const result = buildFileName(42, "Estrutura", "Obra ABC", date, "png");
    expect(result).toBe("042_estrutura_obra-abc_2026-04-10.png");
  });

  it("sequencial com 3 digitos para numeros grandes", () => {
    const date = new Date("2026-04-10T00:00:00Z");
    const result = buildFileName(100, "Acabamento", "Teste", date, "jpg");
    expect(result).toBe("100_acabamento_teste_2026-04-10.jpg");
  });
});

describe("getExtensionFromMimeType", () => {
  it("retorna extensao correta para tipos comuns", () => {
    expect(getExtensionFromMimeType("image/jpeg")).toBe("jpg");
    expect(getExtensionFromMimeType("image/png")).toBe("png");
    expect(getExtensionFromMimeType("image/webp")).toBe("webp");
  });

  it("retorna jpg como fallback", () => {
    expect(getExtensionFromMimeType("unknown/type")).toBe("jpg");
  });
});
