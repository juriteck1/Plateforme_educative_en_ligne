-- =============================================
-- L'École du Savoir — Schéma Base de Données
-- VERSION CORRIGÉE — tables d'abord, policies ensuite
-- =============================================

-- ─── PARTIE 1 : CRÉATION DES TABLES ─────────────────────────────────────────

-- 1. PROFILS UTILISATEURS
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  nom text not null,
  prenom text not null,
  role text not null check (role in ('enseignant', 'eleve')),
  created_at timestamptz default now()
);

-- 2. CLASSES
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  description text,
  enseignant_id uuid references public.profiles(id) on delete cascade not null,
  code_acces text unique not null default substring(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- 3. INSCRIPTIONS
create table public.inscriptions (
  id uuid default gen_random_uuid() primary key,
  classe_id uuid references public.classes(id) on delete cascade not null,
  eleve_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(classe_id, eleve_id)
);

-- 4. SESSIONS DE COURS
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  classe_id uuid references public.classes(id) on delete cascade not null,
  titre text not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'en_cours', 'pause', 'terminee')),
  daily_room_url text,
  daily_room_name text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- 5. PRÉSENCES
create table public.presences (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  eleve_id uuid references public.profiles(id) on delete cascade not null,
  rejoint_a timestamptz default now(),
  quitte_a timestamptz,
  unique(session_id, eleve_id)
);

-- 6. EXERCICES
create table public.exercices (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  question text not null,
  type text not null default 'reponse_courte' check (type in ('qcm', 'reponse_courte')),
  options jsonb,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'envoye', 'corrige')),
  created_at timestamptz default now()
);

-- 7. RÉPONSES
create table public.reponses (
  id uuid default gen_random_uuid() primary key,
  exercice_id uuid references public.exercices(id) on delete cascade not null,
  eleve_id uuid references public.profiles(id) on delete cascade not null,
  contenu text not null,
  correction text,
  note integer check (note >= 0 and note <= 20),
  created_at timestamptz default now(),
  unique(exercice_id, eleve_id)
);


-- ─── PARTIE 2 : SÉCURITÉ (RLS) ───────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.inscriptions enable row level security;
alter table public.sessions enable row level security;
alter table public.presences enable row level security;
alter table public.exercices enable row level security;
alter table public.reponses enable row level security;

-- Profiles
create policy "Utilisateur voit son profil"
  on public.profiles for select using (auth.uid() = id);

create policy "Utilisateur modifie son profil"
  on public.profiles for update using (auth.uid() = id);

create policy "Enseignant voit les profils de ses élèves"
  on public.profiles for select
  using (
    exists (
      select 1 from public.inscriptions i
      join public.classes c on i.classe_id = c.id
      where i.eleve_id = profiles.id and c.enseignant_id = auth.uid()
    )
  );

-- Classes
create policy "Enseignant voit ses classes"
  on public.classes for select using (auth.uid() = enseignant_id);

create policy "Élève voit ses classes"
  on public.classes for select
  using (
    exists (
      select 1 from public.inscriptions
      where classe_id = classes.id and eleve_id = auth.uid()
    )
  );

create policy "Enseignant crée ses classes"
  on public.classes for insert with check (auth.uid() = enseignant_id);

create policy "Enseignant modifie ses classes"
  on public.classes for update using (auth.uid() = enseignant_id);

-- Inscriptions
create policy "Enseignant voit les inscriptions de sa classe"
  on public.inscriptions for select
  using (
    exists (
      select 1 from public.classes
      where id = inscriptions.classe_id and enseignant_id = auth.uid()
    )
  );

create policy "Élève voit ses inscriptions"
  on public.inscriptions for select using (auth.uid() = eleve_id);

create policy "Élève s'inscrit"
  on public.inscriptions for insert with check (auth.uid() = eleve_id);

-- Sessions
create policy "Enseignant gère ses sessions"
  on public.sessions for all
  using (
    exists (
      select 1 from public.classes
      where id = sessions.classe_id and enseignant_id = auth.uid()
    )
  );

create policy "Élève voit les sessions de ses classes"
  on public.sessions for select
  using (
    exists (
      select 1 from public.inscriptions
      where classe_id = sessions.classe_id and eleve_id = auth.uid()
    )
  );

-- Présences
create policy "Enseignant voit les présences"
  on public.presences for select
  using (
    exists (
      select 1 from public.sessions s
      join public.classes c on s.classe_id = c.id
      where s.id = presences.session_id and c.enseignant_id = auth.uid()
    )
  );

create policy "Élève gère sa présence"
  on public.presences for all using (auth.uid() = eleve_id);

-- Exercices
create policy "Enseignant gère les exercices"
  on public.exercices for all
  using (
    exists (
      select 1 from public.sessions s
      join public.classes c on s.classe_id = c.id
      where s.id = exercices.session_id and c.enseignant_id = auth.uid()
    )
  );

create policy "Élève voit les exercices envoyés"
  on public.exercices for select
  using (
    statut in ('envoye', 'corrige') and
    exists (
      select 1 from public.sessions s
      join public.inscriptions i on s.classe_id = i.classe_id
      where s.id = exercices.session_id and i.eleve_id = auth.uid()
    )
  );

-- Réponses
create policy "Élève gère sa réponse"
  on public.reponses for all using (auth.uid() = eleve_id);

create policy "Enseignant corrige les réponses"
  on public.reponses for all
  using (
    exists (
      select 1 from public.exercices e
      join public.sessions s on e.session_id = s.id
      join public.classes c on s.classe_id = c.id
      where e.id = reponses.exercice_id and c.enseignant_id = auth.uid()
    )
  );


-- ─── PARTIE 3 : TRIGGER AUTO-PROFIL ──────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nom, prenom, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nom', ''),
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    coalesce(new.raw_user_meta_data->>'role', 'eleve')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── PARTIE 4 : TEMPS RÉEL ───────────────────────────────────────────────────

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.exercices;
alter publication supabase_realtime add table public.reponses;
alter publication supabase_realtime add table public.presences;
