import { z } from "zod";

const dataISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.")
  .refine((valor) => {
    const data = new Date(`${valor}T00:00:00Z`);
    return (
      !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor
    );
  }, "Data inválida.");

const email = z
  .string({ required_error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .email("E-mail inválido.")
  .max(160);

export const registroSchema = z
  .object({
    name: z
      .string({ required_error: "Informe o nome." })
      .trim()
      .min(2, "O nome precisa ter pelo menos 2 caracteres.")
      .max(80),
    email,
    password: z
      .string({ required_error: "Informe a senha." })
      .min(8, "A senha precisa ter pelo menos 8 caracteres.")
      .max(72),
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string({ required_error: "Informe a senha." }).min(1).max(72),
  })
  .strict();

export const contaSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome da conta.").max(80),
    type: z.enum(["checking", "savings", "investment", "cash"]).default("checking"),
    initialBalanceCents: z
      .number()
      .int("O saldo deve estar em centavos inteiros.")
      .min(-100_000_000_000)
      .max(100_000_000_000)
      .default(0),
  })
  .strict();

export const categoriaSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome da categoria.").max(60),
    type: z.enum(["income", "expense"], {
      errorMap: () => ({ message: "O tipo deve ser income ou expense." }),
    }),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal, como #10b981.")
      .default("#64748b"),
  })
  .strict();

export const transacaoSchema = z
  .object({
    accountId: z.number().int().positive("Selecione uma conta válida."),
    categoryId: z.number().int().positive().nullable().default(null),
    type: z.enum(["income", "expense"], {
      errorMap: () => ({ message: "O tipo deve ser income ou expense." }),
    }),
    amountCents: z
      .number()
      .int("O valor deve estar em centavos inteiros.")
      .positive("O valor precisa ser maior que zero.")
      .max(100_000_000_000),
    description: z.string().trim().max(180).default(""),
    occurredOn: dataISO,
  })
  .strict();

export const transacaoQuerySchema = z.object({
  from: dataISO.optional(),
  to: dataISO.optional(),
  type: z.enum(["income", "expense"]).optional(),
  accountId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const resumoQuerySchema = z.object({
  from: dataISO.optional(),
  to: dataISO.optional(),
});

export const relatorioQuerySchema = z.object({
  from: dataISO.optional(),
  to: dataISO.optional(),
  type: z.enum(["income", "expense"]).optional(),
  accountId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(80).optional(),
});

export const categoriaQuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
});
