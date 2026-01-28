// debug_twilio.js
import "dotenv/config";
import twilio from "twilio";

async function testarConexao() {
  console.log("--- 🕵️ DIAGNÓSTICO DE CREDENCIAIS ---");
  console.log("SID:", process.env.TWILIO_ACCOUNT_SID ? "✅ Preenchido" : "❌ Vazio");
  console.log("Token:", process.env.TWILIO_AUTH_TOKEN ? "✅ Preenchido" : "❌ Vazio");
  console.log("Workspace:", process.env.TWILIO_WORKSPACE_SID ? "✅ Preenchido" : "❌ Vazio");
  console.log("Workflow:", process.env.TWILIO_WORKFLOW_SID ? "✅ Preenchido" : "❌ Vazio");

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    console.log("\n--- 🚀 TENTANDO CRIAR TASK NO FLEX ---");
    const task = await client.taskrouter.v1
      .workspaces(process.env.TWILIO_WORKSPACE_SID)
      .tasks
      .create({
        workflowSid: process.env.TWILIO_WORKFLOW_SID,
        taskChannel: "chat",
        attributes: JSON.stringify({
          from: "whatsapp:+5511999999999", // Coloque seu número aqui
          name: "Teste Local",
          resumo: "Verificando integração local"
        })
      });

    console.log("✅ SUCESSO! Task criada SID:", task.sid);
  } catch (error) {
    console.error("❌ FALHA NA API DA TWILIO:");
    console.error("Mensagem:", error.message);
    console.error("Código de Erro Twilio:", error.code);
  }
}

testarConexao();