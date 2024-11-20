// import { emit } from '@create-figma-plugin/utilities';
// import { LOG_UPDATED } from './events';
// const LOG_KEY = 'LOG';

// const Log = {
//   clear: async () => {
//     const clearLog: string[] = [];
//     await figma.clientStorage.setAsync(LOG_KEY, clearLog);
//     emit(LOG_UPDATED, clearLog);
//   },

//   append: async (message: string) => {
//     // Retrieve existing log
//     let existingLog = await figma.clientStorage.getAsync(LOG_KEY);
//     if (!existingLog) {
//       existingLog = [];
//     }

//     // Append new message
//     existingLog.push(message);

//     // Store updated log
//     await figma.clientStorage.setAsync(LOG_KEY, existingLog);
//   },
//   content: async () => {
//     return await figma.clientStorage.getAsync(LOG_KEY);
//   },
// };

// export default Log;
