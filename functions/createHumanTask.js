import "dotenv/config";
import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WORKSPACE_SID,
  TWILIO_WORKFLOW_SID
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  throw new Error("Twilio credentials ausentes");
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export async function criarTaskHumana({
  userPhone,
  subject = "labest",
  contexto = {}
}) {
  try {
    const task = await client.taskrouter.v1
      .workspaces(TWILIO_WORKSPACE_SID)
      .tasks
      .create({
        workflowSid: TWILIO_WORKFLOW_SID,

        // 🔥 TASK CHANNEL CERTO
        taskChannel: "chat",

        // 🔥 ROUTING
        attributes: JSON.stringify({
          channel: "whatsapp",
          subject,
          from: userPhone,
          bot: false,
          ...contexto
        })
      });

    console.log("✅ Task criada com sucesso:", task.sid);
    return task;

  } catch (err) {
    console.error("❌ Erro ao criar task:", err.message);
    throw err;
  }
}
