const seq = require('./src/config/db');

const HASH = '$2b$10$5i9MvesSQSxK0NzC/Pzzy.ogLBTdbzeajN60a5jTVEssbHcd3jG7K';

async function run() {
  try {
    // ─── Users ───────────────────────────────────────────────────────────────
    const users = [
      // Admin
      { first_name: 'Ahmed',        last_name: 'Benali',    email: 'ahmed.benali@mdaudit.com',       role: 'administrateur' },

      // Experts
      { first_name: 'Mohamed',      last_name: 'Dupont',    email: 'mohamed.dupont@mdaudit.com',     role: 'expert_comptable' },
      { first_name: 'Sarah',        last_name: 'Martin',    email: 'sarah.martin@mdaudit.com',       role: 'expert_comptable' },
      { first_name: 'Karim',        last_name: 'Rousseau',  email: 'karim.rousseau@mdaudit.com',     role: 'expert_comptable' },

      // Assistants
      { first_name: 'Leila',        last_name: 'Fontaine',  email: 'leila.fontaine@mdaudit.com',     role: 'assistant' },
      { first_name: 'Youssef',      last_name: 'Bernard',   email: 'youssef.bernard@mdaudit.com',    role: 'assistant' },
      { first_name: 'Nadia',        last_name: 'Petit',     email: 'nadia.petit@mdaudit.com',        role: 'assistant' },

      // Clients (email must match client record email below)
      { first_name: 'Jean-Pierre',  last_name: 'Moreau',    email: 'jp.moreau@groupe-moreau.fr',     role: 'client' },
      { first_name: 'Isabelle',     last_name: 'Leclerc',   email: 'i.leclerc@techpro-innov.fr',     role: 'client' },
      { first_name: 'David',        last_name: 'Haddad',    email: 'd.haddad@haddad-immo.fr',        role: 'client' },
      { first_name: 'Marie-Claire', last_name: 'Blanc',     email: 'mc.blanc@logistique-blanc.fr',   role: 'client' },
      { first_name: 'Sofiane',      last_name: 'Merabti',   email: 's.merabti@merabti-conseil.fr',   role: 'client' },
    ];

    const insertedIds = {};

    for (const u of users) {
      // Skip if already exists
      const [existing] = await seq.query(
        'SELECT id FROM users WHERE email = ?',
        { replacements: [u.email] }
      );
      if (existing.length > 0) {
        insertedIds[u.email] = existing[0].id;
        console.log(`  skipped (exists): ${u.email} → id ${existing[0].id}`);
        continue;
      }

      const [result] = await seq.query(
        'INSERT INTO users (first_name, last_name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        { replacements: [u.first_name, u.last_name, u.email, HASH, u.role] }
      );
      insertedIds[u.email] = result;
      console.log(`  inserted: ${u.first_name} ${u.last_name} (${u.role}) → id ${result}`);
    }

    // ─── Experts for easy reference ──────────────────────────────────────────
    const expert1 = insertedIds['mohamed.dupont@mdaudit.com'];
    const expert2 = insertedIds['sarah.martin@mdaudit.com'];
    const expert3 = insertedIds['karim.rousseau@mdaudit.com'];

    // ─── Clients ─────────────────────────────────────────────────────────────
    const clients = [
      {
        company_name:    'Groupe Moreau SAS',
        siret:           '41234567800012',
        address:         '12 rue de la République',
        city:            'Lyon',
        phone:           '+33 4 72 00 11 22',
        email:           'jp.moreau@groupe-moreau.fr',
        contact_person:  'Jean-Pierre Moreau',
        annual_revenue:  2800000.00,
        sector:          'Retail',
        risk_level:      'low',
        status:          'active',
        notes:           'Long-standing client, fiscal audit every year.',
        assigned_expert_id: expert1,
      },
      {
        company_name:    'TechPro Innovation',
        siret:           '52345678900023',
        address:         '45 avenue des Startups',
        city:            'Paris',
        phone:           '+33 1 40 00 22 33',
        email:           'i.leclerc@techpro-innov.fr',
        contact_person:  'Isabelle Leclerc',
        annual_revenue:  950000.00,
        sector:          'Technology',
        risk_level:      'medium',
        status:          'active',
        notes:           'Growing tech startup, needs monthly reporting.',
        assigned_expert_id: expert1,
      },
      {
        company_name:    'Haddad Immobilier',
        siret:           '63456789000034',
        address:         '8 boulevard Haussmann',
        city:            'Paris',
        phone:           '+33 1 45 00 33 44',
        email:           'd.haddad@haddad-immo.fr',
        contact_person:  'David Haddad',
        annual_revenue:  5400000.00,
        sector:          'Real Estate',
        risk_level:      'high',
        status:          'active',
        notes:           'Complex portfolio with multiple holdings.',
        assigned_expert_id: expert2,
      },
      {
        company_name:    'Logistique Blanc & Associés',
        siret:           '74567890100045',
        address:         '3 zone industrielle Nord',
        city:            'Marseille',
        phone:           '+33 4 91 00 44 55',
        email:           'mc.blanc@logistique-blanc.fr',
        contact_person:  'Marie-Claire Blanc',
        annual_revenue:  1750000.00,
        sector:          'Logistics',
        risk_level:      'medium',
        status:          'active',
        notes:           'Fleet management and transport compliance.',
        assigned_expert_id: expert2,
      },
      {
        company_name:    'Merabti Conseil',
        siret:           '85678901200056',
        address:         '21 rue Ibn Khaldoun',
        city:            'Bordeaux',
        phone:           '+33 5 56 00 55 66',
        email:           's.merabti@merabti-conseil.fr',
        contact_person:  'Sofiane Merabti',
        annual_revenue:  480000.00,
        sector:          'Consulting',
        risk_level:      'low',
        status:          'prospect',
        notes:           'New client — onboarding in progress.',
        assigned_expert_id: expert3,
      },
    ];

    for (const c of clients) {
      const [existing] = await seq.query(
        'SELECT id FROM clients WHERE email = ?',
        { replacements: [c.email] }
      );
      if (existing.length > 0) {
        console.log(`  skipped client (exists): ${c.company_name}`);
        continue;
      }

      await seq.query(
        `INSERT INTO clients
          (company_name, siret, address, city, phone, email, contact_person,
           annual_revenue, sector, risk_level, status, notes, assigned_expert_id,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        {
          replacements: [
            c.company_name, c.siret, c.address, c.city, c.phone, c.email,
            c.contact_person, c.annual_revenue, c.sector, c.risk_level,
            c.status, c.notes, c.assigned_expert_id,
          ],
        }
      );
      console.log(`  inserted client: ${c.company_name} (${c.sector})`);
    }

    console.log('\nDone. All users and clients seeded.');
    await seq.close();
  } catch (e) {
    console.error(e);
    await seq.close();
    process.exit(1);
  }
}

run();
