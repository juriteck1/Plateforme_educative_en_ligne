-- ============================================================
-- MIGRATION : Multi-tenant — Établissements
-- L'École du Savoir — À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Table établissements
CREATE TABLE IF NOT EXISTS etablissements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom          text NOT NULL,
  adresse      text,
  code_acces   text UNIQUE NOT NULL DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  created_at   timestamptz DEFAULT now()
);

-- 2. Ajouter etablissement_id sur profiles et classes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS etablissement_id uuid REFERENCES etablissements(id) ON DELETE SET NULL;
ALTER TABLE classes  ADD COLUMN IF NOT EXISTS etablissement_id uuid REFERENCES etablissements(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_etablissement ON profiles(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_classes_etablissement  ON classes(etablissement_id);

-- 3. Contrainte role mise à jour (superadmin inclus)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('enseignant', 'eleve', 'parent', 'admin', 'superadmin'));

-- 4. RLS sur établissements
ALTER TABLE etablissements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_etablissements" ON etablissements;
DROP POLICY IF EXISTS "admin_read_own_etablissement"   ON etablissements;
DROP POLICY IF EXISTS "all_read_etablissement_by_code" ON etablissements;

CREATE POLICY "superadmin_full_etablissements" ON etablissements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "admin_read_own_etablissement" ON etablissements
  FOR SELECT USING (
    id IN (SELECT etablissement_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tout le monde peut lire un établissement par son code (pour l'inscription)
CREATE POLICY "all_read_etablissement_by_code" ON etablissements
  FOR SELECT USING (true);

-- 5. Fonction helper : établissement de l'admin connecté
CREATE OR REPLACE FUNCTION get_mon_etablissement_id()
RETURNS uuid AS $$
  SELECT etablissement_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. Supprimer les anciennes policies admin globales
DROP POLICY IF EXISTS "admin_read_all_profiles"     ON profiles;
DROP POLICY IF EXISTS "admin_read_all_classes"      ON classes;
DROP POLICY IF EXISTS "admin_read_all_sessions"     ON sessions;
DROP POLICY IF EXISTS "admin_read_all_inscriptions" ON inscriptions;
DROP POLICY IF EXISTS "admin_read_all_bulletins"    ON bulletins;
DROP POLICY IF EXISTS "admin_read_all_presences"    ON presences;
DROP POLICY IF EXISTS "admin_read_all_exercices"    ON exercices;
DROP POLICY IF EXISTS "admin_read_all_reponses"     ON reponses;

-- 7. Nouvelles policies admin scoped par établissement

-- Profiles : admin voit les membres de son établissement
DROP POLICY IF EXISTS "admin_read_etablissement_profiles" ON profiles;
CREATE POLICY "admin_read_etablissement_profiles" ON profiles
  FOR SELECT USING (
    (role = 'admin' AND etablissement_id = get_mon_etablissement_id() AND auth.uid() IS NOT NULL)
    OR (role = 'superadmin' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'))
    OR etablissement_id = get_mon_etablissement_id()
    OR id = auth.uid()
  );

-- Classes : admin voit les classes de son établissement
DROP POLICY IF EXISTS "admin_read_etablissement_classes" ON classes;
CREATE POLICY "admin_read_etablissement_classes" ON classes
  FOR SELECT USING (
    etablissement_id = get_mon_etablissement_id()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Sessions : admin voit les sessions des classes de son établissement
DROP POLICY IF EXISTS "admin_read_etablissement_sessions" ON sessions;
CREATE POLICY "admin_read_etablissement_sessions" ON sessions
  FOR SELECT USING (
    classe_id IN (
      SELECT id FROM classes WHERE etablissement_id = get_mon_etablissement_id()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Bulletins
DROP POLICY IF EXISTS "admin_read_etablissement_bulletins" ON bulletins;
CREATE POLICY "admin_read_etablissement_bulletins" ON bulletins
  FOR SELECT USING (
    classe_id IN (
      SELECT id FROM classes WHERE etablissement_id = get_mon_etablissement_id()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Presences
DROP POLICY IF EXISTS "admin_read_etablissement_presences" ON presences;
CREATE POLICY "admin_read_etablissement_presences" ON presences
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN classes c ON c.id = s.classe_id
      WHERE c.etablissement_id = get_mon_etablissement_id()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Inscriptions
DROP POLICY IF EXISTS "admin_read_etablissement_inscriptions" ON inscriptions;
CREATE POLICY "admin_read_etablissement_inscriptions" ON inscriptions
  FOR SELECT USING (
    classe_id IN (
      SELECT id FROM classes WHERE etablissement_id = get_mon_etablissement_id()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- 8. Trigger : quand un enseignant crée une classe, hériter de son etablissement_id
CREATE OR REPLACE FUNCTION set_classe_etablissement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.etablissement_id IS NULL THEN
    SELECT etablissement_id INTO NEW.etablissement_id
    FROM profiles WHERE id = NEW.enseignant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_classe_created ON classes;
CREATE TRIGGER on_classe_created
  BEFORE INSERT ON classes
  FOR EACH ROW EXECUTE FUNCTION set_classe_etablissement();

-- ============================================================
-- CRÉER LE PREMIER SUPERADMIN :
-- UPDATE profiles SET role = 'superadmin' WHERE email = 'superadmin@ecole.fr';
--
-- CRÉER UN ÉTABLISSEMENT :
-- INSERT INTO etablissements (nom, adresse) VALUES ('École Al-Hikma', 'Paris');
-- SELECT code_acces FROM etablissements WHERE nom = 'École Al-Hikma';
-- ============================================================
