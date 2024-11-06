const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

// Fonction pour charger les données depuis `extracted_data.json`
const loadData = () => {
  try {
    return JSON.parse(fs.readFileSync('extracted_data.json', 'utf-8'));
  } catch (error) {
    console.error("Erreur de chargement des données :", error);
    return null;
  }
};

// Validation des variables d'environnement avec priorité
const validateEnvironmentVariables = (envVars) => {
  const requiredVars = {
    NODE_ENV: { expectedValue: 'production', priority: 'Moyenne' },
    APP_KEY: { expectedValue: 'expected_value', priority: 'Haute' },
    CONFIG_PATH: { expectedValue: '/etc/config', priority: 'Faible' }
  };
  const results = {};

  for (const [key, { expectedValue, priority }] of Object.entries(requiredVars)) {
    results[key] = envVars[key] === expectedValue 
      ? { status: 'OK', message: `Variable ${key} définie correctement.` }
      : { 
          status: 'Erreur', 
          message: `Non conforme : ${key} attendu = ${expectedValue}, trouvé = ${envVars[key] || 'non défini'}.`,
          suggestion: `Pour corriger, définissez ${key} à '${expectedValue}' dans vos variables d'environnement.`,
          priority: priority
        };
  }

  // Vérification des variables sensibles avec priorité haute
  const sensitiveKeys = ['DB_PASSWORD', 'API_SECRET'];
  sensitiveKeys.forEach(key => {
    results[key] = envVars[key] 
      ? { 
          status: 'Erreur', 
          message: `Non conforme : ${key} est exposée dans les variables d'environnement.`,
          suggestion: `Retirez ${key} des variables d'environnement ou placez-la dans un gestionnaire de secrets sécurisé.`,
          priority: 'Haute'
        }
      : { status: 'OK', message: `Variable sensible ${key} non exposée.` };
  });

  return results;
};

// Validation des informations système et des configurations Node.js avec priorité
const validateSystemInfo = (systemInfo) => {
  const requiredSystem = {
    platform: { expectedValue: 'linux', priority: 'Moyenne' },
    cpuArch: { expectedValue: 'x64', priority: 'Faible' }
  };
  const results = {};

  for (const [key, { expectedValue, priority }] of Object.entries(requiredSystem)) {
    results[key] = systemInfo[key] === expectedValue 
      ? { status: 'OK', message: `${key} est correctement configuré : ${systemInfo[key]}.` }
      : { 
          status: 'Erreur', 
          message: `Non conforme : ${key} attendu = ${expectedValue}, trouvé = ${systemInfo[key]}.`,
          suggestion: `Pour corriger, assurez-vous que votre système fonctionne sous ${expectedValue}.`,
          priority: priority
        };
  }

  // Vérifie la version de Node.js avec priorité moyenne
  const nodeVersion = process.version;
  const minVersion = 'v14.0.0';
  results['Node.js Version'] = nodeVersion >= minVersion 
    ? { status: 'OK', message: `Version de Node.js conforme : ${nodeVersion}.` }
    : { 
        status: 'Erreur', 
        message: `Non conforme : version de Node.js minimale ${minVersion}, trouvé ${nodeVersion}.`,
        suggestion: `Mettez à jour Node.js vers la version ${minVersion} ou supérieure.`,
        priority: 'Moyenne'
      };

  return results;
};

// Fonction pour obtenir la dernière version d'une dépendance depuis npm
const getLatestVersion = (packageName) => {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${packageName}/latest`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.version);
        } catch (error) {
          reject(`Erreur de parsing JSON pour ${packageName} : ${error}`);
        }
      });
    }).on('error', (error) => reject(`Erreur de connexion pour ${packageName} : ${error}`));
  });
};

// Validation des dépendances avec vérification des dernières versions et priorité
const validateDependencies = async (dependencies) => {
  const results = {};

  for (const [lib, { version: installedVersion }] of Object.entries(dependencies)) {
    try {
      const latestVersion = await getLatestVersion(lib);
      const status = installedVersion === latestVersion ? 'OK' : 'Mise à jour disponible';
      const message = installedVersion === latestVersion
        ? `${lib} est à jour : ${installedVersion}.`
        : `${lib} n'est pas à jour : installé = ${installedVersion}, dernière version = ${latestVersion}`;
      results[lib] = { 
        status, 
        message,
        suggestion: installedVersion === latestVersion 
          ? null 
          : `Mettez à jour ${lib} en exécutant 'npm install ${lib}@${latestVersion}'.`,
        priority: installedVersion === latestVersion ? null : 'Moyenne'
      };
    } catch (error) {
      results[lib] = { 
        status: 'Erreur', 
        message: `Impossible de récupérer la dernière version : ${error}`,
        suggestion: `Vérifiez votre connexion internet ou l'existence de la bibliothèque ${lib} sur npm.`,
        priority: 'Moyenne'
      };
    }
  }

  return results;
};

// Génération du rapport HTML combiné avec affichage des priorités
const generateHtmlReport = (report) => {
  const htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; }
        h1 { color: #4CAF50; text-align: center; }
        .section { margin-bottom: 20px; }
        .ok { color: green; font-weight: bold; }
        .update { color: orange; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .priority { font-style: italic; font-size: 0.9em; color: #555; }
        .section-title { font-size: 1.2em; color: #333; margin-bottom: 5px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .item { margin: 8px 0; padding: 10px; border-radius: 5px; }
        .ok-bg { background-color: #e6ffed; }
        .update-bg { background-color: #fff5e6; }
        .error-bg { background-color: #ffe6e6; }
      </style>
    </head>
    <body>
      <h1>Rapport d'Analyse de Configuration et Dépendances</h1>
      ${['envVariables', 'systemInfo', 'dependencies'].map(section =>
        `<div class="section">
          <div class="section-title">${section === 'envVariables' ? 'Variables d\'Environnement' : section === 'systemInfo' ? 'Informations Système' : 'Dépendances'}</div>
          ${Object.entries(report[section]).map(([key, result]) =>
            `<div class="item ${result.status === 'OK' ? 'ok-bg' : result.status === 'Mise à jour disponible' ? 'update-bg' : 'error-bg'}">
              ${key} : <span class="${result.status === 'OK' ? 'ok' : result.status === 'Mise à jour disponible' ? 'update' : 'error'}">${result.status}</span> - ${result.message}
              ${result.priority ? `<div class="priority">Priorité : ${result.priority}</div>` : ''}
              ${result.suggestion ? `<br><em>Suggestion : ${result.suggestion}</em>` : ''}
            </div>`
          ).join('')}
        </div>`
      ).join('')}
    </body>
    </html>
  `;

  fs.writeFileSync('combined_report.html', htmlContent);
  console.log("Rapport combiné généré avec succès dans combined_report.html");
};

// Fonction principale pour charger les données et générer le rapport
const generateReport = async () => {
  const data = loadData();
  if (!data) return;

  const envVariablesReport = validateEnvironmentVariables(data.envVariables);
  const systemInfoReport = validateSystemInfo(data.systemInfo);
  const dependenciesReport = await validateDependencies(data.dependencies);

  const report = {
    envVariables: envVariablesReport,
    systemInfo: systemInfoReport,
    dependencies: dependenciesReport
  };

  generateHtmlReport(report);
};

generateReport();
