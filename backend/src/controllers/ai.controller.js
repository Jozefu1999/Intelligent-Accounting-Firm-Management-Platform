const OpenAI = require('openai');
const { execFile } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { AiBusinessPlan, Project, Client } = require('../models');

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const DEFAULT_GEMINI_NATIVE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash-lite';
const DEFAULT_GEMINI_FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

const DEFAULT_XAI_BASE_URL = 'https://api.x.ai/v1';
const DEFAULT_XAI_MODEL = 'grok-4';
const DEFAULT_XAI_FALLBACK_MODELS = ['grok-4-latest', 'grok-3-mini', 'grok-3-mini-latest'];

const readEnv = (key) => {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

const parseInteger = (value, fallbackValue) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
};

const getGeminiApiKey = () => readEnv('GEMINI_API_KEY');
const getXaiApiKey = () => readEnv('XAI_API_KEY')
  || readEnv('GROK_API_KEY')
  || readEnv('GROQ_API_KEY')
  || readEnv('OPENAI_API_KEY');

const normalizeProvider = (value) => {
  const normalized = value.toLowerCase();

  if (normalized === 'grok') {
    return 'xai';
  }

  if (normalized === 'gemini' || normalized === 'xai') {
    return normalized;
  }

  return '';
};

const getAiProvider = () => {
  const forcedProvider = normalizeProvider(readEnv('AI_PROVIDER'));
  if (forcedProvider) {
    return forcedProvider;
  }

  return getGeminiApiKey() ? 'gemini' : 'xai';
};

const getAiApiKey = () => (getAiProvider() === 'gemini' ? getGeminiApiKey() : getXaiApiKey());
const getAiBaseUrl = () => {
  if (getAiProvider() === 'gemini') {
    return readEnv('GEMINI_BASE_URL') || DEFAULT_GEMINI_BASE_URL;
  }

  return readEnv('XAI_BASE_URL') || DEFAULT_XAI_BASE_URL;
};

const parseCsvList = (value) => value
  .split(',')
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0);

const dedupeNonEmpty = (values) => values.filter((value, index, list) => value && list.indexOf(value) === index);

const getAiModelConfig = () => {
  const provider = getAiProvider();

  if (provider === 'gemini') {
    const primary = readEnv('GEMINI_MODEL') || readEnv('AI_MODEL') || DEFAULT_GEMINI_MODEL;
    const envFallbacks = readEnv('GEMINI_MODEL_FALLBACKS') || readEnv('AI_MODEL_FALLBACKS');
    const fallbackModels = envFallbacks ? parseCsvList(envFallbacks) : DEFAULT_GEMINI_FALLBACK_MODELS;

    return {
      provider,
      primary,
      models: dedupeNonEmpty([primary, ...fallbackModels]),
      maxOutputTokens: parseInteger(readEnv('AI_MAX_OUTPUT_TOKENS') || readEnv('GEMINI_MAX_OUTPUT_TOKENS'), 4096),
    };
  }

  const primary = readEnv('XAI_MODEL') || readEnv('GROK_MODEL') || readEnv('AI_MODEL') || DEFAULT_XAI_MODEL;
  const envFallbacks = readEnv('XAI_MODEL_FALLBACKS') || readEnv('GROK_MODEL_FALLBACKS') || readEnv('AI_MODEL_FALLBACKS');
  const fallbackModels = envFallbacks ? parseCsvList(envFallbacks) : DEFAULT_XAI_FALLBACK_MODELS;

  return {
    provider,
    primary,
    models: dedupeNonEmpty([primary, ...fallbackModels]),
    maxOutputTokens: parseInteger(readEnv('AI_MAX_OUTPUT_TOKENS') || readEnv('XAI_MAX_OUTPUT_TOKENS'), 4096),
  };
};

const getAiErrorStatus = (error) => error?.statusCode || error?.status || error?.response?.status || 500;
const getAiErrorMessage = (error) => {
  if (typeof error?.error?.message === 'string' && error.error.message.trim().length > 0) {
    return error.error.message.trim();
  }

  if (typeof error?.response?.data?.error?.message === 'string' && error.response.data.error.message.trim().length > 0) {
    return error.response.data.error.message.trim();
  }

  if (typeof error?.message === 'string' && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return 'AI request failed.';
};

const isModelNotFoundError = (error) => /model not found|requested entity was not found|unknown model/i.test(getAiErrorMessage(error));
const isNoCreditsError = (error) => /doesn't have any credits or licenses/i.test(getAiErrorMessage(error));
const isUnauthorizedError = (error) => /invalid api key|api key not valid|unauthorized|authentication|permission denied/i.test(getAiErrorMessage(error));
const isQuotaError = (error) => /quota|resource_exhausted|rate limit|too many requests/i.test(getAiErrorMessage(error));

const toHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const unwrapFence = (value) => value
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```\s*$/i, '')
  .trim();

const sanitizeJsonString = (value) => value
  // Remove trailing commas before } or ]
  .replace(/,\s*([\]}])/g, '$1')
  // Remove control characters except newline/tab
  // eslint-disable-next-line no-control-regex
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

const parseJsonFromAiMessage = (value) => {
  if (typeof value !== 'string') {
    throw toHttpError(502, 'AI response is empty. Please retry in a few seconds.');
  }

  const normalized = unwrapFence(value.trim());

  const directCandidates = [normalized];

  const objectStart = normalized.indexOf('{');
  const objectEnd = normalized.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd > objectStart) {
    directCandidates.push(normalized.slice(objectStart, objectEnd + 1));
  }

  const arrayStart = normalized.indexOf('[');
  const arrayEnd = normalized.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    directCandidates.push(normalized.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of dedupeNonEmpty(directCandidates)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try sanitized version (trailing commas, control chars)
      try {
        return JSON.parse(sanitizeJsonString(candidate));
      } catch {
        // Try next candidate.
      }
    }
  }

  throw toHttpError(502, 'AI response format is invalid JSON. Please retry.');
};

const createGeminiNativeCompletion = async ({ prompt, temperature, modelConfig }) => {
  const apiKey = readEnv('GEMINI_API_KEY');
  if (!apiKey) {
    throw toHttpError(401, 'Gemini API key is not configured. Check GEMINI_API_KEY in backend/.env.');
  }

  const nativeBaseUrl = readEnv('GEMINI_NATIVE_BASE_URL') || DEFAULT_GEMINI_NATIVE_BASE_URL;
  let lastError = null;

  if (typeof globalThis.fetch !== 'function') {
    throw toHttpError(500, 'Current Node runtime does not support global fetch. Use Node 18+ to call Gemini API.');
  }

  for (const model of modelConfig.models) {
    try {
      const url = `${nativeBaseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await globalThis.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: modelConfig.maxOutputTokens,
            responseMimeType: 'application/json',
          },
        }),
      });

      const responseText = await response.text();
      let responseBody = {};
      try {
        responseBody = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseBody = {};
      }

      if (!response.ok) {
        const errorMessage = responseBody?.error?.message
          || `Gemini request failed with status ${response.status}.`;

        const requestError = new Error(errorMessage);
        requestError.statusCode = response.status;
        requestError.error = responseBody?.error || { message: errorMessage };
        throw requestError;
      }

      const candidate = Array.isArray(responseBody?.candidates) ? responseBody.candidates[0] : null;
      const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
      const textPart = parts.find((part) => typeof part?.text === 'string');
      const content = textPart?.text || '';

      if (content.trim().length === 0) {
        throw toHttpError(502, 'AI response is empty. Please retry in a few seconds.');
      }

      return {
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      };
    } catch (error) {
      lastError = error;
      if (isModelNotFoundError(error)) {
        continue;
      }

      break;
    }
  }

  throw lastError || toHttpError(500, 'Gemini request failed.');
};

const createAiCompletion = async ({ prompt, temperature = 0.2 }) => {
  const modelConfig = getAiModelConfig();
  const modelCandidates = modelConfig.models;
  const provider = modelConfig.provider;

  if (provider === 'gemini') {
    try {
      return await createGeminiNativeCompletion({ prompt, temperature, modelConfig });
    } catch (error) {
      const status = getAiErrorStatus(error);
      const message = getAiErrorMessage(error);

      if (isUnauthorizedError(error)) {
        throw toHttpError(401, 'Gemini API key is invalid or unauthorized. Check GEMINI_API_KEY in backend/.env.');
      }

      if (status === 429 || isQuotaError(error)) {
        throw toHttpError(429, 'Gemini quota/rate limit reached. Use the lite model, reduce request volume, or wait for quota reset.');
      }

      if (isModelNotFoundError(error)) {
        const configuredModel = modelConfig.primary || DEFAULT_GEMINI_MODEL;
        throw toHttpError(
          400,
          `Configured Gemini model "${configuredModel}" is unavailable. Update GEMINI_MODEL in backend/.env and retry.`,
        );
      }

      throw toHttpError(status, message);
    }
  }

  const client = getAIClient();

  let lastError = null;

  for (const model of modelCandidates) {
    try {
      return await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: modelConfig.maxOutputTokens,
      });
    } catch (error) {
      lastError = error;

      if (isModelNotFoundError(error)) {
        continue;
      }

      break;
    }
  }

  const status = getAiErrorStatus(lastError);
  const message = getAiErrorMessage(lastError);

  if (provider === 'xai' && isNoCreditsError(lastError)) {
    throw toHttpError(403, 'xAI account has no active credits/licenses. Add billing in xAI console, then retry.');
  }

  if (provider === 'xai' && isUnauthorizedError(lastError)) {
    throw toHttpError(401, 'xAI API key is invalid or unauthorized. Check XAI_API_KEY (or GROK_API_KEY/GROQ_API_KEY) in backend/.env.');
  }

  if (provider === 'xai' && (status === 429 || isQuotaError(lastError))) {
    throw toHttpError(429, 'xAI quota/rate limit reached. Check xAI billing/limits, then retry.');
  }

  if (isModelNotFoundError(lastError)) {
    const configuredModel = modelConfig.primary || (provider === 'gemini' ? DEFAULT_GEMINI_MODEL : DEFAULT_XAI_MODEL);
    const providerName = provider === 'gemini' ? 'Gemini' : 'xAI';
    throw toHttpError(
      400,
      `Configured ${providerName} model "${configuredModel}" is unavailable. Update the model value in backend/.env and retry.`,
    );
  }

  throw toHttpError(status, message);
};

// Lazy-initialize AI client only when AI features are actually used
let aiClient = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = getAiApiKey();
    if (!apiKey) {
      throw new Error('No AI API key configured for selected provider. Set GEMINI_API_KEY, or set AI_PROVIDER=xai with XAI_API_KEY (or GROK_API_KEY/GROQ_API_KEY) in backend/.env.');
    }

    aiClient = new OpenAI({
      apiKey,
      baseURL: getAiBaseUrl(),
    });
  }

  return aiClient;
}

const generateBusinessPlan = async (req, res, next) => {
  try {
    const { project_id } = req.body;

    const project = await Project.findByPk(project_id, {
      include: [{ model: Client, as: 'client' }],
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const clientName = project.client?.company_name || project.client?.name || 'Unknown';
    const sector = project.client?.sector || 'General';
    const budget = project.estimated_budget || 'Not specified';
    const status = project.status || 'draft';
    const priority = project.priority || 'medium';
    const description = project.description || 'No description provided';
    const startDate = project.start_date || project.created_at || 'Not defined';
    const deadline = project.deadline || project.end_date || 'Not defined';

    const prompt = [
      'You are a professional project planner for an accounting firm. Generate a complete project plan.',
      'Return ONLY valid JSON (no markdown fences, no extra text).',
      '',
      'Required JSON structure with these exact keys:',
      '{',
      '  "overview": "Brief project summary (2-3 sentences)",',
      '  "objectives": ["objective 1", "objective 2", "objective 3"],',
      '  "phases": [',
      '    { "name": "Phase name", "duration": "estimated duration", "tasks": ["task 1", "task 2"], "deliverables": ["deliverable 1"] }',
      '  ],',
      '  "milestones": [',
      '    { "name": "Milestone name", "target_date": "relative timing", "criteria": "completion criteria" }',
      '  ],',
      '  "resources": ["resource or skill needed 1", "resource 2"],',
      '  "risks": [',
      '    { "risk": "risk description", "impact": "high/medium/low", "mitigation": "how to mitigate" }',
      '  ],',
      '  "budget_allocation": [',
      '    { "category": "category name", "percentage": 30, "description": "what it covers" }',
      '  ],',
      '  "success_criteria": ["criterion 1", "criterion 2"],',
      '  "recommendations": "Final strategic recommendations (2-3 sentences)"',
      '}',
      '',
      'Generate the plan based on this project information:',
      `- Client: ${clientName}`,
      `- Sector: ${sector}`,
      `- Project name: ${project.name}`,
      `- Description: ${description}`,
      `- Budget: ${budget} EUR`,
      `- Status: ${status}`,
      `- Priority: ${priority}`,
      `- Start date: ${startDate}`,
      `- Deadline: ${deadline}`,
      '',
      'Make the plan realistic and actionable. Include 3-5 phases, 3-4 milestones, and 3-5 risks.',
    ].join('\n');

    const response = await createAiCompletion({
      prompt,
      temperature: 0.3,
    });

    const content = parseJsonFromAiMessage(response?.choices?.[0]?.message?.content);

    const businessPlan = await AiBusinessPlan.create({
      project_id,
      content,
      generated_by: req.user.id,
    });

    res.status(201).json(businessPlan);
  } catch (error) {
    next(error);
  }
};

const getRecommendations = async (req, res, next) => {
  try {
    const { client_id } = req.body;

    const client = await Client.findByPk(client_id, {
      include: [{ model: Project, as: 'projects' }],
    });
    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    const projects = client.projects || [];
    const projectSummary = projects.length > 0
      ? projects.map(p => `- "${p.name}" (status: ${p.status || 'unknown'}, budget: ${p.budget || 'N/A'} EUR, priority: ${p.priority || 'N/A'})`).join('\n')
      : '- No active projects';

    const prompt = `You are a senior financial advisor and business consultant working for an accounting firm.
Analyze the following client profile and provide exactly 5 strategic, specific, and actionable recommendations.

CLIENT PROFILE:
- Company: ${client.company_name}
- Sector: ${client.sector || 'Not specified'}
- Annual Revenue: ${client.annual_revenue ? client.annual_revenue + ' EUR' : 'Not declared'}
- Risk Level: ${client.risk_level || 'Not assessed'}
- Contact: ${client.first_name || ''} ${client.last_name || ''}
- Active Projects (${projects.length}):
${projectSummary}

INSTRUCTIONS:
- Each recommendation must be specific to THIS client's situation (sector, revenue, risk level, projects).
- Do NOT give generic advice like "increase revenue" or "review projects".
- Focus on: tax optimization, cash flow management, compliance, growth strategy, risk mitigation, operational efficiency.
- Each description should be 2-3 sentences explaining WHY and HOW.
- Assign priority based on urgency and impact.

Return ONLY a valid JSON array (no markdown, no explanation). Each object must have:
- "title": concise action title (5-8 words)
- "description": specific explanation with concrete steps (2-3 sentences, 40-60 words)
- "priority": "high" | "medium" | "low"
- "category": one of "fiscal", "financial", "compliance", "strategy", "operations"`;

    const response = await createAiCompletion({
      prompt,
      temperature: 0.4,
    });

    const recommendations = parseJsonFromAiMessage(response?.choices?.[0]?.message?.content);
    if (!Array.isArray(recommendations)) {
      throw toHttpError(502, 'AI response format is invalid JSON array. Please retry.');
    }
    res.json({ recommendations });
  } catch (error) {
    next(error);
  }
};

const predictRisk = async (req, res, next) => {
  try {
    const {
      team_size,
      budget_usd,
      duration_months,
      complexity_score,
      stakeholder_count,
      past_similar_projects,
      success_rate,
      budget_utilization,
      change_request_frequency,
      team_turnover_rate,
      vendor_reliability,
      schedule_pressure,
      resource_availability,
      technical_debt,
      team_experience,
      requirement_stability,
      risk_management_maturity,
      documentation_quality,
      external_dependencies,
    } = req.body;

    if (team_size == null || budget_usd == null) {
      return res.status(400).json({ message: 'team_size and budget_usd are required.' });
    }

    const payload = {
      team_size,
      budget_usd,
      ...(duration_months       != null && { duration_months }),
      ...(complexity_score      != null && { complexity_score }),
      ...(stakeholder_count     != null && { stakeholder_count }),
      ...(past_similar_projects != null && { past_similar_projects }),
      ...(success_rate          != null && { success_rate }),
      ...(budget_utilization    != null && { budget_utilization }),
      ...(change_request_frequency != null && { change_request_frequency }),
      ...(team_turnover_rate    != null && { team_turnover_rate }),
      ...(vendor_reliability    != null && { vendor_reliability }),
      ...(schedule_pressure     != null && { schedule_pressure }),
      ...(resource_availability != null && { resource_availability }),
      ...(technical_debt        != null && { technical_debt }),
      ...(team_experience       != null && { team_experience }),
      ...(requirement_stability != null && { requirement_stability }),
      ...(risk_management_maturity != null && { risk_management_maturity }),
      ...(documentation_quality != null && { documentation_quality }),
      ...(external_dependencies != null && { external_dependencies }),
    };

    const features = JSON.stringify(payload);
    const scriptPath = path.join(__dirname, '../../../ml/predict.py');
    const python = process.env.PYTHON_EXECUTABLE || 'python';

    execFile(python, [scriptPath, features], (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ message: 'ML risk prediction failed.', error: stderr });
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          return res.status(500).json({ message: result.error });
        }
        res.json(result);
      } catch {
        res.status(500).json({ message: 'Failed to parse ML output.' });
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateBusinessPlan, getRecommendations, predictRisk };
