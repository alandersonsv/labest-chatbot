// functions/falarComAtendenteHumano.js
import twilio from "twilio";

/**
 * Tool: falarComAtendenteHumano
 */
export async function falarComAtendenteHumano({
  telefone,
  conversationSid, // Novo parâmetro vital
  participantSid,  // Novo parâmetro vital
  cpf,
  cep,
  intencao,
  resumo,
  ultimaMensagem
}) {
  console.log(`[HUMANO] Iniciando transbordo para: ${telefone} | CH: ${conversationSid}`);

  // Validação simples do telefone
  if (!telefone || telefone === "12345") {
    console.error("❌ Telefone inválido/falso recebido.");
    return respostaErro();
  }

  // Garante o formato whatsapp:+55...
  const customerAddress = telefone.includes("whatsapp:") ? telefone : `whatsapp:${telefone}`;

  // Inicializa cliente
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    // 4. AÇÃO: Usando Interactions API para abrir a janela COM o chat
    const interaction = await client.flexApi.v1.interactions.create({
      channel: {
        type: 'whatsapp',
        initiated_by: 'customer',
        participants: [
          {
            address: customerAddress,
            // Importante: Seu número oficial ou Proxy configurado no .env
            proxy_address: process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_PROXY
          }
        ]
      },
      routing: {
        properties: {
          workspace_sid: process.env.TWILIO_WORKSPACE_SID,
          workflow_sid: process.env.TWILIO_WORKFLOW_SID,
          task_channel_unique_name: 'chat', // Força a interface de chat
          attributes: {
            // Atributos Padrão
            name: customerAddress,
            from: customerAddress,
            customerName: customerAddress,
            customerAddress: customerAddress,
            
            // O Vínculo Mágico (SIDs)
            conversationSid: conversationSid,
            participantSid: participantSid,

            // Atributos de Negócio (para o Agente ver)
            bot: false,
            direction: "inbound",
            subject: intencao || "Atendimento LABEST",
            cpf: cpf || "Não informado",
            cep: cep || "Não informado",
            resumo: resumo,
            ultimaMensagem: ultimaMensagem,
            
            // Mantendo compatibilidade com plugins que usam esse campo
            conversations: {
              content: `📝 *Resumo do Bot:*\n${resumo || "Sem resumo."}\n\n🆔 *CPF:* ${cpf || "N/A"}\n📍 *CEP:* ${cep || "N/A"}\n💬 *Última msg:* "${ultimaMensagem}"`,
              initiative: "Inbound",
              outcome: "Handover"
            }
          }
        }
      }
    });

    console.log(`✅ Janela de Conversa Criada! Interaction SID: ${interaction.sid}`);

    return {
      fulfillment_response: {
        messages: [{
          text: {
            text: [
              "✅ Entendido. Estou transferindo você para um de nossos especialistas. Aguarde um momento."
            ]
          }
        }]
      }
    };

  } catch (error) {
    console.error("❌ ERRO API TWILIO (Interaction):", error.message);
    return respostaErro();
  }
}

function respostaErro() {
  return {
    fulfillment_response: {
      messages: [{
        text: { text: ["❌ Tivemos um problema técnico para contatar o suporte agora. Por favor, tente ligar para (11) 4040-2883 ou envie e-mail para atendimento@labest.com.br"] }
      }]
    }
  };
}
