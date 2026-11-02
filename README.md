# GPX Viewer

**Version actuelle : 1.4.0** (novembre 2026) – voir l'[historique des versions](#historique-des-versions).

Application web permettant d'afficher et de comparer des traces **GPX, FIT et TRK** sur une carte interactive, avec chargement de plusieurs fichiers ou d'un dossier entier, depuis votre ordinateur ou votre Google Drive.

👉 **Accès en ligne direct (recommandé) : [https://tresorier21000.github.io/GPX_Viewer/](https://tresorier21000.github.io/GPX_Viewer/)**  
*(Rien à installer : fonctionne directement dans n'importe quel navigateur web moderne sur ordinateur, tablette ou smartphone, avec accès complet à Google Drive).*

---

## Nouveautés de la version 1.4.0

*   **Trois formats de traces** : en plus du `.gpx`, l'application lit les fichiers `.fit` (Garmin, Wahoo…) et `.trk` (TwoNav, CompeGPS…). Chaque trace affiche un badge indiquant son format.
*   **Choix du type de fichier** : un sélecteur en haut de la barre latérale (GPX par défaut, FIT, TRK ou Tous) filtre les fichiers proposés et chargés, en local comme sur Google Drive.
*   **Ouverture d'un dossier local** : le bouton « Ouvrir un dossier local » liste les traces du type choisi contenues dans un dossier (sous-dossiers compris) pour choisir celles à afficher.
*   **Glisser-déposer** : déposez vos fichiers directement sur la page.
*   **Nouvel explorateur Google Drive** intégré à l'application, qui remplace la fenêtre Google :
    *   onglet **Tous mes parcours** : liste de vos traces avec une colonne **Dossier**, la date, une recherche et un tri par colonne ;
    *   onglet **Mes dossiers** : uniquement les dossiers qui contiennent des traces, **par ordre alphabétique**, avec un bouton « Tout ouvrir » ;
    *   sélecteur de type de fichier et bouton « Actualiser » directement dans la fenêtre.
*   **Onglet « Importer » supprimé** : il servait à envoyer des fichiers vers Drive, ce qui n'est pas possible avec un accès en lecture seule (utilisez « Ouvrir fichier(s) local »).

---

## Deux façons d'utiliser GPX Viewer

1. **Version en ligne (recommandée) : [https://tresorier21000.github.io/GPX_Viewer/](https://tresorier21000.github.io/GPX_Viewer/)**
   * Accès complet à toutes les fonctionnalités : fichiers locaux ET ouverture directe depuis votre Google Drive.
   * Toujours à jour sans aucune installation.

2. **Version installable Windows (`Setup_GPX_Viewer_v1.4.0.exe`)**
   * Idéale pour travailler hors-ligne avec vos traces `.gpx`, `.fit` ou `.trk` stockées sur votre ordinateur via les boutons **« Ouvrir fichier(s) local »** et **« Ouvrir un dossier local »**.
   * *Remarque Google Drive :* Pour des raisons de sécurité imposées par Google, l'authentification Google Drive est strictement interdite sur les fichiers ouverts en local (`file://`). Si vous cliquez sur « Ouvrir depuis Google Drive » depuis la version installée, l'application vous proposera d'ouvrir en un clic la version en ligne officielle pour accéder à votre Drive.

---

## Fonctionnalités principales

*   **Fonds de carte multiples** : Carte Randonnée Topo (OpenTopoMap par défaut), Plan routier (OpenStreetMap) et Vue Satellite (Esri World Imagery).
*   **Formats GPX, FIT et TRK** : ouvrez vos traces quel que soit le GPS ou l'application qui les a produites, en choisissant le type de fichier voulu.
*   **Comparaison de traces multiples** : Visualisez simultanément plusieurs traces avec une couleur distincte par parcours (jusqu'à 10 traces recommandées pour une lisibilité optimale).
*   **Statistiques globales cumulées** : Calcul automatique de la distance totale et du dénivelé positif cumulé (D+) de l'ensemble des parcours affichés.
*   **Profil altimétrique interactif** : Cliquez sur n'importe quelle trace sur la carte pour afficher sa courbe de dénivelé en bas de l'écran. En passant la souris sur le profil, un marqueur curseur se déplace en direct sur la trace géographique.
*   **Sens du parcours** : des flèches directionnelles indiquent le sens d'avancement tout au long de chaque tracé.
*   **Recentrage automatique** : La carte ajuste automatiquement son cadrage pour englober toutes vos traces actives.
*   **Nettoyage rapide** : Supprimez une trace individuelle via sa corbeille ou utilisez « Tout effacer » pour réinitialiser la carte.

---

## Comment charger vos traces ?

Choisissez d'abord le type de fichier, puis l'un des deux modes de chargement :

### 0. Choisir le type de fichier
* En haut de la barre latérale, sélectionnez le format à ouvrir : **GPX** (par défaut), **FIT** (Garmin, Wahoo…), **TRK** (TwoNav, CompeGPS…) ou **Tous**. Seuls les fichiers de ce type sont proposés et chargés, en local comme sur Google Drive.

### 1. Fichiers locaux (Accès libre et immédiat)
* Cliquez sur **« Ouvrir fichier(s) local »** ou glissez-déposez vos fichiers directement sur la page.
* Cliquez sur **« Ouvrir un dossier local »** pour choisir un dossier dans une fenêtre. *(La fenêtre Windows de choix de dossier n'affiche que les sous-dossiers, jamais les fichiers : c'est normal, cliquez simplement sur « Importer ».)* Une fenêtre de l'application liste alors les traces du dossier (sous-dossiers compris), avec leur nombre, une recherche et un tri : cochez celles à afficher. Pour un dossier de 20 traces au plus, tout est déjà coché.
* **Aucun compte requis** : fonctionne instantanément pour tout le monde, sans inscription, sans compte Google et sans aucune configuration. Vos fichiers sont lus à 100 % localement dans votre navigateur et ne sont envoyés à aucun serveur externe.

### 2. Depuis Google Drive (Accès sur autorisation, en ligne)
* Cliquez sur **« Ouvrir depuis Google Drive »** pour sélectionner vos traces stockées sur votre espace Cloud personnel.
* Une fenêtre intégrée à l'application s'ouvre avec deux onglets :
  * **Tous mes parcours** : la liste de vos traces avec leur **dossier** et leur date, une recherche et un tri par colonne. Cochez les traces voulues (**Maj + clic** pour cocher toute une plage, case en haut de colonne pour tout cocher quand la liste affichée compte 20 parcours au plus) puis cliquez sur « Afficher la sélection ».
  * **Mes dossiers** : uniquement les dossiers qui contiennent des traces du type choisi, **par ordre alphabétique**. Cliquez sur un dossier pour voir son contenu, ou sur « Tout ouvrir » pour afficher toutes ses traces.
* Le bouton « Actualiser » relit votre Drive si vous venez d'y ajouter des fichiers.
* **Disponible sur la version en ligne** ([https://tresorier21000.github.io/GPX_Viewer/](https://tresorier21000.github.io/GPX_Viewer/)).
* **Demande d'autorisation préalable (Phase de test) :**  
  L'application étant actuellement en phase de test de sécurité auprès de Google, l'accès à Google Drive est réservé aux personnes déclarées dans la liste des **utilisateurs tests**.
* **Comment devenir testeur ?**  
  Il vous suffit d'envoyer votre adresse Gmail au développeur à : [yves.balestra@gmail.com](mailto:yves.balestra@gmail.com?subject=Demande%20acc%C3%A8s%20GPX%20Viewer) *(le lien « Demander l'autorisation au développeur » en bas à gauche de l'application prépare ce message automatiquement)*. Une fois votre adresse ajoutée, l'accès à votre Drive est débloqué !
* **Première connexion :** Google affichera un écran d'avertissement standard de mode test. Cliquez simplement sur *Paramètres avancés*, puis sur *Continuer*.

---

## Connexion Google Drive : durée de session

Pour des raisons de sécurité imposées par Google, chaque autorisation dure environ 1 heure :
* **Renouvellement automatique** : Si votre session expire après une longue période d'inactivité, l'application redemande automatiquement un jeton au clic suivant, sans que vous ayez à recharger la page.
* **Confidentialité totale** : L'accès à votre Drive est en **lecture seule**. L'application lit la liste de vos fichiers de traces et de vos dossiers (pour les afficher dans l'explorateur) et le contenu des traces que vous ouvrez, directement dans votre navigateur. Elle ne peut ni modifier ni supprimer vos données, et rien n'est envoyé à un autre serveur.

---

## Documentation

*   [Guides/Guide_Adherent_GPX_Viewer.docx](Guides/Guide_Adherent_GPX_Viewer.docx) : guide complet pour les utilisateurs et adhérents (accès, connexion Google Drive, utilisation pas à pas et résolution des problèmes fréquents).

---

## Historique des versions

| Version | Date | Changements |
|---|---|---|
| **1.4.0** | Novembre 2026 | Prise en charge des formats `.fit` (Garmin, Wahoo) et `.trk` (TwoNav, CompeGPS) ; choix du type de fichier à ouvrir (GPX par défaut, FIT, TRK ou Tous) ; ouverture d'un dossier local complet ; glisser-déposer ; nouvel explorateur Google Drive intégré (remplace la fenêtre Google Picker) : colonne « Dossier », recherche, tri, dossiers contenant des traces seulement et par ordre alphabétique, bouton « Tout ouvrir » ; suppression de l'onglet « Importer » (non fonctionnel en lecture seule) ; génération de l'installateur `Setup_GPX_Viewer_v1.4.0.exe`. |
| 1.3.1 | Novembre 2026 | Ajout des flèches directionnelles sur les traces affichées avec le plug-in Leaflet PolylineDecorator ; génération de l'installateur Windows `Setup_GPX_Viewer_v1.3.1.exe`. |
| **1.3.0** | Novembre 2026 | Détection automatique du protocole local `file://` avec proposition de bascule en un clic vers la version en ligne pour Google Drive ; ajout d'un raccourci web dans le menu Démarrer de l'installateur Windows (`setup.iss`) ; clarification dans la documentation. |
| **1.2.0** | Octobre 2026 | Fermeture et nettoyage automatique du profil altimétrique lors de la suppression d'une trace ou lors du clic sur « Tout effacer » ; ajout du script Inno Setup (`setup.iss`) et génération de l'installateur Windows `Setup_GPX_Viewer_v1.2.0.exe` ; sécurisation de la clé API Google (référents HTTP et restrictions d'API). |
| **1.1.0** | Octobre 2026 | Gestion de l'expiration du jeton Google (≈ 1 h) avec renouvellement automatique ; messages d'erreur clairs (accès refusé, pop-up bloquée, session expirée) ; restauration du logo `favicon.png` ; guides adhérent et développeur. |
| 1.0.0 | Février 2026 | Première version : traces GPX multiples (local et Google Drive), statistiques, profil altimétrique, fonds de carte. |

