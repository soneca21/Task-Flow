/**
 * Sistema de Alocação Inteligente de Funcionários
 * Considera carga de trabalho, proximidade e especialização
 */

/**
 * Calcula score de adequação de um funcionário para uma tarefa
 * @param {Object} funcionario - Funcionário a ser avaliado
 * @param {Object} tarefa - Tarefa a ser alocada
 * @param {Object} frente - Frente de trabalho
 * @returns {Object} Score e detalhes
 */
export function calcularScoreFuncionario(funcionario, tarefa, frente) {
  let score = 0;
  const detalhes = {
    disponibilidade: 0,
    cargaTrabalho: 0,
    especializacao: 0,
    experiencia: 0,
    total: 0,
  };

  // 1. Disponibilidade (peso: 40%)
  if (funcionario.status === 'disponivel') {
    detalhes.disponibilidade = 40;
  } else if (funcionario.status === 'ocupado') {
    // Verifica se ainda tem capacidade
    const capacidadeDisponivel = (funcionario.capacidade_tarefas || 1) - (funcionario.tarefas_ativas || 0);
    if (capacidadeDisponivel > 0) {
      detalhes.disponibilidade = 20; // Parcialmente disponível
    } else {
      detalhes.disponibilidade = 0; // Sem capacidade
    }
  } else {
    detalhes.disponibilidade = 0; // Indisponível, férias, afastado
  }

  // 2. Carga de Trabalho (peso: 30%)
  const capacidade = funcionario.capacidade_tarefas || 1;
  const tarefasAtivas = funcionario.tarefas_ativas || 0;
  const utilizacao = tarefasAtivas / capacidade;
  
  if (utilizacao === 0) {
    detalhes.cargaTrabalho = 30; // Totalmente livre
  } else if (utilizacao < 0.5) {
    detalhes.cargaTrabalho = 25; // Pouco ocupado
  } else if (utilizacao < 0.8) {
    detalhes.cargaTrabalho = 15; // Moderadamente ocupado
  } else {
    detalhes.cargaTrabalho = 5; // Muito ocupado
  }

  // 3. Especialização/Vínculo com a Frente (peso: 30%)
  if (funcionario.frentes_trabalho?.includes(tarefa.frente_trabalho_id)) {
    detalhes.especializacao = 30; // Especializado nesta frente
  } else if (funcionario.frentes_trabalho?.length === 0) {
    detalhes.especializacao = 15; // Generalista
  } else {
    detalhes.especializacao = 5; // Não especializado
  }

  // 4. Experiencia (tarefas concluidas) - capado em 20 pontos
  const concluidas = funcionario.tarefas_concluidas || 0;
  detalhes.experiencia = Math.min(20, concluidas);

  // Score total
  detalhes.total = detalhes.disponibilidade + detalhes.cargaTrabalho + detalhes.especializacao + detalhes.experiencia;
  
  return detalhes;
}

/**
 * Seleciona os melhores funcionários para uma tarefa
 * @param {Array} funcionarios - Lista de funcionários disponíveis
 * @param {Object} tarefa - Tarefa a ser alocada
 * @param {Object} frente - Frente de trabalho
 * @param {number} quantidade - Quantidade de funcionários necessários
 * @param {number} minScore - Score mínimo aceito (default 20)
 * @returns {Array} Funcionários selecionados ordenados por score
 */
export function selecionarMelhoresFuncionarios(funcionarios, tarefa, frente, quantidade = 1, minScore = 20) {
  // Filtrar apenas funcionários ativos
  const funcionariosAtivos = funcionarios.filter(f => f.ativo !== false);

  // Calcular score para cada funcionário
  const funcionariosComScore = funcionariosAtivos.map(func => ({
    ...func,
    score: calcularScoreFuncionario(func, tarefa, frente),
  }));

  // Ordenar por score (maior para menor)
  const ordenados = funcionariosComScore.sort((a, b) => b.score.total - a.score.total);

  // Filtrar apenas funcionários com score mínimo aceitável (>= 20)
  const aptos = ordenados.filter(f => f.score.total >= minScore);

  // Retornar a quantidade solicitada
  return aptos.slice(0, quantidade);
}

/**
 * Verifica se há necessidade de realocar tarefas
 * @param {Array} funcionarios - Lista de funcionários
 * @param {Array} tarefas - Lista de tarefas ativas
 * @returns {Object} Análise de carga
 */
export function analisarCargaTrabalho(funcionarios, tarefas) {
  const analise = {
    sobrecarregados: [],
    ociosos: [],
    balanceados: [],
    recomendacoes: [],
  };

  funcionarios.forEach(func => {
    if (!func.ativo) return;

    const capacidade = func.capacidade_tarefas || 1;
    const tarefasAtivas = func.tarefas_ativas || 0;
    const utilizacao = tarefasAtivas / capacidade;

    const info = {
      ...func,
      utilizacao,
      tarefasAtivas,
      capacidade,
    };

    if (utilizacao >= 1) {
      analise.sobrecarregados.push(info);
      analise.recomendacoes.push({
        tipo: 'redistribuir',
        funcionario: func.nome,
        mensagem: `${func.nome} está sobrecarregado (${tarefasAtivas}/${capacidade} tarefas)`,
      });
    } else if (utilizacao === 0 && func.status === 'disponivel') {
      analise.ociosos.push(info);
    } else {
      analise.balanceados.push(info);
    }
  });

  return analise;
}

/**
 * Sugere redistribuição de tarefas
 * @param {Array} funcionarios - Lista de funcionários
 * @param {Array} tarefas - Lista de tarefas
 * @returns {Array} Sugestáes de redistribuição
 */
export function sugerirRedistribuicao(funcionarios, tarefas) {
  const analise = analisarCargaTrabalho(funcionarios, tarefas);
  const sugestoes = [];

  // Para cada funcionário sobrecarregado
  analise.sobrecarregados.forEach(sobrecarregado => {
    const tarefasFunc = tarefas.filter(t => 
      t.funcionarios_designados?.includes(sobrecarregado.id) && 
      t.status !== 'concluida'
    );

    // Tentar realocar tarefas de menor prioridade
    const tarefasRealocaveis = tarefasFunc
      .filter(t => t.prioridade !== 'urgente')
      .sort((a, b) => {
        const prioridadeOrdem = { baixa: 0, media: 1, alta: 2 };
        return prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade];
      });

    tarefasRealocaveis.forEach(tarefa => {
      // Encontrar funcionário ocioso ou menos ocupado
      const candidatos = [...analise.ociosos, ...analise.balanceados]
        .filter(f => f.frentes_trabalho?.includes(tarefa.frente_trabalho_id))
        .sort((a, b) => a.utilizacao - b.utilizacao);

      if (candidatos.length > 0) {
        sugestoes.push({
          tarefa,
          de: sobrecarregado,
          para: candidatos[0],
          motivo: `Balancear carga: ${sobrecarregado.nome} (${sobrecarregado.utilizacao * 100}%) → ${candidatos[0].nome} (${candidatos[0].utilizacao * 100}%)`,
        });
      }
    });
  });

  return sugestoes;
}

/**
 * Calcula tempo estimado até conclusão baseado na carga atual
 * @param {Object} funcionario - Funcionário
 * @param {Array} tarefas - Tarefas do funcionário
 * @returns {number} Minutos estimados
 */
export function estimarTempoDisponibilidade(funcionario, tarefas) {
  const tarefasFunc = tarefas.filter(t => 
    t.funcionarios_designados?.includes(funcionario.id) && 
    t.status === 'em_execucao'
  );

  // Tempo médio estimado por tarefa: 60 minutos
  const tempoMedioPorTarefa = 60;
  return tarefasFunc.length * tempoMedioPorTarefa;
}


