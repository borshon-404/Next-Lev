/**
 * Test environment: isolated database so tests never touch dev data.
 * Must run before any module instantiates the Prisma client.
 */
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://nexlev:nexlev_dev_password@127.0.0.1:5432/nexlev_test?schema=public";
(process.env as Record<string, string>).NODE_ENV = "test";
