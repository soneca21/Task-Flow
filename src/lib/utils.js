import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

export function formatTelefoneBR(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 2) {
    return `(${ddd}`;
  }

  // 10 digits => (11) 3333-4444
  if (digits.length <= 10) {
    const part1 = rest.slice(0, 4);
    const part2 = rest.slice(4, 8);
    return `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`;
  }

  // 11 digits => (11) 93333-4444
  const part1 = rest.slice(0, 5);
  const part2 = rest.slice(5, 9);
  return `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`;
}

export function fixMojibakePtBr(value) {
  if (typeof value !== 'string' || !value) return value;
  // Heuristic: common UTF-8->Latin1 mojibake sequences for PT-BR characters.
  if (!/(ÃƒÂ§|ÃƒÂ£|ÃƒÂ¡|ÃƒÂ©|ÃƒÂ­|ÃƒÂ³|ÃƒÂº|ÃƒÂµ|ÃƒÂª|ÃƒÂº|ÃƒÃ‡|ÃƒÂƒ|Ã§|Ã£|Ã¡|Ã©|Ãí|Ãó|Ãú|Ãõ|Ãê|ÃÇ|Ãƒ|Â)/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    // Fallback for older environments
    try {
      // eslint-disable-next-line no-undef
      return decodeURIComponent(escape(value));
    } catch {
      return value;
    }
  }
}

export function normalizePtBrText(value) {
  if (typeof value !== 'string' || !value) return value;
  let text = value;
  if (/[ÃÂ]/.test(text)) {
    text = fixMojibakePtBr(text);
  }
  if (text.includes('�')) {
    const map = {
      'Avalia��o': 'Avaliação',
      'Avalia��es': 'Avaliações',
      'Funcion�rio': 'Funcionário',
      'Funcion�rios': 'Funcionários',
      'funcion�rio': 'funcionário',
      'funcion�rios': 'funcionários',
      'Configura��es': 'Configurações',
      'Produ��o': 'Produção',
      'Expedi��o': 'Expedição',
      'Pend�ncia': 'Pendência',
      'Pend�ncias': 'Pendências',
      'Notifica��es': 'Notificações',
      'Relat�rios': 'Relatórios',
      'Gest�o': 'Gestão',
      'N�o': 'Não',
      'n�o': 'não',
      'M�dia': 'Média',
      'Dispon�vel': 'Disponível',
      'dispon�vel': 'disponível',
      '�ltima': 'Última',
      'In�cio': 'Início',
      'Conclu�da': 'Concluída',
      'Conclu�das': 'Concluídas',
      'Execu��o': 'Execução',
      'Em Execu��o': 'Em Execução',
      'Descri��o': 'Descrição',
      'Observa��es': 'Observações',
      'Respons�vel': 'Responsável',
      'Resolu��o': 'Resolução',
      'Log�stica': 'Logística',
      'Transfer�ncia': 'Transferência',
      'Manuten��o': 'Manutenção',
      'Movimenta��o': 'Movimentação',
      'Confer�ncia': 'Conferência',
      'Avalia��o da Equipe': 'Avaliação da Equipe',
      'Total de Avalia��es': 'Total de Avaliações',
      'Funcion�rios Avaliados': 'Funcionários Avaliados',
      'Buscar funcion�rio...': 'Buscar funcionário...',
      'Nenhuma avalia��o registrada.': 'Nenhuma avaliação registrada.',
      'Nova Avalia��o': 'Nova Avaliação',
      'Salvar Avalia��o': 'Salvar Avaliação',
      'Avalia��es recentes': 'Avaliações recentes',
      'M�dia:': 'Média:',
    };
    Object.entries(map).forEach(([bad, good]) => {
      text = text.split(bad).join(good);
    });
  }
  return text;
}