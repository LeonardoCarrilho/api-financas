import { criarUserRepository } from "./userRepository.js";
import { criarAccountRepository } from "./accountRepository.js";
import { criarCategoryRepository } from "./categoryRepository.js";
import { criarTransactionRepository } from "./transactionRepository.js";

/** Monta todos os repositórios MySQL compartilhando o mesmo pool. */
export function criarRepositoriosMySQL(pool) {
  return {
    users: criarUserRepository(pool),
    accounts: criarAccountRepository(pool),
    categories: criarCategoryRepository(pool),
    transactions: criarTransactionRepository(pool),
    async encerrar() {
      await pool.end();
    },
  };
}
