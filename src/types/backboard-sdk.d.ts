declare module "backboard-sdk" {
  export interface BackboardClientConfig {
    apiKey: string;
    baseUrl?: string;
  }

  export interface Assistant {
    assistantId: string;
    name?: string;
    description?: string;
  }

  export interface Thread {
    threadId: string;
    assistantId?: string;
  }

  export interface Memory {
    memoryId: string;
    content?: string;
    metadata?: Record<string, unknown>;
  }

  export interface AddMemoryOptions {
    content: string;
    metadata?: Record<string, unknown>;
  }

  export interface AddMessageOptions {
    content: string;
    llm_provider?: string;
    model_name?: string;
    memory?: "auto" | "readonly" | "off";
  }

  export interface MessageResponse {
    content: string;
    messageId?: string;
  }

  export class BackboardClient {
    constructor(config: BackboardClientConfig);

    listAssistants(): Promise<Assistant[]>;
    createAssistant(options: { name: string; description?: string }): Promise<Assistant>;
    createThread(assistantId: string): Promise<Thread>;
    listThreads(assistantId: string): Promise<Thread[]>;
    addMemory(assistantId: string, options: AddMemoryOptions): Promise<Memory>;
    deleteMemory(assistantId: string, memoryId: string): Promise<void>;
    addMessage(threadId: string, options: AddMessageOptions): Promise<MessageResponse>;
  }
}
