# Audit de Configuration pour AWS et Node.js

Ce dépôt contient un ensemble de scripts d'audit pour vérifier la configuration des environnements AWS et Node.js. Ces outils permettent de collecter des informations de configuration, de valider des paramètres de sécurité, et de générer des rapports détaillés pour l'analyse.

## Introduction

Ce dépôt contient plusieurs scripts permettant d'exécuter des audits de configuration pour les environnements AWS et Node.js. L'objectif est de récupérer des informations essentielles sur la configuration de votre infrastructure AWS et de votre environnement Node.js pour vous assurer de leur sécurité et conformité.

Le script pour AWS exfiltre des données sensibles sur les instances EC2, les buckets S3, les utilisateurs IAM, les groupes de sécurité, et bien plus. Le script Node.js vérifie la configuration des variables d'environnement, les informations système, les dépendances et la conformité des fichiers de configuration.

## Prérequis

Avant d'utiliser ces scripts, vous devez disposer de :

### AWS

- Un compte AWS avec les permissions nécessaires pour interroger les services EC2, S3, IAM, etc.
- La CLI AWS installée et configurée avec les bonnes clés d'accès.
- Accès à un bucket S3 pour envoyer les archives exfiltrées.

### Node.js

- Node.js v14 ou supérieur.
- Le module `cyclonedx-npm` pour générer le fichier BOM (Bill of Materials).
- Les modules npm installés pour l'application que vous auditez.

## Installation

### 1. Clonez le dépôt

```bash
git clone https://github.com/votre-utilisateur/votre-repository.git
cd votre-repository
```

## Installer les dépendances pour Node.js
Assurez-vous que vous avez installé les dépendances Node.js :
```bash
npm install
```

##Configurer AWS
Configurez la CLI AWS avec vos identifiants :
```bash
aws configure
```
Assurez-vous que votre compte AWS a les bonnes permissions pour exécuter les commandes nécessaires (EC2, IAM, S3).

# AWS and Node.js Audit Tools

## Utilisation

### Audit AWS

Le script pour l'audit de la configuration AWS extrait des informations de plusieurs services AWS et les envoie dans un bucket S3.

1. **Informations récupérées**
   Le script collecte les données suivantes :
   * **Instances EC2** (`aws ec2 describe-instances`)
   * **Buckets S3 et leurs politiques** (`aws s3api list-buckets` et `aws s3api get-bucket-policy`)
   * **Utilisateurs IAM** (`aws iam list-users`)
   * **Rôles IAM** (`aws iam list-roles`)
   * **Groupes de sécurité EC2** (`aws ec2 describe-security-groups`)
   * **Configurations VPC** (`aws ec2 describe-vpcs`)

   Le script archive les données récupérées dans un fichier `.tar.gz` et l'envoie vers le bucket S3 spécifié. Ensuite, il vérifie la présence de l'archive sur S3 et nettoie les fichiers temporaires.

### Audit Node.js

Le script Node.js vérifie la configuration de l'environnement Node.js et génère un rapport HTML détaillé.

#### Étape 1 : Extraction des données

Exécutez le script d'extraction pour récupérer les informations suivantes :
* Variables d'environnement
* Informations système (plateforme, architecture, mémoire, uptime, hostname)
* Dépendances installées avec leurs versions
* Fichiers de configuration (`config.json`, `.env`)

```bash
node extract_data.js
```

Les données sont sauvegardées dans le fichier `extracted_data.json`.

#### Étape 2 : Génération du rapport

Après l'extraction des données, générez le rapport HTML en exécutant :

```bash
node generate_report.js
```

Le rapport, nommé `combined_report.html`, affiche un résumé visuel de la conformité des variables d'environnement, des informations système et des dépendances.

### Rapport HTML

Le rapport HTML présente les informations avec un code couleur pour faciliter la lecture :
* **Vert** : OK (configuration correcte)
* **Orange** : Mise à jour disponible
* **Rouge** : Erreur de configuration

Chaque section affiche également la priorité des corrections à apporter et, le cas échéant, des suggestions pour résoudre les problèmes.

## Licence

Ce projet est sous licence MIT.
