import { emit } from '@create-figma-plugin/utilities';
import { LOG_UPDATED } from './events';
const LOG_KEY = 'LOG';

const Log = {
  clear: async (message?: string) => {
    const clearLog: string[] = [];
    await figma.clientStorage.setAsync(LOG_KEY, clearLog);
    emit(LOG_UPDATED, clearLog);
  },

  append: async (message: string) => {
    let existingLog = await figma.clientStorage.getAsync(LOG_KEY);
    if (!existingLog) existingLog = [];
    existingLog.push(message);

    await figma.clientStorage.setAsync(LOG_KEY, existingLog);

    emit(LOG_UPDATED, existingLog);
  },
};

export default Log;
