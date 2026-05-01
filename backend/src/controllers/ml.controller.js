/**
 * ML Management Controller
 * Handles real retraining triggers and model status for admin panel.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ML_DIR = path.resolve(__dirname, '../../ml');
const MODELS_DIR = path.join(ML_DIR, 'models');
const PYTHON_SCRIPTS = {
  risk: path.join(ML_DIR, 'train_risk_model.py'),
  classification: path.join(ML_DIR, 'train_classification_model.py'),
};
const MODEL_FILES = {
  risk: path.join(MODELS_DIR, 'risk_model.pkl'),
  classification: path.join(MODELS_DIR, 'classification_model.pkl'),
};

// In-memory training state (per process)
const trainingState = {
  risk: { running: false, lastRun: null, accuracy: null, dataSource: null, error: null },
  classification: { running: false, lastRun: null, accuracy: null, dataSource: null, error: null },
};

/**
 * Resolve the Python executable path from environment or fallback to 'python'.
 */
function getPythonExecutable() {
  return process.env.PYTHON_EXECUTABLE || 'python';
}

/**
 * Parse structured output lines emitted by training scripts.
 * Looks for "ACCURACY:85.0" and "DATA_SOURCE:synthetic" tokens.
 */
function parseTrainingOutput(stdout) {
  const result = { accuracy: null, dataSource: null };
  for (const line of stdout.split('\n')) {
    const accMatch = line.match(/^ACCURACY:(\d+(?:\.\d+)?)/);
    if (accMatch) result.accuracy = parseFloat(accMatch[1]);
    const srcMatch = line.match(/^DATA_SOURCE:(.+)/);
    if (srcMatch) result.dataSource = srcMatch[1].trim();
  }
  return result;
}

/**
 * GET /api/admin/ml/status
 * Returns current status and metadata for both models.
 */
const getModelStatus = (req, res) => {
  const statuses = {};

  for (const [model, filePath] of Object.entries(MODEL_FILES)) {
    const exists = fs.existsSync(filePath);
    let lastModified = null;
    if (exists) {
      try {
        lastModified = fs.statSync(filePath).mtime.toISOString();
      } catch (statErr) {
        // file may not be readable; lastModified stays null
        void statErr;
      }
    }

    statuses[model] = {
      model,
      exists,
      lastModified,
      running: trainingState[model].running,
      lastRun: trainingState[model].lastRun,
      accuracy: trainingState[model].accuracy,
      dataSource: trainingState[model].dataSource,
      error: trainingState[model].error,
    };
  }

  res.json({ models: statuses });
};

/**
 * POST /api/admin/ml/retrain
 * Body: { model: 'risk' | 'classification' | 'all' }
 * Triggers actual Python training script(s) asynchronously.
 */
const retrainModel = (req, res) => {
  const { model = 'all' } = req.body;
  const validModels = ['risk', 'classification', 'all'];

  if (!validModels.includes(model)) {
    return res.status(400).json({ message: `Invalid model. Must be one of: ${validModels.join(', ')}` });
  }

  const targets = model === 'all' ? ['risk', 'classification'] : [model];

  // Check if any target is already training
  for (const target of targets) {
    if (trainingState[target].running) {
      return res.status(409).json({
        message: `Model "${target}" is already being retrained. Please wait.`,
      });
    }
  }

  // Respond immediately — training runs in background
  res.json({
    message: `Retraining started for: ${targets.join(', ')}`,
    models: targets,
    startedAt: new Date().toISOString(),
  });

  const python = getPythonExecutable();
  const dbUrl = process.env.DB_URL || '';
  const env = { ...process.env };
  if (dbUrl) env.DB_URL = dbUrl;

  for (const target of targets) {
    trainingState[target].running = true;
    trainingState[target].error = null;

    const scriptPath = PYTHON_SCRIPTS[target];
    const proc = spawn(python, [scriptPath], { cwd: ML_DIR, env });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      trainingState[target].running = false;
      trainingState[target].lastRun = new Date().toISOString();

      if (code === 0) {
        const parsed = parseTrainingOutput(stdout);
        trainingState[target].accuracy = parsed.accuracy;
        trainingState[target].dataSource = parsed.dataSource;
        trainingState[target].error = null;
        console.log(`[ML] ${target} model retrained. Accuracy: ${parsed.accuracy}%`);
      } else {
        trainingState[target].error = stderr.trim() || `Training exited with code ${code}`;
        console.error(`[ML] ${target} retraining failed (code ${code}): ${stderr}`);
      }
    });

    proc.on('error', (err) => {
      trainingState[target].running = false;
      trainingState[target].error = err.message;
      console.error(`[ML] Failed to spawn training process for ${target}: ${err.message}`);
    });
  }
};

module.exports = { getModelStatus, retrainModel };
