# GPX Viewer

**Version actuelle : 1.2.0** (octobre 2026) – voir l'[historique des versions](#historique-des-versions).

Application web permettant d'afficher et de comparer des traces GPX sur une carte interactive, avec prise en charge d'un chargement de fichiers multiples.

👉 **Accès en ligne direct : [https://tresorier21000.github.io/GPX_Viewer/](https://tresorier21000.github.io/GPX_Viewer/)**  
*(Rien à installer : fonctionne directement dans n'importe quel navigateur web moderne sur ordinateur, tablette ou smartphone).*

---

## Fonctionnalités principales

*   **Fonds de carte multiples** : Carte Randonnée Topo (OpenTopoMap par défaut), Plan routier (OpenStreetMap) et Vue Satellite (Esri World Imagery).
*   **Comparaison de traces multiples** : Visualisez simultanément plusieurs traces avec une couleur distincte par parcours (jusqu'à 10 traces recommandées pour une lisibilité optimale).
*   **Statistiques globales cumulées** : Calcul automatique de la distance totale et du dénivelé positif cumulé (D+) de l'ensemble des parcours affichés.
*   **Profil altimétrique interactif** : Cliquez sur n'importe quelle trace sur la carte pour afficher sa courbe de dénivelé en bas de l'écran. En passant la souris sur le profil, un marqueur curseur se déplace en direct sur la trace géographique.
*   **Recentrage automatique** : La carte ajuste automatiquement son cadrage pour englober toutes vos traces actives.
*   **Nettoyage rapide** : Supprimez une trace individuelle via sa corbeille ou utilisez « Tout effacer » pour réinitialiser la carte.

---

## Comment charger vos traces ?

Deux modes de chargement sont à votre disposition :

### 1. Fichiers locaux (Accès libre et immédiat)
* Cliquez sur **« Ouvrir fichier local »** ou glissez-déposez vos fichiers `.gpx` directement sur la page.
* **Aucun compte requis** : fonctionne instantanément pour tout le monde, sans inscription, sans compte Google et sans aucune configuration. Vos fichiers sont lus à 100 % localement dans votre navigateur et ne sont envoyés à aucun serveur externe.

### 2. Depuis Google Drive (Accès sur autorisation)
* Cliquez sur **« Ouvrir depuis Google Drive »** pour sélectionner vos traces stockées sur votre espace Cloud personnel.
* **Demande d'autorisation préalable (Phase de test) :**  
  L'application étant actuellement en phase de test de sécurité auprès de Google, l'accès à Google Drive est réservé aux personnes déclarées dans la liste des **utilisateurs tests**.
* **Comment devenir testeur ?**  
  Il vous suffit d'envoyer votre adresse Gmail au développeur à : [yves.balestra@gmail.com](mailto:yves.balestra@gmail.com?subject=Demande%20acc%C3%A8s%20GPX%20Viewer) *(le lien « Demander l'autorisation au développeur » en bas à gauche de l'application prépare ce message automatiquement)*. Une fois votre adresse ajoutée, l'accès à votre Drive est débloqué !
* **Première connexion :** Google affichera un écran d'avertissement standard de mode test. Cliquez simplement sur *Paramètres avancés*, puis sur *Continuer*.

---

## Connexion Google Drive : durée de session

Pour des raisons de sécurité imposées par Google, chaque autorisation dure environ 1 heure :
* **Renouvellement automatique** : Si votre session expire après une longue période d'inactivité, l'application redemande automatiquement un jeton au clic suivant, sans que vous ayez à recharger la page.
* **Confidentialité totale** : L'application n'a accès qu'à la lecture des fichiers que vous sélectionnez vous-même dans la fenêtre Google Drive. Elle ne peut ni modifier ni supprimer vos données.

---

## Documentation

*   [Guides/Guide_Adherent_GPX_Viewer.docx](Guides/Guide_Adherent_GPX_Viewer.docx) : guide complet pour les utilisateurs et adhérents (accès, connexion Google Drive, utilisation pas à pas et résolution des problèmes fréquents).
*   [AIDE_MEMOIRE_DEPLOIEMENT.md](AIDE_MEMOIRE_DEPLOIEMENT.md) : pense-bête technique pour le déploiement et l'hébergement GitHub Pages.

---

## Historique des versions

| Version | Date | Changements |
|---|---|---|
| **1.2.0** | Octobre 2026 | Fermeture et nettoyage automatique du profil altimétrique lors de la suppression d'une trace ou lors du clic sur « Tout effacer » ; ajout du script Inno Setup (`setup.iss`) et génération de l'installateur Windows `Setup_GPX_Viewer_v1.2.0.exe` ; sécurisation de la clé API Google (référents HTTP et restrictions d'API). |
| **1.1.0** | Octobre 2026 | Gestion de l'expiration du jeton Google (≈ 1 h) avec renouvellement automatique ; messages d'erreur clairs (accès refusé, pop-up bloquée, session expirée) ; restauration du logo `favicon.png` ; guides adhérent et développeur. |
| 1.0.0 | Février 2026 | Première version : traces GPX multiples (local et Google Drive), statistiques, profil altimétrique, fonds de carte. |
