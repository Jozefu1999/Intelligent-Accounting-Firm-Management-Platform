# Analyse du Projet — Plateforme Intelligente d'Expertise Comptable

> Comparaison entre le **Cahier de Charge** et l'**état actuel de l'implémentation**

---

## Cahier de Charge — Résumé

| Élément | Détail |
|---|---|
| **Sujet** | Plateforme intelligente de gestion et d'aide à la décision pour un cabinet d'expertise comptable |
| **Problématique** | Gestion actuelle via Excel/papier/email — pas de centralisation, pas d'IA |
| **Solution** | Application web centralisant la gestion clients/projets avec IA et ML |

### Modules demandés

| Module | Fonctionnalités |
|---|---|
| **Gestion** | Clients, Projets, Documents, Dashboard |
| **Intelligence Artificielle** | Génération de business plans, Recommandations, Analyse des projets |
| **Machine Learning** | Prédiction du niveau de risque, Classification des projets |

### Stack technique demandée

| Couche | Technologies |
|---|---|
| Frontend | Angular ou React, HTML, CSS, JavaScript |
| Backend | Node.js (Express) ou Spring Boot |
| Base de données | MySQL ou PostgreSQL |
| IA | LLM API, Python, **LangChain** |
| ML | Python, Scikit-learn, Pandas, NumPy |
| Outils | REST API, Git, GitHub, Postman |

---

## ✅ Fonctionnalités IMPLÉMENTÉES

### 1. Module de Gestion

#### Gestion des Clients
- [x] Création, lecture, modification, suppression (CRUD complet)
- [x] Champs : raison sociale, SIRET, adresse, ville, téléphone, email, contact, CA annuel, secteur, notes
- [x] Niveaux de risque (low / medium / high)
- [x] Statuts client (active / inactive / prospect)
- [x] Affectation d'un expert comptable (`assigned_expert_id`)
- [x] Filtrage par expert (les assistants ne voient que leurs clients assignés)

#### Gestion des Projets
- [x] CRUD complet
- [x] Types : création, développement, audit, conseil, autre
- [x] Statuts : brouillon, en cours, terminé, annulé
- [x] Priorités : faible / moyen / élevé
- [x] Score de risque, budget estimé, dates de début et d'échéance
- [x] Lien avec le client et les documents

#### Gestion des Documents
- [x] Upload de fichiers (PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, PNG, JPG/JPEG)
- [x] Limite : 10 Mo par fichier
- [x] Catégories : financier, légal, administratif, rapport, autre
- [x] Téléchargement avec contrôle d'accès
- [x] Suppression
- [x] Association à un client et/ou un projet

#### Dashboard
- [x] Dashboard Expert : clients récents, projets récents, statistiques (statut, risque)
- [x] Dashboard Assistant : projets assignés, documents uploadés
- [x] Dashboard Admin : tous les utilisateurs, toutes les statistiques, activités récentes
- [x] Dashboard Client : projets du client, contact support

---

### 2. Module Intelligence Artificielle

#### Génération de Business Plans
- [x] Génération via LLM (Google Gemini `gemini-2.0-flash-lite` ou xAI Grok en fallback)
- [x] Sections : résumé exécutif, analyse de marché, projections financières, risques, recommandations
- [x] Lien avec un projet existant
- [x] Persistance en base de données (`AiBusinessPlan`)
- [x] Interface dédiée dans l'espace expert

#### Recommandations IA
- [x] Génération de 4 recommandations actionnables par client
- [x] Niveaux de priorité : haute / moyenne / faible
- [x] Interface dédiée dans l'espace expert

#### Prédiction de Risque (ML bridgé vers IA)
- [x] Prédiction via modèle ML (RandomForest)
- [x] Sorties : niveau de risque + score + distribution des probabilités
- [x] Interface dédiée dans l'espace expert (`/expert/ai-tools/risk-prediction`)

---

### 3. Module Machine Learning

#### Modèle de prédiction de risque
- [x] Algorithme : RandomForestClassifier (100 arbres)
- [x] Features : `annual_revenue`, `estimated_budget`, `sector_code`
- [x] 3 classes : faible (0), moyen (1), élevé (2)
- [x] Script d'entraînement (`train_risk_model.py`) avec 500 échantillons synthétiques
- [x] Script de prédiction (`predict.py`) appelé en subprocess Node.js
- [x] Modèle sauvegardé (`models/risk_model.pkl`)
- [x] Intégration backend via `child_process.spawn`

---

### 4. Authentification & Autorisation

- [x] Inscription / Connexion avec JWT (expiration 24h)
- [x] 4 rôles : `expert_comptable`, `assistant`, `administrateur`, `visiteur` (client)
- [x] Guards Angular : `AuthGuard`, `GuestGuard`, `ExpertGuard`, `AssistantGuard`, `AdminGuard`, `ClientGuard`
- [x] Middleware d'autorisation backend par rôle
- [x] Mise à jour profil (nom, email, mot de passe)
- [x] Normalisation des rôles (aliases : `admin`, `expert`, `client`)

---

### 5. Administration

- [x] Liste de tous les utilisateurs avec pagination
- [x] Modification de rôle d'un utilisateur
- [x] Suppression d'utilisateur (avec protection contre l'auto-suppression)
- [x] Statistiques globales (utilisateurs, clients, projets, risques)
- [x] Activité récente du système
- [x] Page de gestion des modèles ML (`/admin/ml`)
- [x] Page de statistiques avancées (`/admin/statistics`)

---

### 6. Contact / Support

- [x] Formulaire de contact avec sujet, message, projet optionnel
- [x] Statuts : envoyé, lu, répondu
- [x] Vue des messages envoyés par l'utilisateur
- [x] Interface dédiée dans l'espace client

---

### 7. Interface & UX

- [x] 4 layouts distincts selon le rôle (Expert, Assistant, Admin, Client)
- [x] Sidebar de navigation par rôle
- [x] Frontend Angular avec Tailwind CSS
- [x] Proxy de développement configuré (`proxy.conf.json`)
- [x] Intercepteur HTTP pour l'ajout automatique du token JWT

---

### 8. Stack technique utilisée

| Couche | Technologie | Statut |
|---|---|---|
| Frontend | Angular + Tailwind CSS | ✅ Conforme |
| Backend | Node.js + Express | ✅ Conforme |
| Base de données | MySQL/PostgreSQL (Sequelize ORM) | ✅ Conforme |
| LLM API | Google Gemini + xAI Grok (fallback) | ✅ Conforme |
| ML | Python + Scikit-learn + NumPy | ✅ Conforme |
| ORM/DB Schema | Sequelize + `schema.sql` | ✅ |
| Auth | JWT (jsonwebtoken + bcrypt) | ✅ |

---

## ❌ Fonctionnalités MANQUANTES ou INCOMPLÈTES

### 1. LangChain — NON intégré ⚠️
**Statut :** Demandé dans le cahier de charge, absent du code.  
**Problème :** Les appels LLM se font directement via l'API REST de Gemini/xAI. LangChain n'est pas utilisé pour orchestrer les prompts, construire des chaînes de traitement, ou gérer la mémoire des conversations.  
**Impact :** Les fonctionnalités IA fonctionnent mais ne bénéficient pas des capacités de chaining, de RAG (Retrieval-Augmented Generation) ni de mémoire contextuelle qu'apporterait LangChain.

---

### 2. Classification des Projets (ML) — PARTIELLE ⚠️
**Statut :** Seule la prédiction du risque (3 classes : faible/moyen/élevé) est implémentée. Une classification multi-dimensionnelle des projets est absente.  
**Problème :** Le cahier de charge mentionne "classification des projets" comme une fonctionnalité ML distincte de la prédiction de risque. Il n'y a pas de modèle ML classifiant les projets par type, complexité, secteur ou rentabilité estimée.  
**Impact :** Le module ML est fonctionnel mais ne couvre qu'une seule tâche de classification.

---

### 3. Analyse des Projets par IA — ABSENTE ⚠️
**Statut :** Le cahier de charge liste "analyse des projets" comme une fonctionnalité IA dédiée. Il n'existe pas de route/page `analyze-project` distincte.  
**Problème :** Les business plans et recommandations sont liés à un projet ou à un client, mais il n'existe pas d'analyse approfondie d'un projet (état d'avancement, détection d'anomalies, comparaison avec d'autres projets similaires, etc.).  
**Impact :** L'IA couvre le business plan et les recommandations client, mais pas l'analyse active de l'état d'un projet.

---

### 4. Données ML Synthétiques — Pas de vraies données ⚠️
**Statut :** Le modèle RandomForest est entraîné sur **500 échantillons synthétiques** générés algorithmiquement.  
**Problème :** Aucune pipeline d'entraînement sur les données réelles de la base de données n'est implémentée. Le modèle ne s'améliore pas avec l'usage de la plateforme.  
**Impact :** Les prédictions sont fonctionnelles mais peu fiables en conditions réelles.

---

### 5. Gestion des Messages de Contact côté Admin — ABSENTE ❌
**Statut :** Les utilisateurs peuvent envoyer des messages de contact, mais il n'existe aucune interface ni route admin/expert pour **lire et répondre** aux messages.  
**Problème :**  
- Aucune route backend `GET /api/admin/contact` ou `PUT /api/contact/:id/status`  
- Aucune page dans l'espace admin ou expert pour consulter les messages  
**Impact :** Le système de support est à sens unique — les messages sont envoyés mais jamais traités.

---

### 6. Assignation des Assistants aux Clients — PARTIELLE ⚠️
**Statut :** La logique backend filtre les clients par `assigned_expert_id` pour les assistants, mais il n'existe **aucune interface UI** permettant à un admin ou à un expert d'assigner un assistant à un client.  
**Problème :** Aucune page ni formulaire pour créer l'association assistant ↔ client.  
**Impact :** Les assistants ne peuvent voir aucun client si l'assignation n'est pas faite manuellement en base de données.

---

### 7. Profil Utilisateur — INCOMPLET ⚠️
**Statut :** Une page de profil existe pour le rôle **client** (`/client/profile`). Il n'existe **aucune page de profil** pour les rôles expert, assistant et administrateur.  
**Problème :** L'API `PUT /api/auth/profile` et `PUT /api/auth/change-password` existe en backend, mais seul le client a une interface pour les utiliser.  
**Impact :** Les experts et assistants ne peuvent pas modifier leurs informations depuis l'interface.

---

### 8. Aucun Système de Notifications ❌
**Statut :** Non implémenté.  
**Problème :** Il n'existe aucun système d'alertes ou de notifications (in-app ou email) pour les événements importants : projet à risque élevé, nouveau document uploadé, nouveau message de contact, etc.  
**Impact :** Les utilisateurs doivent consulter manuellement la plateforme pour détecter les changements.

---

### 9. Pandas — NON utilisé comme prévu ⚠️
**Statut :** Le cahier de charge liste Pandas comme outil ML. Il n'est pas utilisé dans le pipeline actuel.  
**Problème :** Le script `train_risk_model.py` génère les données avec NumPy et les passe directement à Scikit-learn sans traitement Pandas (CSV, nettoyage, feature engineering).  
**Impact :** Mineur pour l'état actuel, mais un pipeline de données réelles nécessiterait Pandas.

---

### 10. Authentification Client (Visiteur) — MANQUE DE LOGIQUE MÉTIER ⚠️
**Statut :** Le rôle `visiteur` (client) est assigné à l'inscription. Cependant, la liaison entre un compte `visiteur` et un enregistrement `Client` se fait par **correspondance d'email** (`client-scope.js`) — fragile et non documentée.  
**Problème :** Il n'y a pas d'interface permettant à un expert d'inviter/créer un compte client lié à une fiche client existante.  
**Impact :** Un client doit s'inscrire avec exactement le même email que celui enregistré dans sa fiche client pour voir ses projets.

---

## Tableau Récapitulatif

| Fonctionnalité | CDC | Statut |
|---|:---:|:---:|
| Gestion des clients (CRUD) | ✅ | ✅ Implémenté |
| Gestion des projets (CRUD) | ✅ | ✅ Implémenté |
| Gestion des documents | ✅ | ✅ Implémenté |
| Dashboard multi-rôles | ✅ | ✅ Implémenté |
| Authentification / JWT | implicite | ✅ Implémenté |
| Rôles & permissions | implicite | ✅ Implémenté |
| Génération de business plans (IA) | ✅ | ✅ Implémenté |
| Recommandations IA | ✅ | ✅ Implémenté |
| Analyse des projets (IA) | ✅ | ❌ Absent |
| Prédiction du risque (ML) | ✅ | ✅ Implémenté |
| Classification des projets (ML) | ✅ | ⚠️ Partiel |
| LangChain | ✅ | ❌ Non intégré |
| Angular (Frontend) | ✅ | ✅ Implémenté |
| Node.js / Express (Backend) | ✅ | ✅ Implémenté |
| MySQL / PostgreSQL | ✅ | ✅ Implémenté |
| Python + Scikit-learn | ✅ | ✅ Implémenté |
| Pandas | ✅ | ⚠️ Non utilisé |
| NumPy | ✅ | ✅ Implémenté |
| Données ML réelles | implicite | ❌ Synthétiques uniquement |
| Gestion contact / support (admin) | implicite | ❌ Absent |
| Assignation assistants → clients (UI) | implicite | ❌ Absent |
| Profil utilisateur (expert/assistant) | implicite | ❌ Absent |
| Notifications | implicite | ❌ Absent |
| Liaison compte client ↔ fiche client | implicite | ⚠️ Fragile (par email) |

---

## Résumé de l'avancement

| Module | Progression |
|---|---|
| Module Gestion | ~90% ✅ |
| Module IA | ~65% ⚠️ |
| Module ML | ~60% ⚠️ |
| Administration | ~75% ⚠️ |
| Infrastructure / Auth | ~85% ✅ |
| **Total estimé** | **~75%** |

---

*Analyse générée le 01/05/2026 — basée sur le fichier `cahier_de_charge_plateforme_intelligente_expert_comptable_v2 (1).pdf` et l'inspection complète du code source.*
