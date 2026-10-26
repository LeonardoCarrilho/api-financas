import "dotenv/config";

const numero = (valor, padrao) => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : padrao;
};

const obrigatorioEmProducao = (valor, padrao, nome) => {
  if (process.env.NODE_ENV === "production" && (!valor || valor === padrao)) {
    throw new Error(
      `A variável ${nome} precisa ser definida com um valor próprio em produção.`
    );
  }
  return valor || padrao;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: numero(process.env.PORT, 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  jwt: {
    secret: obrigatorioEmProducao(
      process.env.JWT_SECRET,
      "dev-secret-nao-use-em-producao",
      "JWT_SECRET"
    ),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  },
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: numero(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? "financas",
    password: process.env.DB_PASSWORD ?? "financas",
    database: process.env.DB_NAME ?? "financas",
    connectionLimit: numero(process.env.DB_POOL_LIMIT, 10),
  },
};

export const ehProducao = config.nodeEnv === "production";
