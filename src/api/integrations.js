// Local integrations - no external dependencies needed

// Mock implementations for integrations
export const Core = {
  InvokeLLM: async (params) => {
    console.warn('InvokeLLM is a stub - no AI integration available');
    return null;
  },
  SendEmail: async (params) => {
    console.warn('SendEmail is a stub - no email service available');
    return null;
  },
  UploadFile: async (params) => {
    console.warn('UploadFile is a stub - no file upload available');
    return null;
  },
  GenerateImage: async (params) => {
    console.warn('GenerateImage is a stub - no image generation available');
    return null;
  },
  ExtractDataFromUploadedFile: async (params) => {
    console.warn('ExtractDataFromUploadedFile is a stub - no extraction service available');
    return null;
  },
  CreateFileSignedUrl: async (params) => {
    console.warn('CreateFileSignedUrl is a stub - no file signing available');
    return null;
  },
  UploadPrivateFile: async (params) => {
    console.warn('UploadPrivateFile is a stub - no private file upload available');
    return null;
  }
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;






