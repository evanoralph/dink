declare module "meteor/email" {
  export const Email: {
    sendAsync(options: {
      from: string;
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
    }): Promise<void>;
  };
}
