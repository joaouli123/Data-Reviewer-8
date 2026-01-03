import { invokeOpenAI } from './openaiClient';

export const InvokeLLM = async (prompt, responseJsonSchema = null) => {
  return invokeOpenAI(prompt, responseJsonSchema);
};

export const UploadFile = async (file) => {
  // Mock ou implementação real se necessário
  console.log('UploadFile calling backend...');
  return { success: true };
};

export const ExtractDataFromUploadedFile = async (fileId) => {
  console.log('ExtractData calling backend...');
  return { data: {} };
};
