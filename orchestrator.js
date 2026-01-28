// Orchestrator.js
import { consultarStatusExame } from "./functions/consultarStatusExame.js";
import { verificarHorarioAtendimento } from "./functions/verificarHorarioAtendimento.js";
import { buscarLaboratoriosPorCep } from "./functions/buscarLaboratoriosPorCep.js";
import { gerarLinkCheckout } from "./functions/gerarLinkCheckout.js";
import { falarComAtendenteHumano } from "./functions/falarComAtendenteHumano.js";

export async function dialogflowOrchestrator(req, res) {
  try {
    const body = req.body || {};
    
    // Mapeamento necessário para o Playbook (Tool Use)
    const params = body.toolUse?.inputParameters || body.toolParameters || body;
    const actionName = body.toolUse?.action;

    console.log(`[📥 TOOL] Action: ${actionName}`);

    let result;

    // =====================================================
    // ATENDIMENTO HUMANO
    // =====================================================
    if (actionName === "falarComAtendenteHumano" || params.intencao === "ATENDIMENTO_HUMANO") {
      result = await falarComAtendenteHumano({
        // O index.js injetou o telefone na sessão -> Playbook pegou -> mandou pra cá
        telefone: params.telefone, 
        cpf: params.cpf,
        cep: params.cep,
        intencao: params.intencao,
        resumo: params.resumo,
        ultimaMensagem: params.ultimaMensagem,
      });
      return res.json(result);
    }

    // =====================================================
    // STATUS DE EXAME
    // =====================================================
    if (actionName === "consultarStatusExame" || params.documento) {
      result = await consultarStatusExame({ documento: params.documento });
      return res.json(resposta(result.message));
    }

    // =====================================================
    // BUSCAR LABORATÓRIOS
    // =====================================================
    if (actionName === "buscar_laboratorios_por_cep" || params.cep) {
      result = await buscarLaboratoriosPorCep({ cep: params.cep });
      return res.json(
        resposta(result.string, {
          labs: result.labs,
          qtdeLabs: result.labs?.length || 0
        })
      );
    }

    // =====================================================
    // CHECKOUT
    // =====================================================
    if (actionName === "gerar_checkout" || params.codigoLaboratorio) {
      result = await gerarLinkCheckout({
        codigoLaboratorio: params.codigoLaboratorio
      });
      return res.json(
        resposta(result.message, {
          checkoutUrl: result.checkoutUrl
        })
      );
    }

    // =====================================================
    // VERIFICAR HORÁRIO
    // =====================================================
    if (actionName === "verificar_horario_atendimento" || params.verificarHorario === true) {
      result = await verificarHorarioAtendimento();
      
      // Lógica de resposta direta se estiver fechado
      if (!result.isBusinessHours) {
        return res.json({
          fulfillment_response: {
            messages: [{
              text: { text: ["Nosso atendimento funciona de segunda a sexta, das 08h às 17h. Entre em contato pelo e-mail atendimento@labest.com.br."] }
            }]
          },
          sessionInfo: { parameters: { isBusinessHours: false } }
        });
      }

      return res.json({
        sessionInfo: { parameters: { isBusinessHours: true } }
      });
    }

    // Fallback
    console.log("⚠️ Nenhuma ação identificada.");
    return res.json(resposta("Ação não reconhecida pelo sistema."));

  } catch (error) {
    console.error("❌ Erro no orquestrador:", error);
    return res.json(resposta("Ocorreu um erro interno."));
  }
}

// Helper de resposta
function resposta(texto, params = {}) {
  return {
    fulfillment_response: {
      messages: [{ text: { text: [texto] } }]
    },
    sessionInfo: { parameters: params }
  };
}