/** Data local no formato YYYY-MM-DD (sem depender do fuso UTC). */
export function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Primeiro e último dia do mês de referência. */
export function limitesDoMes(data = new Date()) {
  const ano = data.getFullYear();
  const mes = data.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);

  return {
    from: `${ano}-${String(mes + 1).padStart(2, "0")}-01`,
    to: `${ano}-${String(mes + 1).padStart(2, "0")}-${String(
      ultimo.getDate()
    ).padStart(2, "0")}`,
    primeiroDia: dataLocalISO(primeiro),
  };
}

/** Garante que o período informado faça sentido. */
export function periodoValido(from, to) {
  return !from || !to || from <= to;
}
