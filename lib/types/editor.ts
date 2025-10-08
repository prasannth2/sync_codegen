/* ---------- Types ---------- */
export type ApiRec = { _id?: string; name: string; key?: string };
export type FunctionRec = { _id: string; api_id?: string; name: string; key?: string };
export type ModelRec = {
  name: string;
  collectionName?: string;
  type?: string;
  isView?: boolean;
  estimatedCount?: number;
  schemaKind?: string;
};

export type MentionApi = {
  mention_type: "apis";
  id: string;
  name: string;
  data: ApiRec;
};
export type MentionFunction = {
  mention_type: "functions";
  id: string; // function _id
  name: string; // function name
  data: FunctionRec;
};
export type MentionModel = {
  mention_type: "models";
  id: string; // prefer collectionName, else name
  name: string; // collectionName|name
  data: ModelRec;
};

export type Mention = MentionApi | MentionFunction | MentionModel;

export type GroupKey = "api" | "function" | "model";

export type Item = {
  id?: string;
  key?: string;
  name: string;
  description?: string;
  kind: GroupKey;
  collectionName?: string; // for models
};

export type Group = {
  key: GroupKey;
  title: string;
  items: Item[];
};

export type SlashItem = {
  name: string;
  description?: string;
  kind?: "field";
  meta: { source: "input" | "output" | "model"; modelName: string; path: string; valueType?: string };
};

export type SlashGroup = { key: string; title: string; items: SlashItem[] };
