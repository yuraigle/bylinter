import { bootstrap } from "./bootstrap";
import { loadUserConfig } from "./client/configLoader";

bootstrap();
await loadUserConfig();
