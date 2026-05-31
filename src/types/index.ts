export type UserRole = 'enseignant' | 'aesh' | 'eleve' | 'parent' | 'admin' | 'superadmin'

export interface Profile {
  id: string
  email: string
  nom: string
  prenom: string
  role: UserRole
  created_at: string
}

export interface Classe {
  id: string
  nom: string
  description: string | null
  enseignant_id: string
  etablissement_id: string | null
  code_acces: string
  created_at: string
  enseignant?: Profile
}

export interface Session {
  id: string
  classe_id: string
  titre: string
  statut: 'en_attente' | 'en_cours' | 'pause' | 'terminee'
  daily_room_url: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  sections_actives: SectionActive[] | null
  classe?: Classe
}

export type SectionActive = 'comptine' | 'sourate' | 'exercices' | 'documents' | 'video' | 'avant_cours' | 'travail_a_faire'

export interface ContenuSession {
  id: string
  session_id: string
  enseignant_id: string
  type: 'comptine' | 'sourate' | 'video'
  titre: string
  texte_paroles: string | null      // Paroles comptine / description vidéo
  texte_arabe: string | null        // Texte arabe de la sourate
  traduction: string | null         // Traduction française
  lien_url: string | null           // Lien YouTube / audio
  fichier_url: string | null        // URL fichier uploadé
  fichier_path: string | null       // Chemin Storage pour suppression
  created_at: string
}

export interface Exercice {
  id: string
  session_id: string
  question: string
  type: 'qcm' | 'reponse_courte'
  options: string[] | null   // Pour QCM
  statut: 'brouillon' | 'envoye' | 'corrige'
  created_at: string
}

export interface Reponse {
  id: string
  exercice_id: string
  eleve_id: string
  contenu: string
  correction: string | null
  note: number | null
  created_at: string
  eleve?: Profile
  exercice?: Exercice
}

export interface ExerciceModele {
  id: string
  enseignant_id: string
  titre: string
  question: string
  type: 'qcm' | 'reponse_courte'
  options: string[] | null
  matiere: string | null
  niveau: string | null
  created_at: string
}

export interface ContenuClasse {
  id: string
  classe_id: string
  enseignant_id: string
  session_id: string | null
  type: 'avant_cours' | 'travail_a_faire'
  titre: string
  contenu: string | null
  date_limite: string | null
  created_at: string
}

export interface DocumentClasse {
  id: string
  classe_id: string
  enseignant_id: string
  nom: string
  fichier_url: string
  fichier_path: string
  type_fichier: 'pdf' | 'image' | 'autre'
  taille: number | null
  created_at: string
}

export interface Presence {
  id: string
  session_id: string
  eleve_id: string
  rejoint_a: string
  quitte_a: string | null
  statut_appel: 'present' | 'absent' | null
  eleve?: Profile
}

export interface MessageSession {
  id: string
  session_id: string
  auteur_id: string
  contenu: string
  type: 'message' | 'main_levee' | 'annonce'
  created_at: string
  auteur?: Profile
}

export interface ParentEleve {
  id: string
  parent_id: string
  eleve_id: string
  created_at: string
  eleve?: Profile
}

export interface BulletinMatiere {
  id: string
  bulletin_id: string
  matiere: string
  note: number | null       // Note sur 20, null si non notée
  appreciation: string | null
  ordre: number
  created_at: string
}

export interface Bulletin {
  id: string
  classe_id: string
  eleve_id: string
  enseignant_id: string
  trimestre: 1 | 2 | 3
  annee_scolaire: string    // ex: "2025-2026"
  appreciation_generale: string | null
  statut: 'brouillon' | 'publie'
  created_at: string
  updated_at: string
  // Relations optionnelles
  eleve?: Profile
  enseignant?: Profile
  classe?: Classe
  matieres?: BulletinMatiere[]
}
ieres?: BulletinMatiere[]
}
