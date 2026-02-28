# 🚀 Aide-Mémoire Complet : Création et Déploiement d'une Application Web (avec API Google)

Ce document résume tous les pièges, astuces, et procédures que nous avons rencontrés lors du développement de GPX Viewer. Il sert de "pense-bête" très précieux pour n'importe quel futur projet web (HTML/CSS/JS) qui nécessite d'interagir avec les services Google ou d'être hébergé gratuitement sur GitHub.

---

## 🧭 1. La contrainte du Développement Local (`file:///` vs `http://localhost`)

**Le problème :** 
Quand vous développez une page web simple (ex: un outil pour modifier des données GPS locales avec ExifTool), vous pouviez double-cliquer sur le fichier `.html`. L'adresse dans le navigateur commençait par `file:///C:/Users/...`.
Cependant, dès qu'une application utilise des **APIs externes sécurisées** (comme l'authentification `OAuth 2.0` de Google ou la fonction javascript `fetch()`), les navigateurs modernes bloquent la tentative pour des raisons de sécurité (politique CORS anti-vol de données).

**La solution obligatoire :**
Vous devez toujours **simuler un vrai serveur internet sur votre ordinateur**.
*   **Outil recommandé :** L'extension gratuite "Live Server" sur *Visual Studio Code*.
*   **Résultat :** Au lieu de `file:///...`, l'adresse du navigateur devient `http://127.0.0.1:5500` ou `http://localhost:5500`. À ce moment-là, Google et le navigateur acceptent de discuter avec votre code.

---

## 🔒 2. Configuration Google Cloud Console (Le Labyrinthe)

Pour utiliser `Google Drive API` ou le `Google Picker`, le processus de création de clé d'accès (API Key et Client ID) est très strict.

### A. Création et Activation
1.  Aller sur [Google Cloud Console](https://console.cloud.google.com/).
2.  Créer un projet.
3.  Menu `API et services` > `Bibliothèque` : Cherchez et activez les API dont le projet a besoin (ex: *Google Drive API*, *Google Picker API*).

### B. L'Écran de Consentement (Le plus grand piège !)
C'est ici qu'on définit ce qui sera affiché aux utilisateurs lorsqu'ils cliqueront sur "Se connecter avec Google".
1.  Aller dans `API et services` > `Écran de consentement OAuth`.
2.  **LE PIÈGE DE LA PRODUCTION (Erreur 500) :**
    Si votre application demande l'accès à des données dites "sensibles" (comme lire tout votre Google Drive avec le droit `drive.readonly`), **ne publiez jamais l'application en mode Production** sans avoir fait valider l'application par des humains de chez Google (un processus complexe nécessitant un nom de domaine acheté, des règles de confidentialité, etc.). Si vous la passez en Production sans cette validation, une **Erreur 500** bloquera indéfiniment vos utilisateurs au moment du login.
3.  **LA BONNE APPROCHE (Mode "Test") :**
    *   Allez dans l'onglet **Audience** (situé dans le menu `Écran de consentement`).
    *   Vérifiez que le statut de publication (Publishing Status) est bien sur **Testing** (En cours de test).
    *   Descendez jusqu'à la liste des **Utilisateurs tests** (Test users).
    *   **Action requise :** Ajoutez manuellement *une par une* les adresses e-mail Gmail de tous vos utilisateurs (ex: les adhérents de votre club).
    *   ⚠️ **LIMITE IMPORTANTE :** Google impose une limite stricte de **100 adresses e-mail maximum** ajoutées dans cette liste pour un projet en mode "Test". Au-delà, l'application doit obligatoirement passer en "Production" et subir la longue vérification manuelle de Google.
4.  **Conséquence du mode "Test" pour les utilisateurs :**
    La première fois qu'ils s'authentifieront, Google affichera un grand écran d'avertissement rouge disant *"Google n'a pas validé cette application"*. Ils devront cliquer sur *Paramètres avancés*, puis sur *Continuer*.

### C. La Création des Identifiants
1.  Aller dans `API et services` > `Identifiants` (Credentials).
2.  Créer une **Clé API** (*API Key*).
3.  Créer un **ID client OAuth 2.0** (Type : Application Web).
4.  **Origines JavaScript autorisées :** C'est ici que vous dites à Google depuis quelles adresses internet on a le droit de lancer notre app (sinon Erreur 403 : `redirect_uri_mismatch`).
    *   Mettez `http://localhost`
    *   Mettez `http://127.0.0.1:5500` (pour autoriser votre Live Server sur VS Code)
    *   Mettez l'URL publique une fois le site publié sur GitHub (ex: `https://votre_pseudo.github.io`). Attention : c'est l'URL racine globale (sans la fin de l'adresse du sous dossier).

---

## 🐙 3. Déploiement Gratuit sur GitHub (GitHub Pages)

Maintenant comment transformer votre dossier sur votre ordinateur en un vrai site Web public ?

### A. Envoyer le code avec GitHub Desktop
1.  Installer le logiciel *GitHub Desktop*.
2.  Faire `File` > `Add local repository` et sélectionner le dossier du projet.
3.  Cliquer sur **Publish repository**.
4.  **PIÈGE :** Décochez impérativement la case *"Keep this code private"*. Un dépôt de code gratuit doit être obligatoirement "Public" pour avoir le droit d'être hébergé en tant que site web fonctionnel via GitHub Pages.

### B. Si vous avez oublié et créé le dépôt en "Privé"
1.  Aller sur GitHub.com sur la page du projet.
2.  Cliquer sur **Settings** (la roue crantée en haut).
3.  Dans l'onglet **General** (à gauche), descendre tout en bas jusqu'à la section rouge **Danger Zone**.
4.  Chercher *Change repository visibility* et cliquer sur **Change visibility**.
5.  Choisir **Change to public** (il faudra taper le nom du dépôt pour confirmer).

### C. Activer le Site Web (Le dernier clic)
Le code est public, mais le serveur Web n'est pas encore allumé.
1.  Retourner dans les **Settings** (roue crantée) du projet sur GitHub.com.
2.  Dans le menu de gauche, cliquer sur **Pages**.
3.  Sous *Build and deployment* > *Source*, choisir **Deploy from a branch**.
4.  Sous *Branch*, sélectionner la branche principale (généralement nommée `main` ou `master`).
5.  Laisser le dossier de travail sur `/(root)` et cliquer sur **Save**.
6.  *Attendez environ 1 à 2 minutes*. GitHub fabrique l'URL de votre site. Rafraîchissez la page (`F5`) jusqu'à voir apparaître une bannière verte en haut : *"Your site is live at https://votre_pseudo.github.io/Le_Nom_Du_Dossier/"*.

🎉 **C'est gagné !** 
Vous pouvez partager cette belle adresse URL à n'importe qui, lier cette adresse de base dans la console Google Cloud (Origine JS Autorisée), et l'application fonctionnera depuis n'importe quel point du globe.
