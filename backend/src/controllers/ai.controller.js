const OpenAI = require('openai');
const { exec } = require('child_process');
const path = require('path');
const { AiBusinessPlan, Project, Client } = require('../models');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generateBusinessPlan = async (req, res, next) => {
  try {
    const { project_id } = req.body;

    const project = await Project.findByPk(project_id, {
      include: [{ model: Client, as: 'client' }],
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const prompt = `Generate a detailed business plan for:
      Company: ${project.client.company_name}
      Sector: ${project.client.sector || 'N/A'}
      Project: ${project.name}
      Description: ${project.description || 'N/A'}
      Budget: ${project.estimated_budget || 'N/A'}€

      Include: Executive Summary, Market Analysis, Financial Projections, Risks, Recommendations.
      Respond in JSON format with keys: executive_summary, market_analysis, financial_projections, risks, recommendations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = JSON.parse(response.choices[0].message.content);

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

    const prompt = `Based on this client profile, provide strategic recommendations:
      Company: ${client.company_name}
      Sector: ${client.sector || 'N/A'}
      Revenue: ${client.annual_revenue || 'N/A'}€
      Risk Level: ${client.risk_level}
      Active Projects: ${client.projects.length}
      
      Provide 3-5 actionable recommendations in JSON array format with keys: title, description, priority (high/medium/low).`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const recommendations = JSON.parse(response.choices[0].message.content);
    res.json({ recommendations });
  } catch (error) {
    next(error);
  }
};

const predictRisk = async (req, res, next) => {
  try {
    const { annual_revenue, estimated_budget, sector_code } = req.body;

    const features = JSON.stringify([annual_revenue, estimated_budget, sector_code]);
    const scriptPath = path.join(__dirname, '../../ml/predict.py');

    exec(`python "${scriptPath}" '${features}'`, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ message: 'ML prediction failed.', error: stderr });
      }
      try {
        const result = JSON.parse(stdout.trim());
        res.json(result);
      } catch (parseError) {
        res.status(500).json({ message: 'Failed to parse ML output.' });
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateBusinessPlan, getRecommendations, predictRisk };
