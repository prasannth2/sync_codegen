import z from "zod";

export type Dynamic = {
  [key:string]: any
};

export type DynamicRepository = {

  selectApiById(path:string, id: string): Promise<Dynamic | null>;

  selectApis(
    path:string,
    filters?: any[],
    limit?: number,
  ): Promise<Dynamic[]>;

};