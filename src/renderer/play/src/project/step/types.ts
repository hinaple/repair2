import type { Types } from "@shared/projectData/types";
import type { PayloadTemplates } from "@shared/projectData/typePayload";

type Step = Types.Step;
type TemplateKey<T> = Exclude<keyof T, "$types"> & string;

type JoinPath<P extends string, K extends string> = P extends "" ? K : `${P}.${K}`;

type StepActionTree<T, Prefix extends string = ""> = {
  [K in TemplateKey<T>]: T[K] extends { readonly $types: true }
    ? StepActionTree<T[K], JoinPath<Prefix, K>>
    : (step: Extract<Step, { type: JoinPath<Prefix, K> }>) => void | boolean | Promise<unknown>;
};

export type StepAction = StepActionTree<typeof PayloadTemplates.step>;
