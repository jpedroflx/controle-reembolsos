/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts", "!src/tests/**"],
  coverageDirectory: "coverage",
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/tests/**/*.test.ts"]
};
