create type public.app_role as enum ('user', 'security_admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'security_admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'security_admin'));

create table public.legacy_users (
  legacy_id text primary key,
  email text not null unique,
  name text not null default '',
  role public.app_role not null default 'user',
  linked_user_id uuid,
  linked_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.legacy_users to service_role;
alter table public.legacy_users enable row level security;

create table public.agents (
  id text primary key default ('agt-' || substr(md5(random()::text), 1, 12)),
  slug text,
  owner_id uuid,
  legacy_owner_id text,
  is_builtin boolean not null default false,
  name text not null,
  icon text not null default '🤖',
  category text not null default 'General AI',
  role_title text,
  system_prompt text,
  sample_topics text[] not null default '{}',
  status text not null default 'Protected',
  enabled boolean not null default true,
  integration_method text not null default 'API',
  description text not null default '',
  protection_mode text not null default 'AUTOMATIC_BLOCK',
  request_count integer not null default 0,
  threat_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now()
);
grant select, insert, update, delete on public.agents to authenticated;
grant all on public.agents to service_role;
alter table public.agents enable row level security;
create policy "agents read" on public.agents for select to authenticated using (is_builtin or owner_id = auth.uid() or public.has_role(auth.uid(), 'security_admin'));
create policy "agents insert own" on public.agents for insert to authenticated with check (owner_id = auth.uid() and not is_builtin);
create policy "agents update own" on public.agents for update to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(), 'security_admin')) with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'security_admin'));
create policy "agents delete own" on public.agents for delete to authenticated using (owner_id = auth.uid() and not is_builtin);

create table public.conversations (
  id text primary key default gen_random_uuid()::text,
  user_id uuid,
  legacy_user_id text,
  agent_id text not null references public.agents(id) on delete cascade,
  title text not null default 'New Security Guarded Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.conversations(user_id, updated_at desc);
grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "conv read" on public.conversations for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'security_admin'));
create policy "conv insert" on public.conversations for insert to authenticated with check (user_id = auth.uid());
create policy "conv update" on public.conversations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "conv delete" on public.conversations for delete to authenticated using (user_id = auth.uid());

create table public.messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id uuid,
  legacy_user_id text,
  sender text not null,
  content text not null,
  risk_score real not null default 0,
  risk_level text not null default 'LOW',
  decision text not null default 'ALLOW',
  detection_reason text,
  triggered_rules jsonb not null default '[]'::jsonb,
  ml_score real,
  created_at timestamptz not null default now()
);
create index on public.messages(conversation_id, created_at);
grant select, insert, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "msg read" on public.messages for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'security_admin'));
create policy "msg insert" on public.messages for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "msg delete" on public.messages for delete to authenticated using (user_id = auth.uid());

create table public.audit_logs (
  id text primary key,
  agent_id text not null,
  user_id uuid,
  legacy_user_id text,
  conversation_id text,
  website_url text,
  source_domain text,
  resource_type text not null default 'user_input',
  scan_status text not null default 'CLEAN',
  action_taken text not null default 'ALLOWED',
  request_text text not null,
  decision text not null,
  risk_score real not null,
  confidence real,
  attack_type text,
  severity text not null,
  model_prediction text,
  model_score real,
  detected_indicators jsonb not null default '[]'::jsonb,
  explanation text not null,
  processing_time_ms real not null default 0,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(created_at desc);
create index on public.audit_logs(user_id, created_at desc);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "logs read" on public.audit_logs for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'security_admin'));
create policy "logs insert" on public.audit_logs for insert to authenticated with check (user_id = auth.uid());

create table public.security_alerts (
  id text primary key,
  request_id text not null,
  user_id uuid,
  agent_id text not null,
  agent_name text not null,
  website_url text,
  attack_type text,
  threat text not null,
  severity text not null,
  risk_score real not null,
  confidence real,
  model_name text not null default 'Naive Bayes + Rules',
  model_prediction text,
  model_score real,
  status text not null default 'BLOCKED',
  action_taken text not null default 'BLOCKED',
  detected_input text not null,
  what_detected text not null,
  why_blocked text not null,
  indicators jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.security_alerts(created_at desc);
grant select, insert on public.security_alerts to authenticated;
grant all on public.security_alerts to service_role;
alter table public.security_alerts enable row level security;
create policy "alerts read" on public.security_alerts for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'security_admin'));
create policy "alerts insert" on public.security_alerts for insert to authenticated with check (user_id = auth.uid());

create table public.guardrail_settings (
  user_id uuid primary key,
  prompt_injection_enabled boolean not null default true,
  jailbreak_enabled boolean not null default true,
  system_prompt_protection boolean not null default true,
  data_leakage_detection boolean not null default true,
  output_validation boolean not null default true,
  webpage_scanning boolean not null default true,
  api_response_scanning boolean not null default true,
  tool_output_scanning boolean not null default true,
  block_mode text not null default 'BLOCK',
  low_threshold real not null default 0.40,
  high_threshold real not null default 0.70,
  notify_critical boolean not null default true,
  notify_blocked boolean not null default true,
  notify_warnings boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.guardrail_settings to authenticated;
grant all on public.guardrail_settings to service_role;
alter table public.guardrail_settings enable row level security;
create policy "settings own" on public.guardrail_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  agent_id text not null references public.agents(id) on delete cascade,
  name text not null default 'Default Agent Key',
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
grant select, insert, update on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;
create policy "keys read own" on public.api_keys for select to authenticated using (user_id = auth.uid());
create policy "keys insert own" on public.api_keys for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.agents a where a.id = agent_id and a.owner_id = auth.uid()));
create policy "keys update own" on public.api_keys for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.link_legacy_user(_uid uuid, _email text)
returns void language plpgsql security definer set search_path = public as $$
declare lu public.legacy_users;
begin
  select * into lu from public.legacy_users where email = lower(_email) and linked_user_id is null for update;
  if not found then return; end if;
  update public.legacy_users set linked_user_id = _uid, linked_at = now() where legacy_id = lu.legacy_id;
  update public.profiles set name = coalesce(nullif(lu.name, ''), name) where id = _uid;
  update public.agents set owner_id = _uid where legacy_owner_id = lu.legacy_id and owner_id is null;
  update public.conversations set user_id = _uid where legacy_user_id = lu.legacy_id and user_id is null;
  update public.messages set user_id = _uid where legacy_user_id = lu.legacy_id and user_id is null;
  update public.audit_logs set user_id = _uid where legacy_user_id = lu.legacy_id and user_id is null;
  if lu.role = 'security_admin' then
    insert into public.user_roles(user_id, role) values (_uid, 'security_admin') on conflict do nothing;
  end if;
end $$;
revoke execute on function public.link_legacy_user(uuid, text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if new.email_confirmed_at is not null then
    perform public.link_legacy_user(new.id, new.email);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform public.link_legacy_user(new.id, new.email);
  end if;
  return new;
end $$;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users for each row execute function public.handle_user_confirmed();

insert into public.agents (id, slug, is_builtin, name, icon, category, role_title, system_prompt, sample_topics, description) values
('general-assistant','general-assistant',true,'General AI Assistant','🤖','General AI','General Intelligence & Reasoning','You are a helpful, courteous, and knowledgeable general-purpose AI assistant. Provide concise, clear, and accurate answers.','{general knowledge,daily planning,explanations,summaries}','Everyday questions, planning and summaries.'),
('coding-agent','coding-agent',true,'Coding Assistant','💻','Software Development','Software Engineering & Architecture','You are an expert software engineer and code reviewer. Write clean, idiomatic, robust code with syntax highlighting and explanations.','{Python,JavaScript,algorithms,debugging,system design}','Code, debugging and architecture help.'),
('travel-agent','travel-agent',true,'Travel Assistant','✈️','Travel & Hospitality','Travel Planning & Logistics','You are a professional travel coordinator. Assist with flight schedules, hotel recommendations, packing advice, and city itineraries.','{flights,hotels,itineraries,visa requirements,sightseeing}','Flights, hotels and itineraries.'),
('finance-agent','finance-agent',true,'Finance Assistant','📈','Financial Services','Financial Analytics & Budgeting','You are a financial information assistant. Explain financial concepts, market dynamics, and budgeting principles responsibly without giving legal investment advice.','{budgeting,market concepts,financial metrics,compound interest}','Budgeting and financial concepts.'),
('research-agent','research-agent',true,'Research Assistant','📚','Academic & Knowledge','Academic & Scientific QA','You are an academic research assistant. Provide well-structured summaries, literature synthesis, and objective explanations.','{literature review,methodology,data analysis,scientific papers}','Literature review and analysis.'),
('banking-agent','banking-agent',true,'Banking Agent','🏦','Financial Services','Secure Banking Operations','You are a secure banking agent assistant. Facilitate account inquiries, balance overviews, and policy explanations safely.','{balance inquiries,wire transfers,account security,cards}','Account and banking policy questions.'),
('shopping-agent','shopping-agent',true,'Shopping Agent','🛒','E-Commerce','E-Commerce & Product Discovery','You are an e-commerce shopping concierge. Provide product comparisons, budget picks, and feature breakdowns.','{laptops,smartphones,appliances,deals,reviews}','Product comparisons and deals.');