// functions/falarComAtendenteHumano.js
import twilio from "twilio";

/**
 * Tool: falarComAtendenteHumano
 */
export async function falarComAtendenteHumano({
  telefone,
  cpf,
  cep,
  intencao,
  resumo,
  ultimaMensagem
}) {
  console.log(`[HUMANO] Iniciando transbordo para: ${telefone}`);

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
    // Monta os atributos da tarefa imitando o padrão do Flex/Studio
    // Isso ajuda a aparecer o nome/numero certo na tela do agente
    const taskAttributes = {
      // Campos Padrão do Flex
      channel: "whatsapp",
      channelType: "whatsapp",
      from: customerAddress,
      name: customerAddress,          // Aparece no topo do card no Flex
      customerName: customerAddress,  // Usado por plugins de CRM
      customerAddress: customerAddress,
      
      // Campos de Controle
      bot: false,
      direction: "inbound",
      taskCreateSource: "api_node",
      
      // Campos de Negócio (LABEST)
      subject: intencao || "Atendimento LABEST",
      cpf: cpf || "Não informado",
      cep: cep || "Não informado",
      
      // Contexto da Conversa (Resumo para o Agente)
      resumo: resumo,
      ultimaMensagem: ultimaMensagem,
      
      // Alguns plugins do Flex leem 'conversations.content' como a mensagem inicial
      conversations: {
        content: `📝 *Resumo do Bot:*\n${resumo || "Sem resumo."}\n\n🆔 *CPF:* ${cpf || "N/A"}\n📍 *CEP:* ${cep || "N/A"}\n💬 *Última msg:* "${ultimaMensagem}"`,
        initiative: "Inbound",
        outcome: "Handover"
      }
    };

    const task = await client.taskrouter.v1
      .workspaces(process.env.TWILIO_WORKSPACE_SID)
      .tasks
      .create({
        workflowSid: process.env.TWILIO_WORKFLOW_SID,
        taskChannel: "chat",
        attributes: JSON.stringify(taskAttributes)
      });

    console.log(`✅ Task Flex Criada: ${task.sid}`);

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
    console.error("❌ ERRO API TWILIO:", error.message);
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