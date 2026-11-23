export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  xinusAiProvider: process.env.XINUS_AI_PROVIDER ?? "",
  bedrockApiKey: process.env.AWS_BEARER_TOKEN_BEDROCK ?? process.env.XINUS_BEDROCK_API_KEY ?? "",
  bedrockRegion: process.env.XINUS_BEDROCK_REGION ?? "eu-west-1",
  bedrockModel: process.env.XINUS_BEDROCK_MODEL ?? "",
  privateStorageDir: process.env.XINUS_PRIVATE_STORAGE_DIR ?? "",
  // Temporary beta mode: set XINUS_BETA_AUTH_BYPASS=false to restore OAuth.
  betaAuthBypass: process.env.XINUS_BETA_AUTH_BYPASS !== "false",
};
