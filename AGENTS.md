# Instruções obrigatórias para agentes e colaboradores

Aplicam-se a qualquer agente/modelo e a todas as alterações deste repositório.

- Antes de implementar, criar ou reutilizar uma issue com classificação Correção, Melhoria ou Nova Função e critérios de aceite. Manter progresso e evidências na issue.
- Trabalhar em branch e abrir PR citando a issue. Usar Closes #N somente quando todos os critérios estiverem resolvidos; caso contrário, Refs #N. Nunca publicar diretamente na main.
- Executar os checks aplicáveis antes do merge. Deploy somente de commit integrado por PR, com CI aprovado. Configurar proteção nativa da main no GitHub; documentos não substituem essa proteção.
- Exigir HTTPS em produção, redirecionamento no edge ou aplicação, origem canônica configurada e proxies explicitamente confiáveis. Não confiar em Host ou X-Forwarded-* enviados diretamente pelo cliente.
- Nunca versionar credenciais reais nem colocar segredos em VITE_*, HTML, bundles ou armazenamento do navegador. Usar secrets da hospedagem; exemplos devem conter placeholders. Se houver vazamento, revogar/rotacionar e avaliar o histórico.
- Validar tipos, tamanhos, formatos e campos aceitos no servidor. Aplicar autorização por recurso/papel. Validação do navegador melhora UX, mas não é barreira de segurança.
- Limitar payloads e requisições, especialmente login/cadastro. Em múltiplas réplicas, usar armazenamento compartilhado ou rate limiting no edge. CAPTCHA somente se necessário e com verificação no servidor.
- Manter CSP e headers compatíveis com recursos reais. Não relaxar script-src com unsafe-inline/unsafe-eval para ocultar erros.
- Auditar dependências e lockfile. Não aplicar upgrades major cegamente; testar compatibilidade e registrar vulnerabilidades pendentes.
- Manter observabilidade (Sentry ou OpenTelemetry, conforme arquitetura) sem senhas, tokens, payloads pessoais, query strings ou session replay por padrão. Ativação externa exige destino e credenciais configurados no serviço.
- Manter lint/qualidade (Biome ou ferramenta adequada), testes unitários, integração e E2E com Playwright para jornadas críticas; publicar cobertura (Codecov quando conectado). Avaliar Knip, contratos de arquitetura, commitlint e Stryker onde agreguem valor; não adicionar ferramentas sem checks úteis.
- Antes de publicar, revisar diff e artefato: segredos, mapas de fonte, arquivos internos, páginas administrativas, endpoints, CORS, autenticação, permissões do CI e headers/HTTPS no domínio real.
- Documentar o que foi testado, o que depende de hospedagem/conta externa e o que não se aplica. Não declarar configuração externa concluída sem verificar.
- Ao editar prosa, aplicar Humanizer quando disponível, preservando precisão técnica.
