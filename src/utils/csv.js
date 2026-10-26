/** Escapa um campo para CSV com separador ";" (padrão amigável ao Excel pt-BR). */
export function campoCsv(valor) {
  const texto = String(valor ?? "");
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Converte centavos em "1234,56" para planilhas. */
export function centavosParaCsv(centavos) {
  return (Number(centavos) / 100).toFixed(2).replace(".", ",");
}

export function montarCsv(linhas, colunas) {
  const cabecalho = colunas.map((coluna) => campoCsv(coluna.titulo)).join(";");
  const corpo = linhas.map((linha) =>
    colunas.map((coluna) => campoCsv(coluna.valor(linha))).join(";")
  );

  // BOM para o Excel reconhecer UTF-8.
  return `\uFEFF${[cabecalho, ...corpo].join("\r\n")}\r\n`;
}
