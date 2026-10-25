# GPX Viewer

**Version actuelle : 1.2.0** (octobre 2026) – voir l'[historique des versions](#historique-des-versions).

Application web permettant d'afficher et de comparer des traces GPX sur une carte Leaflet, avec prise en charge d'un chargement de fichiers multiples.

## Installation

1. Ouvrez une invite de commande ou le terminal.
2. Démarrez un serveur web local depuis le dossier `GPX_Viewer`. Par exemple : `python -m http.server 8000` (si Python est installé) ou `npx serve` ou l'extension Live Server sous VSCode.
3. Renseignez l'URL locale dans votre navigateur : `http://localhost:8000`.

## Fonctionnalités

*   Fonds de carte multiples : TopoRando (défaut), OpenStreetMap, World Imagery (Satellite).
*   Structure prête pour lire les fichiers locaux `.gpx` simultanément.
*   Panneau récapitulatif avec compteur, et cumuls globaux pour la distance et le dénivelé positif.
*   **Profil altimétrique interactif** : Cliquez sur une trace pour afficher son graphique d'élévation précis. Au survol de la courbe avec la souris, un curseur mobile s'affiche simultanément sur la carte pour vous situer géographiquement.
*   **Centrage automatique** : La carte recalibre automatiquement son zoom pour englober toutes vos traces actives de manière fluide (anti-rebond).
*   **Nettoyage rapide** : Un bouton "Tout effacer" permet de vider le tableau et la carte en un clic.

> 💡 **Conseil d'utilisation :** Il n'y a pas de limite technique bloquante, mais pour garder une lecture de carte optimale et s'assurer que les couleurs des traces restent bien distinctes (10 couleurs différentes générées), il est recommandé de comparer un **maximum de 10 traces simultanément**.

## Configuration Google Drive API (Prévisionnel)

Si vous souhaitez héberger cette application et activer le bouton **Google Drive** pour que vos utilisateurs y accèdent :

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/).
2. Créez un nouveau projet.
3. Allez dans *APIs & Services > Library* et activez **Google Drive API** et **Google Picker API**.
4. Allez dans *APIs & Services > Credentials* (Identifiants).
5. Créez une **clé API** (*API key*). Conservez-la.
6. Créez des **identifiants OAuth 2.0 Client ID**. (Type: Web Application). Ajoutez l'URL de votre site (ou origin `http://localhost` pour le développement) dans **Authorized JavaScript origins**.
7. Prenez ce **Client ID** et l'**API Key**, et définissez-les plus tard dans le script `app.js` de cette application.

> **⚠️ Note Importante : Validation Publique vs Test**
> L'API Google Drive nécessitant le droit de lecture (`drive.readonly`), l'application a besoin d'une validation humaine par Google si vous la passez en mode "Production" (Publiée). Si vous ne la faites pas vérifier, vous obtiendrez une **erreur serveur (Statut 500)** au moment de vous connecter.
> 
> L'état de votre application est visible depuis : `Google Cloud Console` > `API et services` > `Oauth consent screen` (Écrans de consentement) > **Onglet "Audience"**.
> 
> **Pour un usage personnel ou en petit club :**
> Laissez toujours le statut de publication sur **"Testing"** (En cours de test) depuis ce menu. 
> Assurez-vous simplement que les emails Google des utilisateurs autorisés de votre club sont bien ajoutés dans la liste des **Test users** au même endroit. Vos utilisateurs auront un écran d'avertissement ("Google n'a pas validé cette application"), qu'ils devront contourner via *Paramètres avancés > Continuer*. Cela ne leur sera demandé qu'une seule fois.

## Connexion Google Drive : gestion du jeton d'accès

Le bouton **Google Drive** utilise un **jeton d'accès** fourni par Google (Google Identity Services). Ce jeton n'est valable qu'**environ 1 heure**.

*   **Expiration gérée automatiquement** (depuis la **v1.1.0**, octobre 2026) : l'application mémorise l'heure d'expiration du jeton (avec 60 s de marge). Au clic suivant sur le bouton, un jeton expiré est redemandé automatiquement, sans recharger la page.
*   **Premier clic** : écran de consentement complet (`prompt: 'consent'`). **Renouvellements** : demande rapide (`prompt: ''`), une fenêtre Google peut s'ouvrir brièvement.
*   **Erreur 401 au téléchargement d'un fichier** : le jeton est oublié et l'utilisateur est invité à recliquer pour se reconnecter.
*   **Messages d'erreur explicites** au lieu d'un clic sans effet :
    *   accès refusé (`access_denied`) : bouton « Annuler » ou adresse Gmail absente des *Test users* ;
    *   fenêtre de connexion bloquée par le navigateur (`popup_failed_to_open`) : autoriser les pop-ups pour le site ;
    *   fenêtre fermée par l'utilisateur (`popup_closed`) : aucune alerte.

> 💡 Avant cette correction, une page restée ouverte plus d'une heure réutilisait un jeton expiré : le bouton Drive semblait ne plus fonctionner jusqu'au rechargement de la page (F5).

## Documentation

*   [Guides/Guide_Adherent_GPX_Viewer.docx](Guides/Guide_Adherent_GPX_Viewer.docx) : guide pour les adhérents (accès, connexion, utilisation, problèmes fréquents).
*   [AIDE_MEMOIRE_DEPLOIEMENT.md](AIDE_MEMOIRE_DEPLOIEMENT.md) : pièges et astuces de déploiement.

## Historique des versions

| Version | Date | Changements |
|---|---|---|
| **1.2.0** | Octobre 2026 | Fermeture et nettoyage automatique du profil altimétrique lors de la suppression d'une trace ou lors du clic sur « Tout effacer » ; ajout du script Inno Setup (`setup.iss`) et génération de l'installateur Windows `Setup_GPX_Viewer_v1.2.0.exe` ; sécurisation de la clé API Google (référents HTTP et restrictions d'API). |
| **1.1.0** | Octobre 2026 | Gestion de l'expiration du jeton Google (≈ 1 h) avec renouvellement automatique ; messages d'erreur clairs (accès refusé, pop-up bloquée, session expirée) ; restauration du logo `favicon.png` ; guides adhérent et développeur. |
| 1.0.0 | Février 2026 | Première version : traces GPX multiples (local et Google Drive), statistiques, profil altimétrique, fonds de carte. |

> Lors d'une nouvelle version, mettre à jour : le numéro affiché en bas de `index.html`, le paramètre `?v=` de `app.js` / `style.css` dans `index.html` (si ces fichiers ont changé), ce README et les guides.

