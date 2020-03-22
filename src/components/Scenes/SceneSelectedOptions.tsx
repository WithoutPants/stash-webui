import React, { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import _ from "lodash";
import { StashService } from "src/core/StashService";
import * as GQL from "src/core/generated-graphql";
import {
  StudioSelect,
  LoadingIndicator
} from "src/components/Shared";
import { useToast } from "src/hooks";
import MultiSet from "../Shared/MultiSet";

interface IListOperationProps {
  selected: GQL.SlimSceneDataFragment[];
  onScenesUpdated: () => void;
}

export const SceneSelectedOptions: React.FC<IListOperationProps> = (
  props: IListOperationProps
) => {
  const Toast = useToast();
  const [rating, setRating] = useState<string>("");
  const [studioId, setStudioId] = useState<string>();
  const [performerMode, setPerformerMode] = React.useState<GQL.BulkUpdateIdMode>(GQL.BulkUpdateIdMode.Add);
  const [performerIds, setPerformerIds] = useState<string[]>();
  const [tagMode, setTagMode] = React.useState<GQL.BulkUpdateIdMode>(GQL.BulkUpdateIdMode.Add);
  const [tagIds, setTagIds] = useState<string[]>();

  const [updateScenes] = StashService.useBulkSceneUpdate(getSceneInput());

  // Network state
  const [isLoading, setIsLoading] = useState(true);

  function makeBulkUpdateIds(ids: string[], mode: GQL.BulkUpdateIdMode) : GQL.BulkUpdateIds {
    return {
      mode,
      ids
    };
  }

  function getSceneInput(): GQL.BulkSceneUpdateInput {
    // need to determine what we are actually setting on each scene
    const aggregateRating = getRating(props.selected);
    const aggregateStudioId = getStudioId(props.selected);
    const aggregatePerformerIds = getPerformerIds(props.selected);
    const aggregateTagIds = getTagIds(props.selected);

    const sceneInput: GQL.BulkSceneUpdateInput = {
      ids: props.selected.map(scene => {
        return scene.id;
      })
    };

    // if rating is undefined
    if (rating === "") {
      // and all scenes have the same rating, then we are unsetting the rating.
      if (aggregateRating) {
        // an undefined rating is ignored in the server, so set it to 0 instead
        sceneInput.rating = 0;
      }
      // otherwise not setting the rating
    } else {
      // if rating is set, then we are setting the rating for all
      sceneInput.rating = Number.parseInt(rating, 10);
    }

    // if studioId is undefined
    if (studioId === undefined) {
      // and all scenes have the same studioId,
      // then unset the studioId, otherwise ignoring studioId
      if (aggregateStudioId) {
        // an undefined studio_id is ignored in the server, so set it to empty string instead
        sceneInput.studio_id = "";
      }
    } else {
      // if studioId is set, then we are setting it
      sceneInput.studio_id = studioId;
    }

    // if performerIds are empty
    if (performerMode === GQL.BulkUpdateIdMode.Set && (!performerIds || performerIds.length === 0)) {
      // and all scenes have the same ids,
      if (aggregatePerformerIds.length > 0) {
        // then unset the performerIds, otherwise ignore
        sceneInput.performer_ids = makeBulkUpdateIds(performerIds || [], performerMode);
      }
    } else {
      // if performerIds non-empty, then we are setting them
      sceneInput.performer_ids = makeBulkUpdateIds(performerIds || [], performerMode);
    }

    // if tagIds non-empty, then we are setting them
    if (tagMode === GQL.BulkUpdateIdMode.Set && (!tagIds || tagIds.length === 0)) {
      // and all scenes have the same ids,
      if (aggregateTagIds.length > 0) {
        // then unset the tagIds, otherwise ignore
        sceneInput.tag_ids = makeBulkUpdateIds(tagIds || [], tagMode);
      }
    } else {
      // if tagIds non-empty, then we are setting them
      sceneInput.tag_ids = makeBulkUpdateIds(tagIds || [], tagMode);
    }

    return sceneInput;
  }

  async function onSave() {
    setIsLoading(true);
    try {
      await updateScenes();
      Toast.success({ content: "Updated scenes" });
    } catch (e) {
      Toast.error(e);
    }
    setIsLoading(false);
    props.onScenesUpdated();
  }

  function getRating(state: GQL.SlimSceneDataFragment[]) {
    let ret: number | undefined;
    let first = true;

    state.forEach((scene: GQL.SlimSceneDataFragment) => {
      if (first) {
        ret = scene.rating ?? undefined;
        first = false;
      } else if (ret !== scene.rating) {
        ret = undefined;
      }
    });

    return ret;
  }

  function getStudioId(state: GQL.SlimSceneDataFragment[]) {
    let ret: string | undefined;
    let first = true;

    state.forEach((scene: GQL.SlimSceneDataFragment) => {
      if (first) {
        ret = scene?.studio?.id;
        first = false;
      } else {
        const studio = scene?.studio?.id;
        if (ret !== studio) {
          ret = undefined;
        }
      }
    });

    return ret;
  }

  function getPerformerIds(state: GQL.SlimSceneDataFragment[]) {
    let ret: string[] = [];
    let first = true;

    state.forEach((scene: GQL.SlimSceneDataFragment) => {
      if (first) {
        ret = scene.performers ? scene.performers.map(p => p.id).sort() : [];
        first = false;
      } else {
        const perfIds = scene.performers
          ? scene.performers.map(p => p.id).sort()
          : [];

        if (!_.isEqual(ret, perfIds)) {
          ret = [];
        }
      }
    });

    return ret;
  }

  function getTagIds(state: GQL.SlimSceneDataFragment[]) {
    let ret: string[] = [];
    let first = true;

    state.forEach((scene: GQL.SlimSceneDataFragment) => {
      if (first) {
        ret = scene.tags ? scene.tags.map(t => t.id).sort() : [];
        first = false;
      } else {
        const tIds = scene.tags ? scene.tags.map(t => t.id).sort() : [];

        if (!_.isEqual(ret, tIds)) {
          ret = [];
        }
      }
    });

    return ret;
  }

  useEffect(() => {
    const state = props.selected;
    let updateRating = "";
    let updateStudioID: string | undefined;
    let updatePerformerIds: string[] = [];
    let updateTagIds: string[] = [];
    let first = true;

    state.forEach((scene: GQL.SlimSceneDataFragment) => {
      const sceneRating = scene.rating?.toString() ?? "";
      const sceneStudioID = scene?.studio?.id;
      const scenePerformerIDs = (scene.performers ?? []).map(p => p.id).sort();
      const sceneTagIDs = (scene.tags ?? []).map(p => p.id).sort();

      if (first) {
        updateRating = sceneRating;
        updateStudioID = sceneStudioID;
        updatePerformerIds = scenePerformerIDs;
        updateTagIds = sceneTagIDs;
        first = false;
      } else {
        if (sceneRating !== updateRating) {
          updateRating = "";
        }
        if (sceneStudioID !== updateStudioID) {
          updateStudioID = undefined;
        }
        if (!_.isEqual(scenePerformerIDs, updatePerformerIds)) {
          updatePerformerIds = [];
        }
        if (!_.isEqual(sceneTagIDs, updateTagIds)) {
          updateTagIds = [];
        }
      }
    });

    setRating(updateRating);
    setStudioId(updateStudioID);
    if (performerMode === GQL.BulkUpdateIdMode.Set) {
      setPerformerIds(updatePerformerIds);
    }

    if (tagMode === GQL.BulkUpdateIdMode.Set) {
      setTagIds(updateTagIds);
    }
    
    setIsLoading(false);
  }, [props.selected, performerMode, tagMode]);

  function renderMultiSelect(
    type: "performers" | "tags",
    ids: string[] | undefined
  ) {
    let mode = GQL.BulkUpdateIdMode.Add;
    switch (type) {
      case "performers": mode = performerMode; break;
      case "tags": mode = tagMode; break;
    }

    return (
      <MultiSet
        type={type}
        onUpdate={items => {
          const itemIDs = items.map(i => i.id);
          switch (type) {
            case "performers":
              setPerformerIds(itemIDs);
              break;
            case "tags":
              setTagIds(itemIDs);
              break;
          }
        }}
        onSetMode={(mode) => {
          switch (type) {
            case "performers": setPerformerMode(mode); break;
            case "tags": setTagMode(mode); break;
          }
        }}
        ids={ids ?? []}
        mode={mode}
      />
    );
  }

  if (isLoading) return <LoadingIndicator />;

  function render() {
    return (
      <div className="operation-container">
        <Form.Group
          controlId="rating"
          className="operation-item rating-operation"
        >
          <Form.Label>Rating</Form.Label>
          <Form.Control
            as="select"
            className="btn-secondary"
            value={rating}
            onChange={(event: React.FormEvent<HTMLSelectElement>) =>
              setRating(event.currentTarget.value)
            }
          >
            {["", "1", "2", "3", "4", "5"].map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Form.Control>
        </Form.Group>

        <Form.Group controlId="studio" className="operation-item">
          <Form.Label>Studio</Form.Label>
          <StudioSelect
            onSelect={items => setStudioId(items[0]?.id)}
            ids={studioId ? [studioId] : []}
          />
        </Form.Group>

        <Form.Group className="operation-item" controlId="performers">
          <Form.Label>Performers</Form.Label>
          {renderMultiSelect("performers", performerIds)}
        </Form.Group>

        <Form.Group className="operation-item" controlId="performers">
          <Form.Label>Tags</Form.Label>
          {renderMultiSelect("tags", tagIds)}
        </Form.Group>

        <Button variant="primary" onClick={onSave} className="apply-operation">
          Apply
        </Button>
      </div>
    );
  }

  return render();
};
