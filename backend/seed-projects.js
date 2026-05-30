const seq = require('./src/config/db');

async function run() {
  try {
    await seq.query('ALTER TABLE projects MODIFY COLUMN client_id INT NULL');
    console.log('Column altered: client_id is now nullable');

    const projects = [
      { name: 'Audit Fiscal 2026', description: 'Annual fiscal audit for tax compliance review', type: 'audit', status: 'draft', priority: 'high', start_date: '2026-06-01', due_date: '2026-08-31' },
      { name: 'Création Entreprise ABC', description: 'Company creation and registration procedures', type: 'creation', status: 'draft', priority: 'medium', start_date: '2026-06-15', due_date: '2026-09-15' },
      { name: 'Conseil Stratégique PME', description: 'Strategic consulting for small business growth', type: 'consulting', status: 'in_progress', priority: 'medium', start_date: '2026-05-01', due_date: '2026-07-30' },
      { name: 'Développement Comptable', description: 'Accounting system development and optimization', type: 'development', status: 'in_progress', priority: 'low', start_date: '2026-04-01', due_date: '2026-10-01' },
      { name: 'Bilan Annuel 2025', description: 'End-of-year financial statement preparation', type: 'audit', status: 'completed', priority: 'high', start_date: '2026-01-10', due_date: '2026-03-31' },
      { name: 'Optimisation Fiscale', description: 'Tax optimization plan for corporate clients', type: 'consulting', status: 'draft', priority: 'high', start_date: '2026-07-01', due_date: '2026-12-31' },
      { name: 'Restructuration Société XYZ', description: 'Corporate restructuring and legal compliance', type: 'other', status: 'draft', priority: 'medium', start_date: '2026-08-01', due_date: '2026-11-30' },
      { name: 'Mise en Conformité RGPD', description: 'GDPR compliance assessment and implementation', type: 'consulting', status: 'in_progress', priority: 'high', start_date: '2026-03-15', due_date: '2026-06-30' },
    ];

    for (const p of projects) {
      await seq.query(
        'INSERT INTO projects (client_id, name, description, type, status, priority, start_date, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        { replacements: [null, p.name, p.description, p.type, p.status, p.priority, p.start_date, p.due_date] }
      );
    }

    console.log('Inserted ' + projects.length + ' sample projects');
    await seq.close();
  } catch (e) {
    console.error(e.message);
    await seq.close();
    process.exit(1);
  }
}

run();
