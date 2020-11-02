// NOTE: add new enum values to the end, to ensure existing data
// is not impacted
export enum DisplayMode {
  Grid,
  List,
  Wall,
  Tagger,
}

export enum FilterMode {
  Scenes,
  Performers,
  Studios,
  Galleries,
  SceneMarkers,
  Movies,
  Tags,
  Images,
}

export interface ILabeledId {
  id: string;
  label: string;
}

export interface ILabeledValue {
  label: string;
  value: string;
}

export function encodeILabeledId(o: ILabeledId) {
  // escape \ to \\ so that it encodes to JSON correctly
  const adjustedLabel = o.label.replaceAll("\\", "\\\\");
  return { ...o, label: encodeURIComponent(adjustedLabel) };
}

export interface IOptionType {
  id: string;
  name?: string;
  image_path?: string;
}
