# Checklist de Produção e Escala

## 1) Configuração e segredos
- [ ] Definir `NODE_ENV=production`.
- [ ] Definir `DATABASE_URL` (produção).
- [ ] Definir `JWT_SECRET` forte.
- [ ] Definir `RESEND_API_KEY` e chaves de pagamento.
- [ ] Definir `ALLOWED_ORIGINS` com domínio(s) reais.
- [ ] (Opcional) `TRUST_PROXY=true` atrás de proxy/edge.

## 2) Segurança
- [ ] Rate limiting ativo (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`).
- [ ] CORS com allowlist (sem `*`).
- [ ] Headers de segurança (helmet) ativos.
- [ ] Logs sem dados sensíveis.

## 3) Observabilidade
- [ ] Logs estruturados com nível (info/warn/error).
- [ ] Monitoramento de uptime do endpoint `/api/health`.
- [ ] Alertas para erros 5xx e latência alta.

## 4) Banco de dados
- [ ] Backups automáticos e teste de restore.
- [ ] Neon: verificar plano e janela de PITR (instant restore) no console.
- [ ] Neon: definir janela de retenção do PITR (1–30 dias conforme plano).
- [ ] Backup externo: agendar `pg_dump` diário usando **string sem pooling**.
- [ ] Automatizar `pg_dump` via GitHub Actions + S3 (ver .github/workflows/neon-pgdump-backup.yml).
- [ ] Restore de teste mensal via `pg_restore` em projeto/branch separado.
- [ ] Railway: criar Volume e montar em `/data/backups`.
- [ ] Railway: criar Cron para executar `scripts/backup-db.sh`.
- [ ] Pool de conexões configurado.
- [ ] Índices críticos revisados.

## 5) Performance
- [ ] Build de frontend otimizado (Vite build).
- [ ] CDN para assets estáticos.
- [ ] Cache de responses onde possível.
- [ ] Cache de assets estáticos configurado (1 ano, exceto `index.html`).

## 6) Escala
- [ ] Plano para replicar instâncias (stateless).
- [ ] Sessões/JWT sem estado no servidor.
- [ ] Cron separado (ou job scheduler) para tarefas de email.

## 7) CI/CD
- [ ] Pipeline com lint/test/build.
- [ ] Deploy com rollback.
- [ ] Tagging de releases.

## 8) Compliance (se aplicável)
- [ ] Política de privacidade atualizada.
- [ ] LGPD: base legal e retenção de dados.

## 9) Testes
- [ ] Smoke tests pós-deploy.
- [ ] Teste de carga básico (picos de acesso).

---

Se quiser, eu automatizo:
- Monitoramento e alertas,
- Testes de carga,
- Pipeline CI/CD,
- Jobs separados para cron.
