import { db } from "../db";
import { subscriptions, companies, users } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function generateBoletoForCompany(params: { companyId: string; amount: string | null; plan?: string | null; expirationDate?: Date }) {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
  }

  const [companyRecord] = await db
    .select({ document: companies.document })
    .from(companies)
    .where(eq(companies.id, params.companyId))
    .limit(1);

  const [adminUser] = await db
    .select({
      email: users.email,
      name: users.name,
      cep: users.cep,
      rua: users.rua,
      numero: users.numero,
      complemento: users.complemento,
      cidade: users.cidade,
      estado: users.estado,
    })
    .from(users)
    .where(and(eq(users.companyId, params.companyId), eq(users.role, 'admin')))
    .limit(1);

  const docNumber = (companyRecord?.document || '').replace(/\D/g, '');
  if (docNumber.length !== 11 && docNumber.length !== 14) {
    throw new Error("CPF/CNPJ inválido para emissão de boleto");
  }

  const fullName = adminUser?.name || '';
  const [firstName, ...lastNameParts] = fullName.split(' ');

  const expiration = params.expirationDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  const boletoMethods = ['bolbradesco', 'boleto'];
  let lastError: any = null;

  for (const methodId of boletoMethods) {
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `cron-${params.companyId}-${methodId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: Number(parseFloat(params.amount || '0').toFixed(2)),
        payment_method_id: methodId,
        date_of_expiration: expiration.toISOString(),
        payer: {
          email: adminUser?.email || '',
          first_name: firstName || 'Admin',
          last_name: lastNameParts.join(' ') || 'User',
          identification: {
            type: docNumber.length > 11 ? 'CNPJ' : 'CPF',
            number: docNumber,
          },
          address: {
            zip_code: String(adminUser?.cep || '').replace(/\D/g, ''),
            street_name: String(adminUser?.rua || ''),
            street_number: String(adminUser?.numero || ''),
            neighborhood: String(adminUser?.complemento || ''),
            city: String(adminUser?.cidade || ''),
            federal_unit: String(adminUser?.estado || ''),
          },
        },
        description: `Renovação Assinatura - HUACONTROL`,
        external_reference: params.companyId,
        metadata: {
          company_id: params.companyId,
          plan: params.plan || 'monthly',
        },
      }),
    });

    if (mpResponse.ok) {
      const payment = await mpResponse.json();
      return payment?.transaction_details?.external_resource_url || null;
    }

    lastError = await mpResponse.json();
  }

  throw new Error(lastError?.message || lastError?.cause || 'Failed to generate boleto');
}

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
        plan: subscriptions.plan,
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
        let newTicketUrl = sub.ticketUrl;
        try {
          newTicketUrl = await generateBoletoForCompany({
            companyId: sub.companyId as string,
            amount: sub.amount || "0",
            plan: sub.plan,
            expirationDate: sub.expiresAt ? new Date(sub.expiresAt) : undefined,
          });

          if (newTicketUrl) {
            await db.update(subscriptions)
              .set({ ticket_url: newTicketUrl, updatedAt: new Date() })
              .where(eq(subscriptions.id, sub.id));
          }
        } catch (genErr) {
          console.error(`[Cron] Failed to generate boleto for ${sub.companyName}:`, genErr);
        }

        console.log(`[Cron] Sending payment reminder email to ${admin.email} for company ${sub.companyName}`);
        
        try {
          await resend.emails.send({
            from: 'Financeiro <contato@huacontrol.com.br>',
            to: admin.email,
            subject: `Lembrete de Vencimento - ${sub.companyName}`,
            html: `
              <div style="font-family: sans-serif; color: #333;">
                <h2>Olá, ${admin.name || 'Administrador'}</h2>
                <p>Sua assinatura vence em 5 dias (${new Date(sub.expiresAt!).toLocaleDateString('pt-BR')}).</p>
                <p>Valor: <strong>R$ ${parseFloat(sub.amount || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                ${newTicketUrl ? `<p>Você pode acessar seu boleto no link abaixo:</p><p><a href="${newTicketUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Boleto</a></p>` : ''}
                <p>Evite o bloqueio do sistema mantendo seu pagamento em dia.</p>
                <br/>
                <p>Atenciosamente,<br/>Equipe Hua Control</p>
              </div>
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

        let newTicketUrl = sub.ticketUrl;
        try {
          newTicketUrl = await generateBoletoForCompany({
            companyId: sub.companyId as string,
            amount: sub.amount || "0",
            plan: "monthly",
            expirationDate: tomorrow,
          });

          if (newTicketUrl) {
            await db.update(subscriptions)
              .set({ ticket_url: newTicketUrl, status: 'pending', updatedAt: new Date() })
              .where(eq(subscriptions.id, sub.id));
          }
        } catch (genErr) {
          console.error(`[Cron] Failed to generate boleto for ${sub.companyName}:`, genErr);
        }

        try {
          await resend.emails.send({
            from: 'Financeiro <contato@huacontrol.com.br>',
            to: admin.email,
            subject: `Acesso Suspenso - ${sub.companyName}`,
            html: `
              <div style="font-family: sans-serif; color: #333;">
                <h2 style="color: #d9534f;">Acesso Suspenso - ${sub.companyName}</h2>
                <p>Olá, ${admin.name || 'Administrador'}</p>
                <p>Seu acesso ao sistema foi suspenso devido ao não pagamento da assinatura vencida em ${new Date(sub.expiresAt!).toLocaleDateString('pt-BR')}.</p>
                <p>Para reativar sua conta, realize o pagamento do boleto abaixo.</p>
                <p>Novo Vencimento: <strong>${dueDateStr}</strong></p>
                <p>Valor: <strong>R$ ${parseFloat(sub.amount || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                ${newTicketUrl ? `<p><a href="${newTicketUrl}" style="background-color: #d9534f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Boleto Atualizado</a></p>` : ''}
                <p>Após a confirmação do pagamento, seu acesso será liberado automaticamente.</p>
                <br/>
                <p>Atenciosamente,<br/>Equipe Hua Control</p>
              </div>
            `
          });
        } catch (emailError) {
          console.error(`[Cron] Failed to send suspension email to ${admin.email}:`, emailError);
        }
      }
    }
    // 3. E-mail de Boas-vindas (Criação de Conta)
    // Isso deve ser chamado no signup, mas podemos adicionar um check aqui para empresas recém-criadas sem e-mail enviado
    const newCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        paymentStatus: companies.paymentStatus,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .where(
        and(
          eq(companies.paymentStatus, 'pending'),
          sql`${companies.createdAt} > now() - interval '1 hour'`
        )
      );

    for (const company of newCompanies) {
      const [admin] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(and(eq(users.companyId, company.id), eq(users.role, 'admin')))
        .limit(1);

      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.companyId, company.id))
        .limit(1);

      if (admin?.email) {
        console.log(`[Cron] Sending welcome email to ${admin.email} for company ${company.name}`);
        try {
          await resend.emails.send({
            from: 'Boas-vindas <contato@huacontrol.com.br>',
            to: admin.email,
            subject: `Bem-vindo à Hua Control - ${company.name}`,
            html: `
              <div style="font-family: sans-serif; color: #333;">
                <h2>Bem-vindo, ${admin.name || 'Administrador'}!</h2>
                <p>É um prazer ter a <strong>${company.name}</strong> conosco.</p>
                <p>Para liberar seu acesso total ao sistema, realize o pagamento do primeiro boleto.</p>
                ${sub?.ticket_url ? `<p><a href="${sub.ticket_url}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Primeiro Boleto</a></p>` : ''}
                <p>Seu acesso será liberado automaticamente após a confirmação do pagamento.</p>
                <br/>
                <p>Atenciosamente,<br/>Equipe Hua Control</p>
              </div>
            `
          });
        } catch (emailError) {
          console.error(`[Cron] Failed to send welcome email to ${admin.email}:`, emailError);
        }
      }
    }
  } catch (error) {
    console.error("[Cron] Error checking expiring subscriptions:", error);
  }
}
