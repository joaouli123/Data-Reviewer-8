import { invokeOpenAI } from './openaiClient';

// Integrations locais sem dependências externas
export const Core = {
  InvokeLLM: invokeOpenAI,
  SendEmail: async () => null,
  UploadFile: async () => null,
  GenerateImage: async () => null,
  ExtractDataFromUploadedFile: async () => null,
  CreateFileSignedUrl: async () => null,
  UploadPrivateFile: async () => null,
};

export const InvokeLLM = invokeOpenAI;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;






