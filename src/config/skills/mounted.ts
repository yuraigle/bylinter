import { registerTrigger, sendline } from "../../client";
import { getState } from "../state";

let mountCommand = "показать фокус"; // шапочка ДНЗ
registerTrigger(/^Вы взяли и засунули.+ прямо в былинную шляпу фокусов/, () =>
  sendline("показать фокус"),
);

let roomNoMount: boolean = false;
let stepsWithoutMount: number = 0;

function profUsesHorse() {
  const prof = getState().me.prof || "";
  return ["кузнец", "охотник", "витязь"].includes(prof);
}

registerTrigger(/^Вы поплелись /, () => {
  if (!profUsesHorse()) return;

  roomNoMount = false;
  stepsWithoutMount++;

  if (stepsWithoutMount > 5 && !roomNoMount) {
    sendline(mountCommand);
    stepsWithoutMount = 0;
  }
});

registerTrigger(/ несет вас на своей спине\.\s*$/, () => {
  roomNoMount = false;
  stepsWithoutMount = 0;
});

registerTrigger(
  / взбрыкнула? и отказал...? вас слушаться\./,
  () => (roomNoMount = true),
);

registerTrigger(/^Ваша? .+ не в состоянии пройти туда\./, () =>
  sendline("соск;гг соскочил"),
);

registerTrigger(/^Вы упали с .+./, () => sendline("вст;вск"));
registerTrigger(/ сбросила? вас со своей спины\./, () => sendline("вст;вск"));

registerTrigger(/ \(под седлом\) (стоит|летает|плавает) здесь\.\s*$/, () => {
  if (profUsesHorse()) sendline("вск");
});
