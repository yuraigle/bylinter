import { registerAlias } from "../client/input";
import { connect } from "../client/mud";
import { systemError } from "../client/utils";

registerAlias("кон", () => {
  connect().catch((err) => systemError("Failed to connect: " + err.message));
});
