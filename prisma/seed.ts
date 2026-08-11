import { PrismaClient } from "../app/generated/prisma/client";
import { createDbAdapter } from "../lib/dbAdapter";

const adapter = createDbAdapter(process.env.DATABASE_URL ?? "file:./dev.db");
const prisma = new PrismaClient({ adapter });

const SEED_USERS = [
  { name: "Alice Chen", email: "alice@example.com" },
  { name: "Bob Martinez", email: "bob@example.com" },
  { name: "Carla Devi", email: "carla@example.com" },
];

async function main() {
  const users = [];
  for (const u of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    users.push(user);
  }

  const existing = await prisma.document.count();
  if (existing === 0) {
    const [alice, bob] = users;
    const welcomeDoc = await prisma.document.create({
      data: {
        title: "Welcome to Docs",
        ownerId: alice.id,
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Welcome to Docs" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This is a seeded example document owned by Alice. Try editing it, then share it with Bob or Carla using the Share button.",
                },
              ],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Bold, italic, underline formatting" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Headings and lists" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "File upload and sharing" }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
    });

    await prisma.documentShare.create({
      data: {
        documentId: welcomeDoc.id,
        userId: bob.id,
        permission: "EDIT",
      },
    });
  }

  console.log("Seed complete:", users.map((u) => u.email).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
