import { registerAlias } from "../client/input";
import { connect } from "../client/mud";
import { showerr } from "../client/utils";

registerAlias("кон", () => {
  connect().catch((err) => showerr("Failed to connect: " + err.message, true));
});
