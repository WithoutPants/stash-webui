import React from "react";
import _ from "lodash";
import { Form } from "react-bootstrap";
import {
  ParseSceneFilenamesQuery,
  SlimSceneDataFragment,
} from "src/core/generated-graphql";
import {
  PerformerSelect,
  TagSelect,
  StudioSelect,
} from "src/components/Shared";
import { TextUtils } from "src/utils";

class ParserResult<T> {
  public value?: T;
  public originalValue?: T;
  public isSet: boolean = false;

  public setOriginalValue(value?: T) {
    this.originalValue = value;
    this.value = value;
  }

  public setValue(value?: T) {
    if (value) {
      this.value = value;
      this.isSet = !_.isEqual(this.value, this.originalValue);
    }
  }
}

export class SceneParserResult {
  public id: string;
  public filename: string;
  public title: ParserResult<string> = new ParserResult<string>();
  public date: ParserResult<string> = new ParserResult<string>();

  public studio: ParserResult<string> = new ParserResult<string>();
  public tags: ParserResult<string[]> = new ParserResult<string[]>();
  public performers: ParserResult<string[]> = new ParserResult<string[]>();

  public scene: SlimSceneDataFragment;

  constructor(
    result: ParseSceneFilenamesQuery["parseSceneFilenames"]["results"][0]
  ) {
    this.scene = result.scene;

    this.id = this.scene.id;
    this.filename = TextUtils.fileNameFromPath(this.scene.path);
    this.title.setOriginalValue(this.scene.title ?? undefined);
    this.date.setOriginalValue(this.scene.date ?? undefined);
    this.performers.setOriginalValue(this.scene.performers.map((p) => p.id));
    this.tags.setOriginalValue(this.scene.tags.map((t) => t.id));
    this.studio.setOriginalValue(this.scene.studio?.id);

    this.title.setValue(result.title ?? undefined);
    this.date.setValue(result.date ?? undefined);
  }

  // returns true if any of its fields have set == true
  public isChanged() {
    return (
      this.title.isSet ||
      this.date.isSet ||
      this.performers.isSet ||
      this.studio.isSet ||
      this.tags.isSet
    );
  }

  public toSceneUpdateInput() {
    return {
      id: this.id,
      details: this.scene.details,
      url: this.scene.url,
      rating: this.scene.rating,
      gallery_id: this.scene.gallery?.id,
      title: this.title.isSet ? this.title.value : this.scene.title,
      date: this.date.isSet ? this.date.value : this.scene.date,
      studio_id: this.studio.isSet ? this.studio.value : this.scene.studio?.id,
      performer_ids: this.performers.isSet
        ? this.performers.value
        : this.scene.performers.map((performer) => performer.id),
      tag_ids: this.tags.isSet
        ? this.tags.value
        : this.scene.tags.map((tag) => tag.id),
    };
  }
}

interface ISceneParserFieldProps<T> {
  parserResult: ParserResult<T>;
  className?: string;
  fieldName: string;
  onSetChanged: (isSet: boolean) => void;
  onValueChanged: (value: T) => void;
  originalParserResult?: ParserResult<T>;
}

function SceneParserStringField(props: ISceneParserFieldProps<string>) {
  function maybeValueChanged(value: string) {
    if (value !== props.parserResult.value) {
      props.onValueChanged(value);
    }
  }

  const result = props.originalParserResult || props.parserResult;

  return (
    <>
      <td>
        <Form.Check
          checked={props.parserResult.isSet}
          onChange={() => {
            props.onSetChanged(!props.parserResult.isSet);
          }}
        />
      </td>
      <td>
        <Form.Group>
          <Form.Control
            disabled
            className={props.className}
            defaultValue={result.originalValue || ""}
          />
          <Form.Control
            disabled={!props.parserResult.isSet}
            className={props.className}
            value={props.parserResult.value || ""}
            onChange={(event: React.FormEvent<HTMLInputElement>) =>
              maybeValueChanged(event.currentTarget.value)
            }
          />
        </Form.Group>
      </td>
    </>
  );
}

function SceneParserPerformerField(props: ISceneParserFieldProps<string[]>) {
  function maybeValueChanged(value: string[]) {
    if (value !== props.parserResult.value) {
      props.onValueChanged(value);
    }
  }

  const originalPerformers = (props.originalParserResult?.originalValue ??
    []) as string[];
  const newPerformers = props.parserResult.value ?? [];

  return (
    <>
      <td>
        <Form.Check
          checked={props.parserResult.isSet}
          onChange={() => {
            props.onSetChanged(!props.parserResult.isSet);
          }}
        />
      </td>
      <td>
        <Form.Group className={props.className}>
          <PerformerSelect isDisabled isMulti ids={originalPerformers} />
          <PerformerSelect
            isMulti
            onSelect={(items) => {
              maybeValueChanged(items.map((i) => i.id));
            }}
            ids={newPerformers}
          />
        </Form.Group>
      </td>
    </>
  );
}

function SceneParserTagField(props: ISceneParserFieldProps<string[]>) {
  function maybeValueChanged(value: string[]) {
    if (value !== props.parserResult.value) {
      props.onValueChanged(value);
    }
  }

  const originalTags = props.originalParserResult?.originalValue ?? [];
  const newTags = props.parserResult.value ?? [];

  return (
    <>
      <td>
        <Form.Check
          checked={props.parserResult.isSet}
          onChange={() => {
            props.onSetChanged(!props.parserResult.isSet);
          }}
        />
      </td>
      <td>
        <Form.Group className={props.className}>
          <TagSelect isDisabled isMulti ids={originalTags} />
          <TagSelect
            isMulti
            onSelect={(items) => {
              maybeValueChanged(items.map((i) => i.id));
            }}
            ids={newTags}
          />
        </Form.Group>
      </td>
    </>
  );
}

function SceneParserStudioField(props: ISceneParserFieldProps<string>) {
  function maybeValueChanged(value: string) {
    if (value !== props.parserResult.value) {
      props.onValueChanged(value);
    }
  }

  const originalStudio = props.originalParserResult?.originalValue
    ? [props.originalParserResult?.originalValue]
    : [];
  const newStudio = props.parserResult.value ? [props.parserResult.value] : [];

  return (
    <>
      <td>
        <Form.Check
          checked={props.parserResult.isSet}
          onChange={() => {
            props.onSetChanged(!props.parserResult.isSet);
          }}
        />
      </td>
      <td>
        <Form.Group className={props.className}>
          <StudioSelect isDisabled ids={originalStudio} />
          <StudioSelect
            onSelect={(items) => {
              maybeValueChanged(items[0].id);
            }}
            ids={newStudio}
          />
        </Form.Group>
      </td>
    </>
  );
}

interface ISceneParserRowProps {
  scene: SceneParserResult;
  onChange: (changedScene: SceneParserResult) => void;
  showFields: Map<string, boolean>;
}

export const SceneParserRow = (props: ISceneParserRowProps) => {
  function changeParser<T>(result: ParserResult<T>, isSet: boolean, value: T) {
    const newParser = _.clone(result);
    newParser.isSet = isSet;
    newParser.value = value;
    return newParser;
  }

  function onTitleChanged(set: boolean, value: string) {
    const newResult = _.clone(props.scene);
    newResult.title = changeParser(newResult.title, set, value);
    props.onChange(newResult);
  }

  function onDateChanged(set: boolean, value: string) {
    const newResult = _.clone(props.scene);
    newResult.date = changeParser(newResult.date, set, value);
    props.onChange(newResult);
  }

  function onPerformerIdsChanged(set: boolean, value: string[]) {
    const newResult = _.clone(props.scene);
    newResult.performers = changeParser(newResult.performers, set, value);
    props.onChange(newResult);
  }

  function onTagIdsChanged(set: boolean, value: string[]) {
    const newResult = _.clone(props.scene);
    newResult.tags = changeParser(newResult.tags, set, value);
    props.onChange(newResult);
  }

  function onStudioIdChanged(set: boolean, value: string) {
    const newResult = _.clone(props.scene);
    newResult.studio = changeParser(newResult.studio, set, value);
    props.onChange(newResult);
  }

  return (
    <tr className="scene-parser-row">
      <td className="text-left parser-field-filename">
        {props.scene.filename}
      </td>
      {props.showFields.get("Title") && (
        <SceneParserStringField
          key="title"
          fieldName="Title"
          className="parser-field-title"
          parserResult={props.scene.title}
          onSetChanged={(isSet) =>
            onTitleChanged(isSet, props.scene.title.value ?? "")
          }
          onValueChanged={(value) =>
            onTitleChanged(props.scene.title.isSet, value)
          }
        />
      )}
      {props.showFields.get("Date") && (
        <SceneParserStringField
          key="date"
          fieldName="Date"
          className="parser-field-date"
          parserResult={props.scene.date}
          onSetChanged={(isSet) =>
            onDateChanged(isSet, props.scene.date.value ?? "")
          }
          onValueChanged={(value) =>
            onDateChanged(props.scene.date.isSet, value)
          }
        />
      )}
      {props.showFields.get("Performers") && (
        <SceneParserPerformerField
          key="performers"
          fieldName="Performers"
          className="parser-field-performers"
          parserResult={props.scene.performers}
          originalParserResult={props.scene.performers}
          onSetChanged={(set) =>
            onPerformerIdsChanged(set, props.scene.performers.value ?? [])
          }
          onValueChanged={(value) =>
            onPerformerIdsChanged(props.scene.performers.isSet, value)
          }
        />
      )}
      {props.showFields.get("Tags") && (
        <SceneParserTagField
          key="tags"
          fieldName="Tags"
          className="parser-field-tags"
          parserResult={props.scene.tags}
          originalParserResult={props.scene.tags}
          onSetChanged={(isSet) =>
            onTagIdsChanged(isSet, props.scene.tags.value ?? [])
          }
          onValueChanged={(value) =>
            onTagIdsChanged(props.scene.tags.isSet, value)
          }
        />
      )}
      {props.showFields.get("Studio") && (
        <SceneParserStudioField
          key="studio"
          fieldName="Studio"
          className="parser-field-studio"
          parserResult={props.scene.studio}
          originalParserResult={props.scene.studio}
          onSetChanged={(set) =>
            onStudioIdChanged(set, props.scene.studio.value ?? "")
          }
          onValueChanged={(value) =>
            onStudioIdChanged(props.scene.studio.isSet, value)
          }
        />
      )}
    </tr>
  );
};
