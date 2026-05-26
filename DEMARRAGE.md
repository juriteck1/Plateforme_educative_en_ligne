# 🚀 Guide de démarrage — L'École du Savoir

## Étape 1 — Installer les dépendances

Ouvre un terminal dans le dossier `ecole-du-savoir` et lance :

```bash
npm install
```

---

## Étape 2 — Configurer Supabase

1. Va sur [supabase.com](https://supabase.com) → ton projet
2. Clique sur **Settings → API**
3. Copie **Project URL** et **anon public key**
4. Ouvre le fichier `.env.local` et remplace les valeurs :

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJXXXXXXX...
```

5. Va dans **SQL Editor** sur Supabase
6. Colle le contenu du fichier `supabase/schema.sql` et clique **Run**

---

## Étape 3 — Configurer Daily.co (optionnel pour tester)

1. Va sur [daily.co](https://daily.co) → crée un compte gratuit
2. Va dans **Developers → API Keys**
3. Copie ta clé et mets-la dans `.env.local` :

```
DAILY_API_KEY=TA_CLE_ICI
```

> Sans Daily.co, la plateforme fonctionne mais sans vidéo. Tu peux tester toutes les autres fonctions.

---

## Étape 4 — Lancer le projet

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) dans ton navigateur.

---

## Structure du projet

```
src/app/
├── page.tsx                          → Page d'accueil
├── connexion/page.tsx                → Login
├── inscription/page.tsx              → Inscription (enseignant / élève)
├── rejoindre/page.tsx                → Rejoindre une classe (élève)
├── dashboard/page.tsx                → Dashboard enseignant
├── dashboard/classe/[id]/            → Gérer une classe
├── mes-classes/page.tsx              → Espace élève
├── session/[id]/enseignant/page.tsx  → Salle de classe (enseignant)
├── session/[id]/eleve/page.tsx       → Salle de classe (élève)
└── api/daily/create-room/route.ts    → API création salle vidéo
```

---

## Flux principal

1. **Enseignant** → S'inscrit → Crée une classe → Partage le code
2. **Élève** → S'inscrit → Entre le code → Rejoint la classe
3. **Enseignant** → Lance un cours → Les élèves voient "En direct"
4. **Élèves** → Cliquent "Rejoindre le cours en direct"
5. **Enseignant** → Envoie un exercice → Voit les réponses en temps réel
6. **Enseignant** → Corrige → L'élève voit la correction instantanément
