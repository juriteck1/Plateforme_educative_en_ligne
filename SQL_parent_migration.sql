-- ============================================================
-- MIGRATION : Espace parents
-- L'École du Savoir — À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Table de liaison parent ↔ élève
CREATE TABLE IF NOT EXISTS parent_eleve (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  eleve_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (parent_id, eleve_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_eleve_parent ON parent_eleve(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_eleve_eleve  ON parent_eleve(eleve_id);

-- 2. RLS sur parent_eleve
ALTER TABLE parent_eleve ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_see_own_links"           ON parent_eleve;
DROP POLICY IF EXISTS "parent_insert_own_link"         ON parent_eleve;
DROP POLICY IF EXISTS "parent_read_child_bulletins"    ON bulletins;
DROP POLICY IF EXISTS "parent_read_child_bm"           ON bulletin_matieres;
DROP POLICY IF EXISTS "parent_read_child_presences"    ON presences;
DROP POLICY IF EXISTS "parent_read_child_reponses"     ON reponses;
DROP POLICY IF EXISTS "parent_read_child_contenus"     ON contenus_classe;
DROP POLICY IF EXISTS "parent_read_child_sessions"     ON sessions;
DROP POLICY IF EXISTS "parent_read_child_classes"      ON classes;
DROP POLICY IF EXISTS "parent_read_child_profile"      ON profiles;
DROP POLICY IF EXISTS "parent_read_child_exercices"    ON exercices;

CREATE POLICY "parent_see_own_links" ON parent_eleve
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "parent_insert_own_link" ON parent_eleve
  FOR INSERT WITH CHECK (parent_id = auth.uid());

-- 3. Permettre aux parents de lire les bulletins publiés de leur enfant
-- (en plus de la policy élève déjà existante)
CREATE POLICY "parent_read_child_bulletins" ON bulletins
  FOR SELECT USING (
    statut = 'publie'
    AND eleve_id IN (
      SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "parent_read_child_bm" ON bulletin_matieres
  FOR SELECT USING (
    bulletin_id IN (
      SELECT id FROM bulletins
      WHERE statut = 'publie'
        AND eleve_id IN (
          SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
        )
    )
  );

-- 4. Permettre aux parents de lire les présences de leur enfant
CREATE POLICY "parent_read_child_presences" ON presences
  FOR SELECT USING (
    eleve_id IN (
      SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
    )
  );

-- 5. Permettre aux parents de lire les réponses (exercices) de leur enfant
CREATE POLICY "parent_read_child_reponses" ON reponses
  FOR SELECT USING (
    eleve_id IN (
      SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
    )
  );

-- 6. Permettre aux parents de lire les contenus_classe de la classe de leur enfant
CREATE POLICY "parent_read_child_contenus" ON contenus_classe
  FOR SELECT USING (
    classe_id IN (
      SELECT classe_id FROM inscriptions
      WHERE eleve_id IN (
        SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
      )
    )
  );

-- 7. Permettre aux parents de lire les sessions de la classe de leur enfant
CREATE POLICY "parent_read_child_sessions" ON sessions
  FOR SELECT USING (
    classe_id IN (
      SELECT classe_id FROM inscriptions
      WHERE eleve_id IN (
        SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
      )
    )
  );

-- 8. Permettre aux parents de lire les classes de leur enfant
CREATE POLICY "parent_read_child_classes" ON classes
  FOR SELECT USING (
    id IN (
      SELECT classe_id FROM inscriptions
      WHERE eleve_id IN (
        SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
      )
    )
  );

-- 9. Permettre aux parents de lire le profil de leur enfant
CREATE POLICY "parent_read_child_profile" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
    )
    OR id = auth.uid()
  );

-- 10. Permettre aux parents de lire les exercices (pour afficher les questions)
CREATE POLICY "parent_read_child_exercices" ON exercices
  FOR SELECT USING (
    id IN (
      SELECT exercice_id FROM reponses
      WHERE eleve_id IN (
        SELECT eleve_id FROM parent_eleve WHERE parent_id = auth.uid()
      )
    )
  );

-- ============================================================
-- VÉRIFICATION
-- SELECT * FROM parent_eleve;
-- SELECT * FROM bulletins WHERE eleve_id = '<id_eleve>';
-- ============================================================
