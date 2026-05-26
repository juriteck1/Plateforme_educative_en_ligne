-- ============================================================
-- MIGRATION : Système de notifications élèves
-- L'École du Savoir — À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'session_demarree',
  titre       text NOT NULL,
  message     text,
  session_id  uuid REFERENCES sessions(id) ON DELETE SET NULL,
  classe_id   uuid REFERENCES classes(id) ON DELETE SET NULL,
  lu          boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_lu ON notifications(user_id, lu);

-- 2. RLS sur notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_read_own"   ON notifications;
DROP POLICY IF EXISTS "notif_update_own" ON notifications;

-- Chaque utilisateur ne voit que ses propres notifications
CREATE POLICY "notif_read_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Il peut les marquer comme lues (update uniquement la colonne lu)
CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 3. Fonction déclenchée quand une session passe en_cours
CREATE OR REPLACE FUNCTION notifier_session_demarree()
RETURNS TRIGGER AS $$
DECLARE
  v_classe_nom text;
  v_eleve      RECORD;
BEGIN
  -- On n'agit que si le statut vient de passer à 'en_cours'
  IF NEW.statut = 'en_cours' AND (OLD.statut IS DISTINCT FROM 'en_cours') THEN

    -- Récupérer le nom de la classe
    SELECT nom INTO v_classe_nom FROM classes WHERE id = NEW.classe_id;

    -- Insérer une notification pour chaque élève inscrit dans cette classe
    FOR v_eleve IN
      SELECT eleve_id FROM inscriptions WHERE classe_id = NEW.classe_id
    LOOP
      INSERT INTO notifications (user_id, type, titre, message, session_id, classe_id)
      VALUES (
        v_eleve.eleve_id,
        'session_demarree',
        '🔴 Cours en direct — ' || COALESCE(v_classe_nom, 'Classe'),
        NEW.titre || ' vient de démarrer. Rejoins maintenant !',
        NEW.id,
        NEW.classe_id
      );
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger sur sessions
DROP TRIGGER IF EXISTS on_session_demarree ON sessions;
CREATE TRIGGER on_session_demarree
  AFTER UPDATE OF statut ON sessions
  FOR EACH ROW EXECUTE FUNCTION notifier_session_demarree();

-- ============================================================
-- VÉRIFICATION
-- SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
-- ============================================================
