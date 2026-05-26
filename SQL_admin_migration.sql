-- ============================================================
-- MIGRATION : Rôle administrateur
-- L'École du Savoir — À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Mettre à jour la contrainte CHECK sur le rôle (si elle existe)
-- (Supabase stocke le rôle comme text, pas d'enum, donc pas de migration nécessaire)
-- Il suffit de créer un compte avec role='admin' via l'interface ou ce SQL :

-- Pour promouvoir un utilisateur existant en admin :
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@ecole-du-savoir.fr';

-- 2. Policies admin — lecture complète sur toutes les tables
-- L'admin peut lire toutes les données (jamais modifier via ces policies)

-- Helper : est-ce que l'utilisateur actuel est admin ?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Classes
DROP POLICY IF EXISTS "admin_read_all_classes" ON classes;
CREATE POLICY "admin_read_all_classes" ON classes
  FOR SELECT USING (is_admin());

-- Sessions
DROP POLICY IF EXISTS "admin_read_all_sessions" ON sessions;
CREATE POLICY "admin_read_all_sessions" ON sessions
  FOR SELECT USING (is_admin());

-- Inscriptions
DROP POLICY IF EXISTS "admin_read_all_inscriptions" ON inscriptions;
CREATE POLICY "admin_read_all_inscriptions" ON inscriptions
  FOR SELECT USING (is_admin());

-- Bulletins
DROP POLICY IF EXISTS "admin_read_all_bulletins" ON bulletins;
CREATE POLICY "admin_read_all_bulletins" ON bulletins
  FOR SELECT USING (is_admin());

-- Presences
DROP POLICY IF EXISTS "admin_read_all_presences" ON presences;
CREATE POLICY "admin_read_all_presences" ON presences
  FOR SELECT USING (is_admin());

-- Exercices
DROP POLICY IF EXISTS "admin_read_all_exercices" ON exercices;
CREATE POLICY "admin_read_all_exercices" ON exercices
  FOR SELECT USING (is_admin());

-- Reponses
DROP POLICY IF EXISTS "admin_read_all_reponses" ON reponses;
CREATE POLICY "admin_read_all_reponses" ON reponses
  FOR SELECT USING (is_admin());

-- ============================================================
-- CRÉER UN COMPTE ADMIN
-- 1. Créer un compte via /inscription avec n'importe quel rôle
-- 2. Puis exécuter :
--    UPDATE profiles SET role = 'admin' WHERE email = 'votre@email.com';
-- ============================================================
