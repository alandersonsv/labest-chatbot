// index.js (ES MODULE)

import "dotenv/config";

import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import { SessionsClient } from "@google-cloud/dialogflow-cx";

import { dialogflowOrchestrator } from "./orchestrator.js";

const app = express();

/* ===============================
   MIDDLEWARES
=============================== */

// Twilio envia dados como application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Dialogflow/Tools enviam JSON
app.use(bodyParser.json());

/* ===============================
   HEALTH CHECK (Para o Google Cloud Run/Functions)
=============================== */
app.get("/", (req, res) => {
  res.status(200).send("Bot LABEST Online 🚀");
});

/* ===============================
   TWILIO → WHATSAPP (Rota Principal)
=============================== */
const client = new SessionsClient();

const projectId = process.env.PROJECT_ID;
const location = process.env.LOCATION;
const agentId = process.env.AGENT_ID;

app.post("/whatsapp", async (req, res) => {
  // --- MUDANÇA: Captura Inteligente (Formulário ou JSON) ---
  const Body = req.body.Body;
  
  // No JSON do Conversations, o remetente vem como 'Author'. No padrão, vem como 'From'.
  const From = req.body.Author || req.body.From; 
  
  // Tenta pegar o ID da conversa onde quer que ele esteja (ConversationSid ou ChannelSid)
  const ConversationSid = req.body.ConversationSid || req.body.ChannelSid;
  const ParticipantSid = req.body.ParticipantSid;
  // -------------------------------------------------------------
  
  // Limpeza do ID da sessão (remove o prefixo 'whatsapp:')
  const sessionId = From?.replace("whatsapp:", "");

  console.log(`\n📩 [WHATSAPP] CH: ${ConversationSid} | MB: ${ParticipantSid} | Msg: "${Body}"`);

  if (!Body) {
    return res.status(200).send(""); // Ignora mensagens vazias/status
  }

  // Caminho da sessão no Dialogflow CX
  const sessionPath = client.projectLocationAgentSessionPath(
    projectId,
    location,
    agentId,
    sessionId
  );

  try {
    const request = {
      session: sessionPath,
      queryInput: {
        text: { text: Body },
        languageCode: "pt-BR",
      },
      // 2. INJEÇÃO: Passamos os SIDs para a memória do Dialogflow
      queryParams: {
        parameters: {
          telefone_usuario: From,
          conversationSid: ConversationSid,
          participantSid: ParticipantSid
        }
      }
    };

    // 1. Envia para o Dialogflow CX
    const [response] = await client.detectIntent(request);

    // 2. Extrai as mensagens de texto geradas pelo Playbook/Agente
    const messages = response.queryResult?.responseMessages || [];
    
    // Filtra apenas respostas de texto (ignora payloads internos por enquanto)
    const textResponses = messages
      .map(msg => msg.text?.text?.[0]) // Pega o primeiro texto de cada bloco
      .filter(text => text !== undefined && text !== null);

    const fullResponseText = textResponses.join("\n");

    console.log(`📤 [RESPOSTA BOT] "${fullResponseText}"`);

    // 3. Responde para o Twilio (TwiML)
    const twiml = new twilio.twiml.MessagingResponse();

    if (fullResponseText.length > 0) {
      // Se o Dialogflow respondeu texto, manda pro WhatsApp
      twiml.message(fullResponseText);
    } else {
      console.log("⚠️ [SILÊNCIO] Dialogflow não retornou texto visível. Ignorando resposta.");
    }

    res.type("text/xml").send(twiml.toString());

  } catch (error) {
    console.error("❌ [ERRO CRÍTICO]", error);
    // Em caso de erro fatal, não manda nada pro usuário para evitar loop infinito
    res.status(500).send("Erro interno");
  }
});

/* ===============================
   DIALOGFLOW CX → WEBHOOK (Tools/Flows)
=============================== */
// Rota unificada para webhooks do Dialogflow
app.post(["/cx-webhook", "/dialogflow"], async (req, res) => {
  // Passa a bola para o Orchestrator decidir qual função rodar
  return dialogflowOrchestrator(req, res);
});

/* ===============================
   START SERVER
=============================== */
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
