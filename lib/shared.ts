export const Source = "blog.dev.catalog";

export enum BlogDetailTypes {
    OPEN_API = "spec.openapi"
}

export interface OpenApiEvent {
    apiSpecs: number;
    stackName: string;
    url: string;
}