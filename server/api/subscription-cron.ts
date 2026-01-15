import { db } from "../db";
import { subscriptions, companies, users } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function checkAndSendSubscriptionEmails() {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  
  const dateStr = fiveDaysFromNow.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  console.log(`[Cron] Checking for subscriptions expiring on ${dateStr} and expired on ${yesterdayStr}`);

  try {
    // 1. Lembrete de 5 dias antes
    const expiringSoon = await db
      .select({
        id: subscriptions.id,
        companyId: subscriptions.companyId,
        subscriberName: subscriptions.subscriberName,
        expiresAt: subscriptions.expiresAt,
        amount: subscriptions.amount,
        ticketUrl: subscriptions.ticket_url,
        companyName: companies.name,
      })
      .from(subscriptions)
      .leftJoin(companies, eq(subscriptions.companyId, companies.id))
      .where(
        and(
          eq(subscriptions.status, 'active'),
          sql`DATE(${subscriptions.expiresAt}) = ${dateStr}`
        )
      );

    for (const sub of expiringSoon) {
      const [admin] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(and(eq(users.companyId, sub.companyId), eq(users.role, 'admin')))
        .limit(1);

      if (admin?.email) {
        console.log(`[Cron] Sending payment reminder email to ${admin.email} for company ${sub.companyName}`);
        
        try {
          await resend.emails.send({
            from: 'Financeiro <contato@huacontrol.com.br>',
            to: admin.email,
            subject: `Lembrete de Vencimento - ${sub.companyName}`,
            html: `
              <h1>Olá, ${admin.name || 'Administrador'}</h1>
              <p>Sua assinatura vence em 5 dias (${new Date(sub.expiresAt!).toLocaleDateString('pt-BR')}).</p>
              <p>Valor: R$ ${parseFloat(sub.amount || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              ${sub.ticketUrl ? `<p>Baixe seu boleto aqui: <a href="${sub.ticketUrl}">${sub.ticketUrl}</a></p>` : ''}
              <p>Evite o bloqueio mantendo seu pagamento em dia.</p>
            `
          });
        } catch (emailError) {
          console.error(`[Cron] Failed to send email to ${admin.email}:`, emailError);
        }
      }
    }

    // 2. Notificação de Suspensão (1 dia após vencimento)
    const justExpired = await db
      .select({
        id: subscriptions.id,
        companyId: subscriptions.companyId,
        subscriberName: subscriptions.subscriberName,
        expiresAt: subscriptions.expiresAt,
        amount: subscriptions.amount,
        ticketUrl: subscriptions.ticket_url,
        companyName: companies.name,
      })
      .from(subscriptions)
      .leftJoin(companies, eq(subscriptions.companyId, companies.id))
      .where(
        and(
          eq(subscriptions.status, 'active'),
          sql`DATE(${subscriptions.expiresAt}) = ${yesterdayStr}`
        )
      );

    for (const sub of justExpired) {
      const [admin] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(and(eq(users.companyId, sub.companyId), eq(users.role, 'admin')))
        .limit(1);

      if (admin?.email) {
        // Bloquear acesso da empresa
        await db.update(companies)
          .set({ paymentStatus: 'pending' } as any)
          .where(eq(companies.id, sub.companyId as string));

        console.log(`[Cron] Sending suspension email to ${admin.email} for company ${sub.companyName}`);
        
        // Data para o próximo dia (hoje + 1)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDateStr = tomorrow.toLocaleDateString('pt-BR');

        try {
          await resend.emails.send({
            from: 'Financeiro <contato@huacontrol.com.br>',
            to: admin.email,
            subject: `Acesso Suspenso - ${sub.companyName}`,
            html: `
              <h1>Olá, ${admin.name || 'Administrador'}</h1>
              <p>Seu acesso à HuaControl foi suspenso devido ao não pagamento da assinatura vencida em ${new Date(sub.expiresAt!).toLocaleDateString('pt-BR')}.</p>
              <p>Para reativar sua conta imediatamente, realize o pagamento do boleto abaixo.</p>
              <p>Novo Vencimento: ${dueDateStr}</p>
              <p>Valor: R$ ${parseFloat(sub.amount || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              ${sub.ticketUrl ? `<p>Baixe seu boleto atualizado: <a href="${sub.ticketUrl}">${sub.ticketUrl}</a></p>` : ''}
              <p>Após a compensação, seu acesso será liberado automaticamente.</p>
            `
          });
        } catch (emailError) {
          console.error(`[Cron] Failed to send suspension email to ${admin.email}:`, emailError);
        }
      }
    }
  } catch (error) {
    console.error("[Cron] Error checking expiring subscriptions:", error);
  }
}
