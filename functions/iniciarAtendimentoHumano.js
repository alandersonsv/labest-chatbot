import "dotenv/config";
import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_PROXY,
  TWILIO_FLOW_SID
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Cria ou reutiliza Conversation WhatsApp
 */
async function obterOuCriarConversation(numeroCliente) {
  try {
    const conversation = await client.conversations.v1.conversations.create({
      friendlyName: `WhatsApp ${numeroCliente}`
    });

    await client.conversations.v1
      .conversations(conversation.sid)
      .participants
      .create({
        "messagingBinding.address": numeroCliente,
        "messagingBinding.proxyAddress": TWILIO_WHATSAPP_PROXY
      });

    console.log("🆕 Conversation criada:", conversation.sid);
    return conversation.sid;

  } catch (error) {
    // 🔥 Conversation já existe
    if (error.code === 50416) {
      const match = error.message.match(/Conversation (CH[a-zA-Z0-9]+)/);

      if (!match) {
        throw new Error("❌ Não foi possível identificar Conversation existente");
      }

      const conversationSid = match[1];
      console.log("🔁 Conversation reutilizada:", conversationSid);
      return conversationSid;
    }

    throw error;
  }
}

/**
 * Inicia atendimento humano
 */
export async function iniciarAtendimentoHumano({
  numeroCliente,
  mensagemInicial = "Você será atendido por um humano em instantes"
}) {
  const conversationSid = await obterOuCriarConversation(numeroCliente);

  // Vincula Flow Studio
  await client.conversations.v1
    .conversations(conversationSid)
    .webhooks
    .create({
      target: "studio",
      "configuration.flowSid": TWILIO_FLOW_SID,
      "configuration.filters": ["onMessageAdded"]
    });

  // Mensagem inicial
  await client.conversations.v1
    .conversations(conversationSid)
    .messages
    .create({
      author: "system",
      body: mensagemInicial
    });

  console.log("🚀 Atendimento humano iniciado");

  return {
    success: true,
    conversationSid
  };
}
