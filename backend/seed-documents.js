const seq = require('./src/config/db');

async function run() {
  try {
    // Get the first expert user to use as uploaded_by
    const [users] = await seq.query("SELECT id FROM users WHERE role = 'expert_comptable' LIMIT 1");
    const uploaderId = users.length ? users[0].id : 1;

    // Get some project IDs
    const [projects] = await seq.query("SELECT id FROM projects ORDER BY id LIMIT 8");

    const documents = [
      { name: 'Bilan_2025.pdf', mime_type: 'application/pdf', size_bytes: 245000, file_path: 'uploads/bilan_2025.pdf', category: 'financial', project_id: projects[0]?.id || null },
      { name: 'Compte_Resultat_2025.pdf', mime_type: 'application/pdf', size_bytes: 189000, file_path: 'uploads/compte_resultat_2025.pdf', category: 'financial', project_id: projects[0]?.id || null },
      { name: 'Statuts_Entreprise_ABC.pdf', mime_type: 'application/pdf', size_bytes: 320000, file_path: 'uploads/statuts_abc.pdf', category: 'legal', project_id: projects[1]?.id || null },
      { name: 'Kbis_Entreprise_ABC.pdf', mime_type: 'application/pdf', size_bytes: 98000, file_path: 'uploads/kbis_abc.pdf', category: 'legal', project_id: projects[1]?.id || null },
      { name: 'Plan_Strategique_2026.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size_bytes: 156000, file_path: 'uploads/plan_strategique_2026.docx', category: 'report', project_id: projects[2]?.id || null },
      { name: 'Factures_Q1_2026.xlsx', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size_bytes: 412000, file_path: 'uploads/factures_q1_2026.xlsx', category: 'financial', project_id: projects[3]?.id || null },
      { name: 'Rapport_Audit_Fiscal.pdf', mime_type: 'application/pdf', size_bytes: 567000, file_path: 'uploads/rapport_audit_fiscal.pdf', category: 'report', project_id: projects[4]?.id || null },
      { name: 'Declaration_TVA_2025.pdf', mime_type: 'application/pdf', size_bytes: 78000, file_path: 'uploads/declaration_tva_2025.pdf', category: 'financial', project_id: projects[4]?.id || null },
      { name: 'Contrat_Prestation.pdf', mime_type: 'application/pdf', size_bytes: 234000, file_path: 'uploads/contrat_prestation.pdf', category: 'legal', project_id: projects[5]?.id || null },
      { name: 'Note_Conformite_RGPD.pdf', mime_type: 'application/pdf', size_bytes: 145000, file_path: 'uploads/note_conformite_rgpd.pdf', category: 'administrative', project_id: projects[7]?.id || null },
      { name: 'Registre_Traitement_Donnees.xlsx', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size_bytes: 89000, file_path: 'uploads/registre_traitement.xlsx', category: 'administrative', project_id: projects[7]?.id || null },
      { name: 'PV_Assemblee_Generale.pdf', mime_type: 'application/pdf', size_bytes: 203000, file_path: 'uploads/pv_ag.pdf', category: 'legal', project_id: projects[6]?.id || null },
    ];

    for (const d of documents) {
      await seq.query(
        'INSERT INTO documents (client_id, project_id, name, mime_type, size_bytes, file_path, category, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        { replacements: [null, d.project_id, d.name, d.mime_type, d.size_bytes, d.file_path, d.category, uploaderId] }
      );
    }

    console.log('Inserted ' + documents.length + ' sample documents');
    await seq.close();
  } catch (e) {
    console.error(e.message);
    await seq.close();
    process.exit(1);
  }
}

run();
