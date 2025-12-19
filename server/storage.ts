// Storage interface for CRUD operations
// Extend this interface with methods as needed for your application

export interface IStorage {
  // Add storage methods here as needed
}

export class MemStorage implements IStorage {
  constructor() {
    // Initialize storage as needed
  }
}

export const storage = new MemStorage();
