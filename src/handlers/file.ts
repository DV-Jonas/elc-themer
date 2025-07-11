import { emit } from '@create-figma-plugin/utilities';
import { FILE_NAME } from '../events';

const getFileNameHandler = () => {
  const fileName = figma.root.name;
  emit(FILE_NAME, fileName);
  return fileName;
};

export { getFileNameHandler };
