import { registerSubstitute } from "../client/triggers";

// Какой-то дебаг мне Стрибог добавил
registerSubstitute((line) => line.replaceAll(/^\x1b\[1;33mСкилл: .*\r?\n/gm, ''));
registerSubstitute((line) => line.replaceAll(/^(\x1b\[[0-9;]*m)?Дамага .*\r?\n/gm, ''));

// registerSubstitute(/\.\.\.окружен.? огненным щитом\s*/, (text: string) => {
//   return text.replaceAll(
//     /\r?\n\.\.\.окружен.? огненным щитом\s*\r?\n/g,
//     " [ОгнЩит]\n",
//   );
// });

// registerSubstitute(/\.\.\.окружен.? ледяным щитом\s*/, (text: string) => {
//   return text.replaceAll(
//     /\r?\n\.\.\.окружен.? ледяным щитом\s*\r?\n/g,
//     " [ЛедЩит]\n",
//   );
// });

// registerSubstitute(/\.\.\.окружен.? воздушным щитом\s*/, (text: string) => {
//   return text.replaceAll(
//     /\r?\n\.\.\.окружен.? воздушным щитом\s*\r?\n/g,
//     " [ВоздЩит]\n",
//   );
// });

// registerSubstitute(
//   /\.\.\.окружен.? воздушным, ледяным щитами\s*/,
//   (text: string) => {
//     return text.replaceAll(
//       /\r?\n\.\.\.окружен.? воздушным, ледяным щитами\s*\r?\n/g,
//       " [ВоздЩит] [ЛедЩит]\n",
//     );
//   },
// );

// registerSubstitute(
//   /\.\.\.окружен.? огненным, ледяным щитами\s*/,
//   (text: string) => {
//     return text.replaceAll(
//       /\r?\n\.\.\.окружен.? огненным, ледяным щитами\s*\r?\n/g,
//       " [ОгнЩит] [ЛедЩит]\n",
//     );
//   },
// );

// registerSubstitute(/\.\.\.окутан сверкающим коконом\s*/, (text: string) => {
//   return text.replaceAll(
//     /\r?\n\.\.\.окутан сверкающим коконом\s*\r?\n/g,
//     " [ЗБ]\n",
//   );
// });
