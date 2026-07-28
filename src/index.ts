import { bootstrap } from "./bootstrap";
import { ConfigLoaderService } from "./client/ConfigLoaderService";
import { showme } from "./client";

bootstrap();

const configLoader = new ConfigLoaderService(showme);
await configLoader.loadUserConfig();
