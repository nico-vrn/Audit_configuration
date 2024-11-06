const fs = require('fs');
const os = require('os');
const { execSync, execFileSync } = require('child_process');
require('dotenv').config();
const path = require('path');

// Fonction pour extraire les données
const extractData = () => {
  const data = {
    envVariables: process.env,
    systemInfo: {
      platform: os.platform(),
      cpuArch: os.arch(),
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      uptime: os.uptime(),
      hostname: os.hostname()
    },
    dependencies: JSON.parse(execSync('npm list --depth=0 --json').toString()).dependencies
  };

  try {
    data.configFiles = {};
    const configFilePath = 'config.json';
    if (fs.existsSync(configFilePath)) {
      data.configFiles['config.json'] = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    }

    const envFilePath = '.env';
    if (fs.existsSync(envFilePath)) {
      data.configFiles['.env'] = fs.readFileSync(envFilePath, 'utf-8');
    }
  } catch (error) {
    console.error("Erreur de lecture des fichiers:", error);
  }

  try {
    fs.writeFileSync('extracted_data.json', JSON.stringify(data, null, 2));
    console.log("Données sauvegardées dans extracted_data.json");
  } catch (error) {
    console.error("Erreur d'écriture du fichier JSON:", error);
  }

  // Génération du BOM avec CycloneDX en utilisant la CLI
  generateBOM();
};

// Fonction pour générer le fichier BOM avec le CLI `cyclonedx-npm`
const { exec } = require('child_process');

const generateBOM = () => {
  exec('npx cyclonedx-npm --output-format xml --output-file bom.xml', (error, stdout, stderr) => {
    if (error) {
      console.error("Erreur lors de la génération du BOM :", error);
      return;
    }
    if (stderr) {
      console.error("Sortie d'erreur :", stderr);
    }
    console.log("Fichier BOM généré avec succès dans bom.xml");
  });
};


// Exécuter l'extraction des données et la génération du BOM
extractData();
