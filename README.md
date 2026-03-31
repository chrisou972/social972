# Social972

Social972 est une PWA d'annuaire social pour la Martinique. Elle regroupe les structures utiles par categorie et par public, avec telephone, email quand il existe, coordonnees GPS, favoris locaux, mode jour/nuit et un acces rapide a l'itineraire.

## Ce que fait la premiere version

- Synchronise 139 fiches officielles depuis l'annuaire Service-Public.
- Classe les structures par categories utiles: CCAS, France services, Point-justice, Mission locale, PMI, MDPH, CAF, CPAM, Cap emploi, aides aux victimes, seniors, aidants, etc.
- Propose un filtrage par categorie, public et commune.
- Permet d'enregistrer ses favoris dans le navigateur.
- Fonctionne comme PWA avec installation possible et cache hors ligne partiel.
- Ajoute un mini captcha social a l'entree du site.
- Ajoute des metadonnees SEO, Open Graph, robots.txt, sitemap.xml et image de partage.
- Permet de proposer une structure ou signaler une correction via des formulaires GitHub pre-remplis.
- Prevoit une verification hebdomadaire automatique via GitHub Actions.

## Source des donnees

Les fiches sont generees par `scripts/build-directory.mjs` a partir de l'annuaire officiel Service-Public pour la Martinique. Le script recupere:

- le nom de la structure
- la categorie
- l'adresse
- le telephone
- l'email quand il existe
- les horaires quand ils sont publies
- les coordonnees GPS presentes dans les microdonnees officielles

Les fichiers produits sont:

- `src/data/structures.generated.json`
- `src/data/metadata.generated.json`
- `reports/directory-health.md`

## Lancer le projet

```bash
npm install
npm run icons:build
npm run data:sync
npm run dev
```

## Scripts utiles

- `npm run dev` : demarre l'application en local
- `npm run build` : build production Vite
- `npm run icons:build` : regenere les icones PWA
- `npm run data:sync` : resynchronise les fiches officielles
- `npm run data:check` : controle reseau et rapport sans reecrire le dataset

## Hebergement gratuit

Le depot contient deja un workflow GitHub Pages dans `.github/workflows/deploy.yml`. Une fois le depot pousse sur GitHub, tu peux activer Pages sur le workflow Actions pour publier gratuitement le site.

## Routine hebdomadaire

Le workflow `.github/workflows/weekly-directory-refresh.yml` relance chaque semaine:

1. la regeneration des icones
2. la synchronisation des donnees officielles
3. le build de controle
4. un commit automatique si le dataset a change

## Contribution sans backend

Le site ouvre directement des formulaires GitHub Issues pour:

- proposer une nouvelle structure
- signaler une correction sur une fiche existante

Les templates sont dans `.github/ISSUE_TEMPLATE/`.

## Note captcha

Le captcha present dans cette version est volontairement simple et thematique. Pour une protection anti-bot solide en production, il faudra le remplacer par Cloudflare Turnstile ou hCaptcha.
