import pool, { Contact } from './database';

interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export async function identifyContact(req: IdentifyRequest): Promise<IdentifyResponse> {
  const email = req.email?.trim() || null;
  const phoneNumber = req.phoneNumber?.toString().trim() || null;

  if (!email && !phoneNumber) {
    throw new Error('At least one of email or phoneNumber is required');
  }

  // Step 1: Find all contacts matching email OR phone
  const matchingContacts = await findMatchingContacts(email, phoneNumber);

  // Step 2: No matches → create new primary contact
  if (matchingContacts.length === 0) {
    const newContact = await createContact(email, phoneNumber, null, 'primary');
    return buildResponse([newContact]);
  }

  // Step 3: Get full cluster (all related contacts)
  const allRelated = await getFullCluster(matchingContacts);

  // Step 4: Find true primary = oldest among primaries
  const primaries = allRelated.filter(c => c.linkPrecedence === 'primary');
  primaries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const truePrimary = primaries[0];

  // Step 5: Demote newer primaries to secondary
  if (primaries.length > 1) {
    for (let i = 1; i < primaries.length; i++) {
      const demoted = primaries[i];
      await pool.query(
        `UPDATE Contact SET "linkPrecedence" = 'secondary', "linkedId" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [truePrimary.id, demoted.id]
      );
      // Repoint their secondaries to the true primary
      await pool.query(
        `UPDATE Contact SET "linkedId" = $1, "updatedAt" = NOW() WHERE "linkedId" = $2`,
        [truePrimary.id, demoted.id]
      );
    }
  }

  // Step 6: Check if incoming request has new info
  const refreshed = await getClusterByPrimaryId(truePrimary.id);
  const existingEmails = new Set(refreshed.map(c => c.email).filter(Boolean));
  const existingPhones = new Set(refreshed.map(c => c.phoneNumber).filter(Boolean));

  const hasNewEmail = email && !existingEmails.has(email);
  const hasNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    await createContact(email, phoneNumber, truePrimary.id, 'secondary');
  }

  // Step 7: Build final response
  const finalCluster = await getClusterByPrimaryId(truePrimary.id);
  return buildResponse(finalCluster);
}

async function findMatchingContacts(email: string | null, phone: string | null): Promise<Contact[]> {
  const conditions: string[] = [];
  const params: string[] = [];
  let idx = 1;

  if (email) {
    conditions.push(`email = $${idx++}`);
    params.push(email);
  }
  if (phone) {
    conditions.push(`"phoneNumber" = $${idx++}`);
    params.push(phone);
  }

  if (conditions.length === 0) return [];

  const result = await pool.query(
    `SELECT * FROM Contact WHERE "deletedAt" IS NULL AND (${conditions.join(' OR ')}) ORDER BY "createdAt" ASC`,
    params
  );
  return result.rows as Contact[];
}

async function getFullCluster(contacts: Contact[]): Promise<Contact[]> {
  const allIds = new Set<number>();
  const toProcess = [...contacts];

  while (toProcess.length > 0) {
    const contact = toProcess.pop()!;
    if (allIds.has(contact.id)) continue;
    allIds.add(contact.id);

    // Get parent primary if this is secondary
    if (contact.linkedId && !allIds.has(contact.linkedId)) {
      const res = await pool.query(
        `SELECT * FROM Contact WHERE id = $1 AND "deletedAt" IS NULL`,
        [contact.linkedId]
      );
      if (res.rows[0]) toProcess.push(res.rows[0] as Contact);
    }

    // Get all children linked to this contact
    const children = await pool.query(
      `SELECT * FROM Contact WHERE "linkedId" = $1 AND "deletedAt" IS NULL`,
      [contact.id]
    );
    for (const child of children.rows as Contact[]) {
      if (!allIds.has(child.id)) toProcess.push(child);
    }
  }

  const idList = [...allIds].join(',');
  const result = await pool.query(
    `SELECT * FROM Contact WHERE id IN (${idList}) AND "deletedAt" IS NULL ORDER BY "createdAt" ASC`
  );
  return result.rows as Contact[];
}

async function getClusterByPrimaryId(primaryId: number): Promise<Contact[]> {
  const result = await pool.query(
    `SELECT * FROM Contact WHERE "deletedAt" IS NULL AND (id = $1 OR "linkedId" = $1) ORDER BY "createdAt" ASC`,
    [primaryId]
  );
  return result.rows as Contact[];
}

async function createContact(
  email: string | null,
  phoneNumber: string | null,
  linkedId: number | null,
  linkPrecedence: 'primary' | 'secondary'
): Promise<Contact> {
  const result = await pool.query(
    `INSERT INTO Contact (email, "phoneNumber", "linkedId", "linkPrecedence", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
    [email, phoneNumber, linkedId, linkPrecedence]
  );
  return result.rows[0] as Contact;
}

function buildResponse(contacts: Contact[]): IdentifyResponse {
  const primary = contacts.find(c => c.linkPrecedence === 'primary')!;
  const secondaries = contacts.filter(c => c.linkPrecedence === 'secondary');

  const emails: string[] = [];
  if (primary.email) emails.push(primary.email);
  for (const c of secondaries) {
    if (c.email && !emails.includes(c.email)) emails.push(c.email);
  }

  const phoneNumbers: string[] = [];
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
  for (const c of secondaries) {
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) phoneNumbers.push(c.phoneNumber);
  }

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map(c => c.id),
    },
  };
}