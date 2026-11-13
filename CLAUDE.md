# CLAUDE.md — Rituel

## Informations du projet (vérifiées dans le dépôt)
- **Nom** : Rituel (rituels quotidiens, tâches, notes, rappels)
- **Stack** : un seul fichier `index.html` (vanilla JS/CSS, police intégrée) empaqueté par Capacitor 7 (`@capacitor/app`, `haptics`, `local-notifications`, `status-bar`). Pas de dossier `android/` versionné : il est régénéré à chaque build.
- **applicationId** : `be.brun.rituel` (`capacitor.config.json`)
- **Workflow** : `.github/workflows/build.yml`. Il se lance à chaque push sur `main` ou à la main (`workflow_dispatch`). Il produit un APK debug, vérifie sa signature et le publie dans la release `latest` (asset `Rituel.apk`).
- **Signature** : keystore fixe `rituel.keystore` à la racine du dépôt, injectée dans `android/app/build.gradle` par le workflow (signingConfig `rituel` sur le buildType debug). L'empreinte SHA-256 est vérifiée après la compilation.
- **Versions** :
  - `versionCode` est automatique et vaut `epoch / 60` (minutes) ;
  - `versionName` vaut `4.5.<run_number>` ;
  - la version affichée dans l'app (`index.html`, pied des Réglages) et `package.json` sont en **6.0**.
- **Données locales** : `localStorage`, clé unique `rituel.v1` → `{items, log, notes, settings, routines, run}` (anciens rituels conservés dans `items`, convertis en routine par `migrate()`) (fonctions `load()` et `save()` dans `index.html`). Il n'y a ni export/import ni versionnage du schéma.
- **Widget écran d'accueil** : code natif dans `native/` (Java + res), copié par l'étape « Widget écran d'accueil » du workflow (remplace `MainActivity.java`, ajoute receiver + provider au manifeste). L'app dessine le widget en canvas (`wDraw`, 20 styles) et l'envoie via le plugin `RituelWidget` ; réglages dans `S.settings.widget`.
- **Appareil cible** : Xiaomi 17T Pro (encoche/caméra, zones sûres, `StatusBar.overlaysWebView: true`).

## Collaboration
- Je décris les fonctionnalités en français. Tu prends en charge le technique et réponds brièvement en français.
- Comprends la demande et les fichiers concernés. Ne relis pas tout le dépôt à chaque tâche (`index.html` est volumineux : cherche par `grep` et lis des plages ciblées).
- Fais des modifications ciblées et réutilise les composants existants. Pas de sous-agents ni d'opérations coûteuses sans bénéfice clair.
- Pour une décision importante ou ambiguë, propose brièvement une solution et demande confirmation.

## Sécurité des mises à jour Android
- Ne change **jamais** sans mon accord explicite : `applicationId`, `rituel.keystore`, l'alias ou les mots de passe, l'étape de signature du workflow, ni la clé `localStorage` `rituel.v1`.
- Vérifie la signature existante avant toute mise à jour. N'invente pas de nouvelle clé : signale le problème.
- `versionCode` doit toujours augmenter. Ne modifie pas sa formule sans accord.
- Préserve les données locales. Toute évolution de la structure de `S` doit rester rétrocompatible avec `load()` : valeurs par défaut pour les nouveaux champs, jamais de suppression de données existantes. Ajoute une migration si nécessaire.
- Ne désinstalle jamais l'app pour résoudre un problème de signature.
- Ne publie aucun nouveau secret (keystore, mots de passe, jetons) dans le dépôt, les logs ou les réponses ; utilise les secrets GitHub Actions. Note : la keystore actuelle et son mot de passe sont déjà dans le dépôt et le workflow. Ne les déplace qu'avec mon accord (le dépôt doit rester privé).

## GitHub et compilation
- Respecte le workflow existant. Ne le modifie pas sans nécessité expliquée.
- **Avant tout commit/push : résume les fichiers modifiés et demande mon autorisation explicite.** Un push sur `main` déclenche une compilation et republie la release `latest`.
- Vérifie ce qui est pertinent (syntaxe JS, rendu via Playwright si utile). En cas d'échec de compilation, analyse les lignes d'erreur et corrige la cause. Ne relance pas en boucle.
- Ne supprime ni historique Git, ni branche, ni données sans mon accord.

## Livraison de l'APK
- Après une compilation réussie, vérifie que le run est vert et que l'asset existe, puis donne en premier :
  **Télécharger l'APK : https://github.com/bralexandre1006-jpg/Rituel/releases/download/latest/Rituel.apk**
- Ensuite : la version (`versionName`) et un bref résumé.
- Si la release n'est pas disponible, donne le lien précis de l'artifact du run (archive ZIP, connexion GitHub requise). Ne fabrique jamais d'URL.
- Ne crée pas d'autre release et ne publie rien sans autorisation.

## Design et UX
- Interface cohérente, soignée, moderne, accessible et fluide, optimisée pour le Xiaomi 17T Pro (zones sûres, caméra).
- Respecte la direction artistique existante : noir et blanc, police Manrope, icônes SVG `IC`, sons, vibrations, toasts d'annulation, animations.
- Soigne la typographie, les espacements, les états vides et d'erreur, la navigation et les animations raisonnables.
- Ne refonds pas des écrans non concernés. Demande des références si une refonte majeure est ambiguë.

## Économie de quota
- Lis uniquement les fichiers utiles. Ne relis pas un fichier inchangé.
- Regroupe les modifications liées. Pas de refactorisation ni de fichiers inutiles.
- Pas de compilations multiples, d'agents parallèles ou de recherches externes sans raison.
- Ne sacrifie jamais le design, les animations, l'UX ou les fonctionnalités pour économiser des tokens.
- Ne supprime ni ne modifie aucune fonctionnalité existante sans demande explicite.
- Comptes rendus concis en français.
