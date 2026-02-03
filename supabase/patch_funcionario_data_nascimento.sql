-- Patch: adiciona data_nascimento em funcionario
-- Execute no Supabase SQL Editor.

alter table public.funcionario
  add column if not exists data_nascimento date;

