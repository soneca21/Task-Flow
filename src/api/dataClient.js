import { supabase } from './supabaseClient';

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';

const toInFilter = (values) => {
  const mapped = values.map((v) => (typeof v === 'number' ? v : `"${String(v).replace(/"/g, '\\"')}"`));
  return `(${mapped.join(',')})`;
};

const applySort = (query, sort) => {
  if (!sort) return query;
  const parts = String(sort)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  let q = query;
  for (const part of parts) {
    const descending = part.startsWith('-');
    const column = descending ? part.slice(1) : part;
    if (!column) continue;
    q = q.order(column, { ascending: !descending });
  }
  return q;
};

const applyFilters = (query, filter) => {
  if (!filter || typeof filter !== 'object') return query;
  let q = query;
  for (const [key, value] of Object.entries(filter)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (Object.prototype.hasOwnProperty.call(value, '$in')) {
        q = q.in(key, value.$in);
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(value, '$nin')) {
        q = q.not(key, 'in', toInFilter(value.$nin));
        continue;
      }
    }
    if (value === null) {
      q = q.is(key, null);
    } else {
      q = q.eq(key, value);
    }
  }
  return q;
};

const TABLE_MAP = {
  Tarefa: 'tarefa',
  TarefaTemplate: 'tarefa_template',
  Funcionario: 'funcionario',
  FrenteTrabalho: 'frente_trabalho',
  Checklist: 'checklist',
  ChecklistExecucao: 'checklist_execucao',
  Nota: 'nota',
  Rota: 'rota',
  Veiculo: 'veiculo',
  AgendamentoVeiculo: 'agendamento_veiculo',
  Pendencia: 'pendencia',
  ConfiguracaoSistema: 'configuracao_sistema',
  LogAuditoria: 'log_auditoria',
  AppLogs: 'app_logs',
  AvaliacaoFuncionario: 'avaliacao_funcionario',
};

const resolveTableName = (name) => TABLE_MAP[name] || name;

const tableClient = (tableName) => ({
  async list(sort, limit, skip, fields) {
    const selectFields = Array.isArray(fields) ? fields.join(',') : fields || '*';
    let query = supabase.from(tableName).select(selectFields);
    query = applySort(query, sort);
    if (typeof skip === 'number') {
      const take = typeof limit === 'number' ? limit : 1000;
      query = query.range(skip, skip + take - 1);
    } else if (typeof limit === 'number') {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async filter(filter, sort, limit, skip, fields) {
    const selectFields = Array.isArray(fields) ? fields.join(',') : fields || '*';
    let query = supabase.from(tableName).select(selectFields);
    query = applyFilters(query, filter);
    query = applySort(query, sort);
    if (typeof skip === 'number') {
      const take = typeof limit === 'number' ? limit : 1000;
      query = query.range(skip, skip + take - 1);
    } else if (typeof limit === 'number') {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async create(payload) {
    const isArrayPayload = Array.isArray(payload);
    const query = supabase.from(tableName).insert(payload).select('*');
    if (isArrayPayload) {
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { data, error } = await supabase.from(tableName).delete().eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    return data;
  },
  async deleteMany(ids) {
    const { data, error } = await supabase.from(tableName).delete().in('id', ids).select('*');
    if (error) throw error;
    return data;
  },
  subscribe(callback) {
    const channel = supabase
      .channel(`realtime:${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          const typeMap = {
            INSERT: 'create',
            UPDATE: 'update',
            DELETE: 'delete',
          };
          const type = typeMap[payload.eventType] || payload.eventType?.toLowerCase();
          const data = payload.new ?? payload.old ?? payload;
          callback({ type, data });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
});

const entities = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined;
      return tableClient(resolveTableName(prop));
    },
  }
);

const auth = {
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async register(payload) {
    const emailRedirectTo = `${window.location.origin}/login`;
    const defaultOptions = {
      emailRedirectTo,
      data: { role: 'colaborador' },
    };
    const mergedOptions = payload?.options
      ? {
          ...defaultOptions,
          ...payload.options,
          data: {
            ...defaultOptions.data,
            ...(payload.options.data ?? {}),
          },
        }
      : defaultOptions;
    const normalizedPayload = { ...payload, options: mergedOptions };
    const { data, error } = await supabase.auth.signUp(normalizedPayload);
    if (error) throw error;
    return data;
  },
  async loginWithProvider(provider, redirectTo = window.location.origin) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) throw error;
  },
  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },
};

const appLogs = {
  async logUserInApp(pageName) {
    try {
      await supabase.from('app_logs').insert({ page: pageName, created_at: new Date().toISOString() });
    } catch {
      // Best-effort logging
    }
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      if (!file) throw new Error('File is required');
      const fileExt = file.name?.split('.').pop() || 'bin';
      const filePath = `checklist/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      return { file_url: data.publicUrl };
    },
  },
};

export const api = {
  supabase,
  auth,
  entities,
  appLogs,
  integrations,
};
