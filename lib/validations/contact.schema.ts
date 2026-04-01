import { z } from "zod";

export const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().max(200).optional(),
  subject: z.string().min(1, "Subject is required").max(300),
  reason: z.string().optional(),
  message: z.string().min(10, "Please write at least 10 characters").max(5000),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const demoFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().min(1, "Company name is required").max(200),
  aum: z.string().optional(),
  role: z.string().optional(),
  // calendar-mode only
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
});

export type DemoFormInput = z.infer<typeof demoFormSchema>;
