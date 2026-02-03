# Secure File Store — Boilerplate

Este projeto é um boilerplate mínimo para um serviço que armazena arquivos sensíveis com autenticação por e‑mail/senha.

Principais características:
- Node.js + Express
- Prisma + PostgreSQL
- Senhas com Argon2id
- Verificação de e‑mail (token por e‑mail)
- Sessões via JWT armazenado em cookie HttpOnly (revogáveis, guardadas em DB)
- Proteções básicas: helmet, rate-limiter, CSRF
- Upload/Download via presigned URLs para S3 (Server-Side Encryption recomendado, SSE-KMS)
- Estrutura de DB para usuários, sessions, tokens e metadados de arquivos

Como começar (dev):
1. Copy `.env.example` → `.env` e preencha as variáveis.
2. Instale dependências:
   ```bash
   npm install
   ```
3. Crie o DB e rode migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Inicie o servidor:
   ```bash
   npm run dev
   ```

Próximos passos recomendados antes de produção:
- Habilitar HTTPS (setar COOKIE_SECURE=true) e HSTS
- Forçar verificação de e‑mail e habilitar 2FA (TOTP/WebAuthn)
- Implementar scanning antivírus para uploads (síncrono/assíncrono)
- Validar e limitar tipos e tamanhos de arquivo
- Implementar refresh tokens ou sessões curtas e mecanismo de revogação
- Adicionar logging/audit (quem acessou qual arquivo, IP, user-agent)
- Adotar KMS para chaves S3 e configurar políticas de bucket para negar público
- Fazer pentest e varredura SAST/DAST
