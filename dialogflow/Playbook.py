import re

# ==============================
# Base de respostas fixas (MANTIDA ORIGINAL)
# ==============================
FAQ_DATA = {
    "solicitar_cep": "📍 Para encontrar os postos de coleta mais próximos, informe seu CEP:",
    "escolher_compra": (
        "Você escolheu a unidade:\n\n"
        "*{nome}*\n{endereco}\n\n"
        "1️⃣ Comprar *no site*\n"
        "2️⃣ Comprar *com um atendente*"
    ),
    "fora_horario": (
        "⏰ Nosso atendimento humano não está disponível no momento.\n\n"
        "Horário: segunda a sexta, das 08h às 17h.\n\n"
        "Você pode enviar sua solicitação para atendimento@labest.com.br"
    ),
}

# ==============================
# Helpers de detecção
# ==============================

def detect_documento(text):
    digits = re.sub(r"\D", "", text)
    return digits if len(digits) in [11, 14] else ""

def detect_cep(text):
    digits = re.sub(r"\D", "", text)
    return digits if len(digits) == 8 else ""

def detect_opcao(text, max_opcao=4):
    return int(text) if text.isdigit() and 1 <= int(text) <= max_opcao else 0

# ==============================
# Função principal do Playbook
# ==============================

def provide_answer(state: dict) -> dict:
    user_msg = state.get("$session.last_user_utterance", "").strip().lower()

    # Flags de controle de conversa
    aguardando_documento = state.get("$session.aguardando_documento", False)
    aguardando_cep = state.get("$session.aguardando_cep", False)
    aguardando_unidade = state.get("$session.aguardando_unidade", False)
    aguardando_tipo_compra = state.get("$session.aguardando_tipo_compra", False)

    # ==============================
    # Pedido direto por atendente humano
    # ==============================
    if any(x in user_msg for x in ["atendente", "humano", "falar com alguém"]):
        return {
            "answer": None,
            # NOME CORRIGIDO: call_verificar_horario_atendimento
            "action": "call_verificar_horario_atendimento",
            "arguments": {"verificarHorario": True},
            "state": state
        }

    # ==============================
    # Consulta de status de exame
    # ==============================
    if aguardando_documento:
        documento = detect_documento(user_msg)
        if documento:
            state["$session.aguardando_documento"] = False
            return {
                "answer": None,
                # NOME CORRIGIDO: call_consulta_status_exame (era call_status_exame_tool)
                "action": "call_consulta_status_exame",
                "arguments": {"documento": documento},
                "state": state
            }
        return {
            "answer": "❌ CPF ou CNPJ inválido. Digite apenas números.",
            "action": "normal",
            "state": state
        }

    if "status" in user_msg and "exame" in user_msg:
        state["$session.aguardando_documento"] = True
        return {
            "answer": "📄 Informe seu CPF ou CNPJ (somente números):",
            "action": "normal",
            "state": state
        }

    # ==============================
    # Busca de laboratório por CEP
    # ==============================
    if aguardando_cep:
        cep = detect_cep(user_msg)
        if cep:
            state["$session.aguardando_cep"] = False
            return {
                "answer": None,
                # NOME CORRIGIDO: call_buscar_laboratorios_por_cep
                "action": "call_buscar_laboratorios_por_cep",
                "arguments": {"cep": cep},
                "state": state
            }
        return {
            "answer": "❌ CEP inválido. Digite apenas números.",
            "action": "normal",
            "state": state
        }

    if "comprar" in user_msg or "laboratório" in user_msg:
        state["$session.aguardando_cep"] = True
        return {
            "answer": FAQ_DATA["solicitar_cep"],
            "action": "normal",
            "state": state
        }

    # ==============================
    # Escolha de unidade
    # ==============================
    if aguardando_unidade:
        opcao = detect_opcao(user_msg)
        labs = state.get("$session.labs", [])
        if opcao and opcao <= len(labs):
            lab = labs[opcao - 1]
            state["$session.codigoLaboratorio"] = lab["codigo"]
            state["$session.aguardando_unidade"] = False
            state["$session.aguardando_tipo_compra"] = True
            return {
                "answer": FAQ_DATA["escolher_compra"].format(
                    nome=lab["nome"],
                    endereco=lab["endereco"]
                ),
                "action": "normal",
                "state": state
            }

    # ==============================
    # Site ou atendente
    # ==============================
    if aguardando_tipo_compra:
        if user_msg == "1":
            return {
                "answer": None,
                # NOME CORRIGIDO: call_gerar_checkout (era call_gerar_link_checkout)
                "action": "call_gerar_checkout",
                "arguments": {"codigoLaboratorio": state.get("$session.codigoLaboratorio")},
                "state": state
            }
        if user_msg == "2":
            return {
                "answer": None,
                # NOME CORRIGIDO: call_verificar_horario_atendimento
                "action": "call_verificar_horario_atendimento",
                "arguments": {"verificarHorario": True},
                "state": state
            }

    # ==============================
    # Fallback / Normal
    # ==============================
    return {
        "answer": None, # Deixa o Playbook gerar a resposta baseada nas Instructions
        "action": "normal",
        "state": state
    }