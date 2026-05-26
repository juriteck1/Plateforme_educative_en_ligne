export type Lang = 'fr' | 'ar' | 'en' | 'tr'

export const translations = {
  fr: {
    // Navbar publique
    nav: {
      seConnecter: 'Se connecter',
      commencer: 'Commencer gratuitement',
      fonctionnalites: 'Fonctionnalités',
      roles: 'Rôles',
      statistiques: 'Statistiques',
    },

    // Landing page
    landing: {
      badge: '🎓 Plateforme éducative en ligne',
      titre1: "L'école en ligne,",
      titre2: 'simple et efficace',
      sousTitre: "Cours en direct, exercices interactifs, bulletins trimestriels et suivi parent — tout ce qu'il faut pour enseigner et apprendre sereinement.",
      cta1: 'Commencer gratuitement',
      cta2: 'Se connecter',
      stats: {
        direct: 'Cours en direct',
        exercices: 'Exercices interactifs',
        bulletins: 'Bulletins numériques',
        suivi: 'Suivi en temps réel',
      },
      features: {
        titre: 'Tout ce dont vous avez besoin',
        sousTitre: 'Une plateforme pensée pour les enseignants, les élèves et les parents.',
        items: [
          { titre: 'Cours en direct', desc: 'Lancez des sessions vidéo en un clic. Gérez la présence, le chat et les exercices en temps réel.' },
          { titre: 'Exercices interactifs', desc: 'Créez des QCM, questions ouvertes et exercices chronométrés. Les élèves répondent en direct.' },
          { titre: 'Bulletins numériques', desc: 'Générez et publiez des bulletins trimestriels professionnels, consultables par les parents.' },
          { titre: 'Espace parent', desc: 'Les parents suivent la progression de leur enfant, voient les bulletins et les présences.' },
          { titre: 'Bibliothèque', desc: 'Partagez documents, fichiers et contenus pédagogiques directement dans les classes.' },
          { titre: 'Multi-établissements', desc: 'Chaque école a son espace isolé. Un super-admin gère tous les établissements.' },
        ],
      },
      pourQui: {
        titre: 'Pour qui ?',
        roles: [
          { emoji: '👩‍🏫', titre: 'Enseignants', desc: 'Créez vos classes, planifiez vos sessions et suivez vos élèves depuis un tableau de bord clair et intuitif.' },
          { emoji: '🎓', titre: 'Élèves', desc: 'Rejoignez vos cours en direct, répondez aux exercices et consultez vos bulletins en quelques clics.' },
          { emoji: '👨‍👩‍👧', titre: 'Parents', desc: 'Restez informés de la progression de votre enfant avec un accès dédié aux bulletins et présences.' },
        ],
      },
      cta: {
        titre: 'Prêt à transformer vos cours ?',
        sousTitre: "Rejoignez l'École du Savoir et offrez à vos élèves une expérience d'apprentissage moderne.",
        btn: 'Créer mon compte gratuitement',
      },
      footer: "Fait avec ❤️ pour l'éducation",
    },

    // Connexion
    connexion: {
      titre: 'Connexion',
      email: 'Adresse e-mail',
      motDePasse: 'Mot de passe',
      mdpOublie: 'Mot de passe oublié ?',
      btn: 'Se connecter',
      pasDeCompte: 'Pas encore de compte ?',
      inscription: "S'inscrire",
      erreur: 'Email ou mot de passe incorrect.',
      erreurReseau: 'Erreur de connexion. Vérifie ta connexion internet.',
    },

    // Inscription
    inscription: {
      titre: 'Créer un compte',
      prenom: 'Prénom',
      nom: 'Nom',
      email: 'Votre adresse e-mail',
      motDePasse: 'Mot de passe',
      mdpPlaceholder: '6 caractères minimum',
      btn: 'Créer mon compte',
      dejaInscrit: 'Déjà inscrit ?',
      seConnecter: 'Se connecter',
      roles: {
        enseignant: { label: 'Enseignant', desc: 'Je crée et anime des cours' },
        aesh: { label: 'AESH', desc: "J'accompagne les élèves" },
        eleve: { label: 'Élève', desc: 'Je suis les cours' },
        parent: { label: 'Parent', desc: 'Je suis la progression de mon enfant' },
      },
      codeEcole: {
        label: "Code de votre école",
        info: "Demandez ce code à votre administrateur d'établissement.",
        placeholder: 'ex: A1B2C3D4',
      },
      emailEnfant: {
        label: "Email de votre enfant",
        info: 'Votre enfant doit déjà avoir un compte élève sur la plateforme.',
        placeholder: 'email.de.mon.enfant@exemple.com',
      },
      erreurs: {
        emailEnfantManquant: "Veuillez entrer l'adresse e-mail de votre enfant.",
        eleveIntrouvable: "Aucun élève trouvé avec cet email. Votre enfant doit d'abord créer son compte.",
        pasEleve: "Ce compte n'est pas un compte élève.",
        emailExistant: 'Cet email est déjà utilisé.',
        generique: 'Une erreur est survenue. Réessaie.',
        codeManquant: "Le code de votre école est requis.",
        codeInvalide: "Code école invalide. Vérifiez le code fourni par votre administrateur.",
      },
    },

    // Mot de passe oublié
    mdpOublie: {
      titre: 'Mot de passe oublié',
      sousTitre: 'Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.',
      email: 'Votre adresse e-mail',
      btn: 'Envoyer le lien',
      succes: 'Email envoyé ! Vérifiez votre boîte mail.',
      retour: 'Retour à la connexion',
    },

    // Reset password
    resetMdp: {
      titre: 'Nouveau mot de passe',
      sousTitre: 'Choisissez un nouveau mot de passe pour votre compte.',
      motDePasse: 'Nouveau mot de passe',
      confirmer: 'Confirmer le mot de passe',
      btn: 'Enregistrer',
      succes: 'Mot de passe modifié ! Redirection...',
      erreurCorrespondance: 'Les mots de passe ne correspondent pas.',
    },
  },

  ar: {
    // Navbar publique
    nav: {
      seConnecter: 'تسجيل الدخول',
      commencer: 'ابدأ مجاناً',
      fonctionnalites: 'الميزات',
      roles: 'الأدوار',
      statistiques: 'الإحصائيات',
    },

    // Landing page
    landing: {
      badge: '🎓 منصة تعليمية إلكترونية',
      titre1: 'التعليم عبر الإنترنت،',
      titre2: 'بسيط وفعّال',
      sousTitre: 'دروس مباشرة، تمارين تفاعلية، كشوف نقاط فصلية ومتابعة الأولياء — كل ما تحتاجه للتدريس والتعلم بكل سهولة.',
      cta1: 'ابدأ مجاناً',
      cta2: 'تسجيل الدخول',
      stats: {
        direct: 'دروس مباشرة',
        exercices: 'تمارين تفاعلية',
        bulletins: 'كشوف نقاط رقمية',
        suivi: 'متابعة فورية',
      },
      features: {
        titre: 'كل ما تحتاجه',
        sousTitre: 'منصة مصممة للمعلمين والتلاميذ وأولياء الأمور.',
        items: [
          { titre: 'دروس مباشرة', desc: 'أطلق جلسات الفيديو بنقرة واحدة. أدر الحضور والمحادثة والتمارين في الوقت الحقيقي.' },
          { titre: 'تمارين تفاعلية', desc: 'أنشئ أسئلة متعددة الخيارات وأسئلة مفتوحة وتمارين موقوتة. يجيب التلاميذ مباشرة.' },
          { titre: 'كشوف النقاط الرقمية', desc: 'أنشئ وانشر كشوف نقاط فصلية احترافية يطلع عليها الأولياء.' },
          { titre: 'فضاء الأولياء', desc: 'يتابع الأولياء تقدم أبنائهم ويطلعون على النتائج والحضور.' },
          { titre: 'المكتبة', desc: 'شارك الوثائق والملفات والمحتوى التعليمي مباشرة في الفصول.' },
          { titre: 'متعدد المؤسسات', desc: 'لكل مدرسة فضاؤها المستقل. يدير المشرف العام جميع المؤسسات.' },
        ],
      },
      pourQui: {
        titre: 'لمن هذه المنصة؟',
        roles: [
          { emoji: '👩‍🏫', titre: 'المعلمون', desc: 'أنشئ فصولك، خطط لجلساتك وتابع تلاميذك من لوحة تحكم واضحة وسهلة الاستخدام.' },
          { emoji: '🎓', titre: 'التلاميذ', desc: 'انضم لدروسك المباشرة، أجب على التمارين واطلع على نتائجك ببضع نقرات.' },
          { emoji: '👨‍👩‍👧', titre: 'أولياء الأمور', desc: 'ابقَ على اطلاع بتقدم ابنك مع وصول مخصص للنتائج وسجلات الحضور.' },
        ],
      },
      cta: {
        titre: 'هل أنت مستعد لتحويل دروسك؟',
        sousTitre: 'انضم إلى مدرسة المعرفة وامنح تلاميذك تجربة تعليمية عصرية.',
        btn: 'إنشاء حسابي مجاناً',
      },
      footer: 'صُنع بـ ❤️ من أجل التعليم',
    },

    // Connexion
    connexion: {
      titre: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      motDePasse: 'كلمة المرور',
      mdpOublie: 'نسيت كلمة المرور؟',
      btn: 'تسجيل الدخول',
      pasDeCompte: 'ليس لديك حساب؟',
      inscription: 'إنشاء حساب',
      erreur: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      erreurReseau: 'خطأ في الاتصال. تحقق من اتصالك بالإنترنت.',
    },

    // Inscription
    inscription: {
      titre: 'إنشاء حساب',
      prenom: 'الاسم الأول',
      nom: 'اللقب',
      email: 'بريدك الإلكتروني',
      motDePasse: 'كلمة المرور',
      mdpPlaceholder: '6 أحرف على الأقل',
      btn: 'إنشاء حسابي',
      dejaInscrit: 'لديك حساب بالفعل؟',
      seConnecter: 'تسجيل الدخول',
      roles: {
        enseignant: { label: 'معلم', desc: 'أنشئ الدروس وأديرها' },
        aesh: { label: 'AESH', desc: 'أرافق التلاميذ' },
        eleve: { label: 'تلميذ', desc: 'أتابع الدروس' },
        parent: { label: 'ولي الأمر', desc: 'أتابع تقدم ابني' },
      },
      codeEcole: {
        label: 'رمز مدرستك',
        info: 'اطلب هذا الرمز من مدير مؤسستك.',
        placeholder: 'مثال: A1B2C3D4',
      },
      emailEnfant: {
        label: 'البريد الإلكتروني لابنك',
        info: 'يجب أن يكون لابنك حساب تلميذ مسبق على المنصة.',
        placeholder: 'بريد.ابني@مثال.com',
      },
      erreurs: {
        emailEnfantManquant: 'يرجى إدخال البريد الإلكتروني لابنك.',
        eleveIntrouvable: 'لم يُعثر على أي تلميذ بهذا البريد. يجب على ابنك إنشاء حسابه أولاً.',
        pasEleve: 'هذا الحساب ليس حساب تلميذ.',
        emailExistant: 'هذا البريد الإلكتروني مستخدم بالفعل.',
        generique: 'حدث خطأ ما. حاول مجدداً.',
        codeManquant: 'رمز المدرسة مطلوب.',
        codeInvalide: 'رمز المدرسة غير صحيح. تحقق من الرمز الذي أعطاك إياه المدير.',
      },
    },

    // Mot de passe oublié
    mdpOublie: {
      titre: 'نسيت كلمة المرور',
      sousTitre: 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.',
      email: 'بريدك الإلكتروني',
      btn: 'إرسال الرابط',
      succes: 'تم الإرسال! تحقق من بريدك الإلكتروني.',
      retour: 'العودة إلى تسجيل الدخول',
    },

    // Reset password
    resetMdp: {
      titre: 'كلمة مرور جديدة',
      sousTitre: 'اختر كلمة مرور جديدة لحسابك.',
      motDePasse: 'كلمة المرور الجديدة',
      confirmer: 'تأكيد كلمة المرور',
      btn: 'حفظ',
      succes: 'تم تغيير كلمة المرور! جارٍ التحويل...',
      erreurCorrespondance: 'كلمتا المرور غير متطابقتين.',
    },
  },
  en: {
    nav: {
      seConnecter: 'Log in',
      commencer: 'Get started free',
      fonctionnalites: 'Features',
      roles: 'Roles',
      statistiques: 'Statistics',
    },
    landing: {
      badge: '🎓 Online educational platform',
      titre1: 'Learning online,',
      titre2: 'simple and effective',
      sousTitre: 'Live classes, interactive exercises, quarterly reports and parent tracking — everything you need to teach and learn with ease.',
      cta1: 'Get started free',
      cta2: 'Log in',
      stats: {
        direct: 'Live classes',
        exercices: 'Interactive exercises',
        bulletins: 'Digital reports',
        suivi: 'Real-time tracking',
      },
      features: {
        titre: 'Everything you need',
        sousTitre: 'A platform built for teachers, students and parents.',
        items: [
          { titre: 'Live classes', desc: 'Launch video sessions in one click. Manage attendance, chat and exercises in real time.' },
          { titre: 'Interactive exercises', desc: 'Create multiple choice questions, open questions and timed exercises. Students answer live.' },
          { titre: 'Digital report cards', desc: 'Generate and publish professional quarterly reports, accessible by parents.' },
          { titre: 'Parent space', desc: 'Parents track their child\'s progress, view reports and attendance records.' },
          { titre: 'Library', desc: 'Share documents, files and educational content directly within classes.' },
          { titre: 'Multi-school', desc: 'Each school has its own isolated space. A super admin manages all institutions.' },
        ],
      },
      pourQui: {
        titre: 'Who is it for?',
        roles: [
          { emoji: '👩‍🏫', titre: 'Teachers', desc: 'Create your classes, plan your sessions and track your students from a clear, intuitive dashboard.' },
          { emoji: '🎓', titre: 'Students', desc: 'Join live classes, answer exercises and view your reports in just a few clicks.' },
          { emoji: '👨‍👩‍👧', titre: 'Parents', desc: 'Stay informed about your child\'s progress with dedicated access to reports and attendance.' },
        ],
      },
      cta: {
        titre: 'Ready to transform your classes?',
        sousTitre: 'Join École du Savoir and give your students a modern learning experience.',
        btn: 'Create my free account',
      },
      footer: 'Made with ❤️ for education',
    },
    connexion: {
      titre: 'Log in',
      email: 'Email address',
      motDePasse: 'Password',
      mdpOublie: 'Forgot password?',
      btn: 'Log in',
      pasDeCompte: 'No account yet?',
      inscription: 'Sign up',
      erreur: 'Incorrect email or password.',
      erreurReseau: 'Connection error. Check your internet connection.',
    },
    inscription: {
      titre: 'Create an account',
      prenom: 'First name',
      nom: 'Last name',
      email: 'Your email address',
      motDePasse: 'Password',
      mdpPlaceholder: 'At least 6 characters',
      btn: 'Create my account',
      dejaInscrit: 'Already have an account?',
      seConnecter: 'Log in',
      roles: {
        enseignant: { label: 'Teacher', desc: 'I create and run classes' },
        aesh: { label: 'AESH', desc: 'I support students' },
        eleve: { label: 'Student', desc: 'I attend classes' },
        parent: { label: 'Parent', desc: 'I track my child\'s progress' },
      },
      codeEcole: {
        label: 'Your school code',
        info: 'Ask your school administrator for this code.',
        placeholder: 'e.g. A1B2C3D4',
      },
      emailEnfant: {
        label: 'Your child\'s email',
        info: 'Your child must already have a student account on the platform.',
        placeholder: 'my.child@example.com',
      },
      erreurs: {
        emailEnfantManquant: "Please enter your child's email address.",
        eleveIntrouvable: "No student found with this email. Your child must create their account first.",
        pasEleve: "This account is not a student account.",
        emailExistant: 'This email is already in use.',
        generique: 'An error occurred. Please try again.',
        codeManquant: "Your school code is required.",
        codeInvalide: "Invalid school code. Check the code provided by your administrator.",
      },
    },
    mdpOublie: {
      titre: 'Forgot password',
      sousTitre: 'Enter your email address and we will send you a link to reset your password.',
      email: 'Your email address',
      btn: 'Send link',
      succes: 'Email sent! Check your inbox.',
      retour: 'Back to login',
    },
    resetMdp: {
      titre: 'New password',
      sousTitre: 'Choose a new password for your account.',
      motDePasse: 'New password',
      confirmer: 'Confirm password',
      btn: 'Save',
      succes: 'Password changed! Redirecting...',
      erreurCorrespondance: 'Passwords do not match.',
    },
  },

  tr: {
    nav: {
      seConnecter: 'Giriş yap',
      commencer: 'Ücretsiz başla',
      fonctionnalites: 'Özellikler',
      roles: 'Roller',
      statistiques: 'İstatistikler',
    },
    landing: {
      badge: '🎓 Çevrimiçi eğitim platformu',
      titre1: 'Çevrimiçi eğitim,',
      titre2: 'basit ve etkili',
      sousTitre: 'Canlı dersler, etkileşimli alıştırmalar, üç aylık karneler ve veli takibi — öğretmek ve öğrenmek için ihtiyacınız olan her şey.',
      cta1: 'Ücretsiz başla',
      cta2: 'Giriş yap',
      stats: {
        direct: 'Canlı dersler',
        exercices: 'Etkileşimli alıştırmalar',
        bulletins: 'Dijital karneler',
        suivi: 'Gerçek zamanlı takip',
      },
      features: {
        titre: 'İhtiyacınız olan her şey',
        sousTitre: 'Öğretmenler, öğrenciler ve veliler için tasarlanmış bir platform.',
        items: [
          { titre: 'Canlı dersler', desc: 'Tek tıkla video oturumu başlatın. Yoklama, sohbet ve alıştırmaları gerçek zamanlı yönetin.' },
          { titre: 'Etkileşimli alıştırmalar', desc: 'Çoktan seçmeli sorular, açık sorular ve zamanlı alıştırmalar oluşturun. Öğrenciler canlı olarak yanıtlar.' },
          { titre: 'Dijital karneler', desc: 'Velilerin görebileceği profesyonel üç aylık karneler oluşturun ve yayınlayın.' },
          { titre: 'Veli alanı', desc: 'Veliler çocuklarının ilerlemesini takip eder, karneye ve devamsızlık kayıtlarına bakar.' },
          { titre: 'Kütüphane', desc: 'Belgeleri, dosyaları ve eğitim içeriklerini doğrudan sınıflarda paylaşın.' },
          { titre: 'Çoklu okul', desc: 'Her okulun kendi izole alanı vardır. Süper yönetici tüm kurumları yönetir.' },
        ],
      },
      pourQui: {
        titre: 'Kimler için?',
        roles: [
          { emoji: '👩‍🏫', titre: 'Öğretmenler', desc: 'Sınıflarınızı oluşturun, oturumlarınızı planlayın ve öğrencilerinizi net bir panelden takip edin.' },
          { emoji: '🎓', titre: 'Öğrenciler', desc: 'Canlı derslere katılın, alıştırmalara yanıt verin ve karnelerinizi birkaç tıkla görüntüleyin.' },
          { emoji: '👨‍👩‍👧', titre: 'Veliler', desc: 'Karnelere ve devamsızlık kayıtlarına özel erişimle çocuğunuzun ilerlemesinden haberdar olun.' },
        ],
      },
      cta: {
        titre: 'Derslerinizi dönüştürmeye hazır mısınız?',
        sousTitre: 'École du Savoir\'a katılın ve öğrencilerinize modern bir öğrenme deneyimi sunun.',
        btn: 'Ücretsiz hesap oluştur',
      },
      footer: 'Eğitim için ❤️ ile yapıldı',
    },
    connexion: {
      titre: 'Giriş yap',
      email: 'E-posta adresi',
      motDePasse: 'Şifre',
      mdpOublie: 'Şifremi unuttum?',
      btn: 'Giriş yap',
      pasDeCompte: 'Hesabınız yok mu?',
      inscription: 'Kayıt ol',
      erreur: 'E-posta veya şifre hatalı.',
      erreurReseau: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
    },
    inscription: {
      titre: 'Hesap oluştur',
      prenom: 'Ad',
      nom: 'Soyad',
      email: 'E-posta adresiniz',
      motDePasse: 'Şifre',
      mdpPlaceholder: 'En az 6 karakter',
      btn: 'Hesabımı oluştur',
      dejaInscrit: 'Zaten hesabınız var mı?',
      seConnecter: 'Giriş yap',
      roles: {
        enseignant: { label: 'Öğretmen', desc: 'Ders oluşturur ve yönetirim' },
        aesh: { label: 'AESH', desc: 'Öğrencilere eşlik ederim' },
        eleve: { label: 'Öğrenci', desc: 'Derslere katılırım' },
        parent: { label: 'Veli', desc: 'Çocuğumun ilerlemesini takip ederim' },
      },
      codeEcole: {
        label: 'Okul kodunuz',
        info: 'Bu kodu okul yöneticinizden isteyin.',
        placeholder: 'örn: A1B2C3D4',
      },
      emailEnfant: {
        label: 'Çocuğunuzun e-postası',
        info: 'Çocuğunuzun platformda önceden bir öğrenci hesabı olmalıdır.',
        placeholder: 'cocugum@ornek.com',
      },
      erreurs: {
        emailEnfantManquant: 'Lütfen çocuğunuzun e-posta adresini girin.',
        eleveIntrouvable: 'Bu e-posta ile öğrenci bulunamadı. Çocuğunuz önce hesabını oluşturmalıdır.',
        pasEleve: 'Bu hesap bir öğrenci hesabı değil.',
        emailExistant: 'Bu e-posta adresi zaten kullanılıyor.',
        generique: 'Bir hata oluştu. Lütfen tekrar deneyin.',
        codeManquant: 'Okul kodunuz gereklidir.',
        codeInvalide: 'Geçersiz okul kodu. Yöneticinizin verdiği kodu kontrol edin.',
      },
    },
    mdpOublie: {
      titre: 'Şifremi unuttum',
      sousTitre: 'E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.',
      email: 'E-posta adresiniz',
      btn: 'Bağlantı gönder',
      succes: 'E-posta gönderildi! Gelen kutunuzu kontrol edin.',
      retour: 'Girişe geri dön',
    },
    resetMdp: {
      titre: 'Yeni şifre',
      sousTitre: 'Hesabınız için yeni bir şifre seçin.',
      motDePasse: 'Yeni şifre',
      confirmer: 'Şifreyi onayla',
      btn: 'Kaydet',
      succes: 'Şifre değiştirildi! Yönlendiriliyor...',
      erreurCorrespondance: 'Şifreler eşleşmiyor.',
    },
  },
} satisfies Record<Lang, typeof translations.fr>
