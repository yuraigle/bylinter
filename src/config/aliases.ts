import { registerAlias } from "../client/input";
import { sendl } from "../client/mud";

registerAlias("возврат", () => {
  sendl("взять свиток.возврата сумка;зачитать свиток.возврата");
});
