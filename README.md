# GPX Viewer

Application web permettant d'afficher et de comparer des traces GPX sur une carte Leaflet, avec prise en charge d'un chargement de fichiers multiples.

## Installation

1. Ouvrez une invite de commande ou le terminal.
2. Démarrez un serveur web local depuis le dossier `GPX_Viewer`. Par exemple : `python -m http.server 8000` (si Python est installé) ou `npx serve` ou l'extension Live Server sous VSCode.
3. Renseignez l'URL locale dans votre navigateur : `http://localhost:8000`.

## Fonctionnalités

*   Fonds de carte multiples : TopoRando (défaut), OpenStreetMap, World Imagery (Satellite).
*   Structure prête pour lire les fichiers locaux `.gpx` simultanément.
*   Panneau récapitulatif avec compteur, et espaces pour distance et dénivelé total.

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
