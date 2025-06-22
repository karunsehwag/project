import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const findOrCreateContact = async (email?: string, phoneNumber?: string) => {
  // 1. Fetch all directly or indirectly related contacts
  const allContacts = await getAllLinkedContacts(email, phoneNumber);

  let primary = allContacts.find(c => c.linkPrecedence === "primary") || allContacts[0];

  // ✅ CASE: No contact exists yet (first request)
  if (!primary) {
    const newPrimary = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary",
        linkedId: null,
      },
    });

    return {
      contact: {
        primaryContatctId: newPrimary.id,
        emails: [newPrimary.email ?? ""].filter(Boolean),
        phoneNumbers: [newPrimary.phoneNumber ?? ""].filter(Boolean),
        secondaryContactIds: [],
      },
    };
  }

  // 2. Create a new contact if not already fully represented
  const alreadyExists = allContacts.find(
    c => c.email === email && c.phoneNumber === phoneNumber
  );

  if (!alreadyExists) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "secondary",
        linkedId: primary.id,
      },
    });

    allContacts.push(newContact);
  }

  // 3. Ensure all contacts point to the oldest primary
  primary = allContacts.reduce((oldest, current) => {
    return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
  }, primary);

  await Promise.all(
    allContacts.map(async contact => {
      if (contact.id !== primary.id && contact.linkedId !== primary.id) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            linkedId: primary.id,
            linkPrecedence: "secondary",
          },
        });
      }
    })
  );

  // 4. Compose final result
  const finalContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id },
      ],
    },
  });

  const emails = [...new Set(finalContacts.map(c => c.email).filter(Boolean))];
  const phoneNumbers = [...new Set(finalContacts.map(c => c.phoneNumber).filter(Boolean))];
  const secondaryIds = finalContacts
    .filter(c => c.linkPrecedence === "secondary")
    .map(c => c.id);

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryIds,
    },
  };
};

// 🔁 Utility to find all connected contacts via email or phone recursively
const getAllLinkedContacts = async (email?: string, phoneNumber?: string) => {
  const initialMatches = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined,
      ].filter(Boolean) as any,
    },
  });

  const allIds = new Set<number>();
  const queue = [...initialMatches];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (allIds.has(current.id)) continue;
    allIds.add(current.id);

    if (current.linkedId) allIds.add(current.linkedId);

    const related = await prisma.contact.findMany({
      where: {
        OR: [
          { linkedId: current.id },
          { id: current.linkedId ?? -1 },
        ],
      },
    });

    for (const rel of related) {
      if (!allIds.has(rel.id)) {
        queue.push(rel);
      }
    }
  }

  if (allIds.size === 0) return []; // ✅ fix for new contact

  return prisma.contact.findMany({
    where: {
      id: { in: [...allIds] },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};
