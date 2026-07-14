import { registerAlias, sendl } from "../client";

registerAlias("возврат", () => {
  sendl("взять свиток.возврата сумка;зачитать свиток.возврата");
});
