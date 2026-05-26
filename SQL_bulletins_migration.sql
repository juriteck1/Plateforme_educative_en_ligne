-- ============================================================
-- MIGRATION : Système de bulletins trimestriels
-- L'École du Savoir — À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Table principale des bulletins
CREATE TABLE IF NOT EXISTS bulletins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id        uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  eleve_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enseignant_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trimestre        smallint NOT NULL CHECK (trimestre IN (1, 2, 3)),
  annee_scolaire   text NOT NULL,           -- ex: "2025-2026"
  appreciation_generale text,               -- Commentaire global de l'enseignant
  statut           text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'publie')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (classe_id, eleve_id, trimestre, annee_scolaire)
);

-- 2. Table des notes par matière (lignes du bulletin)
CREATE TABLE IF NOT EXISTS bulletin_matieres (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id  uuid NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  matiere      text NOT NULL,
  note         numeric(4,2),               -- Note sur 20 (ex: 14.50), NULL si non notée
  appreciation text,                        -- Commentaire par matière
  ordre        smallint DEFAULT 0,          -- Pour trier les matières dans le bulletin
  created_at   timestamptz DEFAULT now()
);

-- 3. Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_bulletins_classe ON bulletins(classe_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_eleve  ON bulletins(eleve_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_matieres_bulletin ON bulletin_matieres(bulletin_id);

-- 4. Fonction auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bulletins_updated_at ON bulletins;
CREATE TRIGGER bulletins_updated_at
  BEFORE UPDATE ON bulletins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Row Level Security
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_matieres ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes pour éviter les erreurs de doublon
DROP POLICY IF EXISTS "enseignant_full_access_bulletins" ON bulletins;
DROP POLICY IF EXISTS "eleve_read_own_bulletins"         ON bulletins;
DROP POLICY IF EXISTS "enseignant_full_access_bm"        ON bulletin_matieres;
DROP POLICY IF EXISTS "eleve_read_own_bm"                ON bulletin_matieres;

-- bulletins : l'enseignant de la classe peut tout faire
CREATE POLICY "enseignant_full_access_bulletins" ON bulletins
  FOR ALL USING (
    enseignant_id = auth.uid()
  );

-- bulletins : l'élève peut voir ses propres bulletins publiés
CREATE POLICY "eleve_read_own_bulletins" ON bulletins
  FOR SELECT USING (
    eleve_id = auth.uid() AND statut = 'publie'
  );

-- bulletin_matieres : via le bulletin parent
CREATE POLICY "enseignant_full_access_bm" ON bulletin_matieres
  FOR ALL USING (
    bulletin_id IN (
      SELECT id FROM bulletins WHERE enseignant_id = auth.uid()
    )
  );

CREATE POLICY "eleve_read_own_bm" ON bulletin_matieres
  FOR SELECT USING (
    bulletin_id IN (
      SELECT id FROM bulletins WHERE eleve_id = auth.uid() AND statut = 'publie'
    )
  );

-- ============================================================
-- DONNÉES DE TEST (optionnel — à supprimer en production)
-- ============================================================
-- Vous pouvez tester la structure avec :
-- SELECT * FROM bulletins;
-- SELECT * FROM bulletin_matieres;
