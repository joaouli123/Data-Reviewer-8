import { base44 } from './base44Client';
import { invokeGemini } from './geminiClient';

export const Core = {
  InvokeLLM: invokeGemini,
  SendEmail: base44.integrations.Core.SendEmail,
  UploadFile: base44.integrations.Core.UploadFile,
  GenerateImage: base44.integrations.Core.GenerateImage,
  ExtractDataFromUploadedFile: base44.integrations.Core.ExtractDataFromUploadedFile,
  CreateFileSignedUrl: base44.integrations.Core.CreateFileSignedUrl,
  UploadPrivateFile: base44.integrations.Core.UploadPrivateFile,
};

export const InvokeLLM = invokeGemini;

export const SendEmail = base44.integrations.Core.SendEmail;

export const UploadFile = base44.integrations.Core.UploadFile;

export const GenerateImage = base44.integrations.Core.GenerateImage;

export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile;

export const CreateFileSignedUrl = base44.integrations.Core.CreateFileSignedUrl;

export const UploadPrivateFile = base44.integrations.Core.UploadPrivateFile;






