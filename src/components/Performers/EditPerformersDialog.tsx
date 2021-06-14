import React, { useEffect, useState } from "react";
import { Form, Col, Row } from "react-bootstrap";
import { FormattedMessage, useIntl } from "react-intl";
import _ from "lodash";
import { useBulkPerformerUpdate } from "src/core/StashService";
import * as GQL from "src/core/generated-graphql";
import { Modal } from "src/components/Shared";
import { useToast } from "src/hooks";
import { FormUtils } from "src/utils";
import MultiSet from "../Shared/MultiSet";
import { RatingStars } from "../Scenes/SceneDetails/RatingStars";

interface IListOperationProps {
  selected: GQL.SlimPerformerDataFragment[];
  onClose: (applied: boolean) => void;
}

export const EditPerformersDialog: React.FC<IListOperationProps> = (
  props: IListOperationProps
) => {
  const intl = useIntl();
  const Toast = useToast();
  const [rating, setRating] = useState<number>();
  const [tagMode, setTagMode] = React.useState<GQL.BulkUpdateIdMode>(
    GQL.BulkUpdateIdMode.Add
  );
  const [tagIds, setTagIds] = useState<string[]>();
  const [favorite, setFavorite] = useState<boolean | undefined>();

  const [updatePerformers] = useBulkPerformerUpdate(getPerformerInput());

  // Network state
  const [isUpdating, setIsUpdating] = useState(false);

  const checkboxRef = React.createRef<HTMLInputElement>();

  function makeBulkUpdateIds(
    ids: string[],
    mode: GQL.BulkUpdateIdMode
  ): GQL.BulkUpdateIds {
    return {
      mode,
      ids,
    };
  }

  function getPerformerInput(): GQL.BulkPerformerUpdateInput {
    // need to determine what we are actually setting on each performer
    const aggregateTagIds = getTagIds(props.selected);
    const aggregateRating = getRating(props.selected);

    const performerInput: GQL.BulkPerformerUpdateInput = {
      ids: props.selected.map((performer) => {
        return performer.id;
      }),
    };

    // if rating is undefined
    if (rating === undefined) {
      // and all galleries have the same rating, then we are unsetting the rating.
      if (aggregateRating) {
        // null to unset rating
        performerInput.rating = null;
      }
      // otherwise not setting the rating
    } else {
      // if rating is set, then we are setting the rating for all
      performerInput.rating = rating;
    }

    // if tagIds non-empty, then we are setting them
    if (
      tagMode === GQL.BulkUpdateIdMode.Set &&
      (!tagIds || tagIds.length === 0)
    ) {
      // and all performers have the same ids,
      if (aggregateTagIds.length > 0) {
        // then unset the tagIds, otherwise ignore
        performerInput.tag_ids = makeBulkUpdateIds(tagIds || [], tagMode);
      }
    } else {
      // if tagIds non-empty, then we are setting them
      performerInput.tag_ids = makeBulkUpdateIds(tagIds || [], tagMode);
    }

    if (favorite !== undefined) {
      performerInput.favorite = favorite;
    }

    return performerInput;
  }

  async function onSave() {
    setIsUpdating(true);
    try {
      await updatePerformers();
      Toast.success({
        content: intl.formatMessage(
          { id: "toast.updated_entity" },
          {
            entity: intl
              .formatMessage({ id: "performers" })
              .toLocaleLowerCase(),
          }
        ),
      });
      props.onClose(true);
    } catch (e) {
      Toast.error(e);
    }
    setIsUpdating(false);
  }

  function getTagIds(state: GQL.SlimPerformerDataFragment[]) {
    let ret: string[] = [];
    let first = true;

    state.forEach((performer: GQL.SlimPerformerDataFragment) => {
      if (first) {
        ret = performer.tags ? performer.tags.map((t) => t.id).sort() : [];
        first = false;
      } else {
        const tIds = performer.tags
          ? performer.tags.map((t) => t.id).sort()
          : [];

        if (!_.isEqual(ret, tIds)) {
          ret = [];
        }
      }
    });

    return ret;
  }

  function getRating(state: GQL.SlimPerformerDataFragment[]) {
    let ret: number | undefined;
    let first = true;

    state.forEach((performer) => {
      if (first) {
        ret = performer.rating ?? undefined;
        first = false;
      } else if (ret !== performer.rating) {
        ret = undefined;
      }
    });

    return ret;
  }

  useEffect(() => {
    const state = props.selected;
    let updateTagIds: string[] = [];
    let updateFavorite: boolean | undefined;
    let updateRating: number | undefined;
    let first = true;

    state.forEach((performer: GQL.SlimPerformerDataFragment) => {
      const performerTagIDs = (performer.tags ?? []).map((p) => p.id).sort();
      const performerRating = performer.rating;

      if (first) {
        updateTagIds = performerTagIDs;
        first = false;
        updateFavorite = performer.favorite;
        updateRating = performerRating ?? undefined;
      } else {
        if (!_.isEqual(performerTagIDs, updateTagIds)) {
          updateTagIds = [];
        }
        if (performer.favorite !== updateFavorite) {
          updateFavorite = undefined;
        }
        if (performerRating !== updateRating) {
          updateRating = undefined;
        }
      }
    });

    if (tagMode === GQL.BulkUpdateIdMode.Set) {
      setTagIds(updateTagIds);
    }
    setFavorite(updateFavorite);
    setRating(updateRating);
  }, [props.selected, tagMode]);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = favorite === undefined;
    }
  }, [favorite, checkboxRef]);

  function renderMultiSelect(
    type: "performers" | "tags",
    ids: string[] | undefined
  ) {
    let mode = GQL.BulkUpdateIdMode.Add;
    switch (type) {
      case "tags":
        mode = tagMode;
        break;
    }

    return (
      <MultiSet
        type={type}
        disabled={isUpdating}
        onUpdate={(items) => {
          const itemIDs = items.map((i) => i.id);
          switch (type) {
            case "tags":
              setTagIds(itemIDs);
              break;
          }
        }}
        onSetMode={(newMode) => {
          switch (type) {
            case "tags":
              setTagMode(newMode);
              break;
          }
        }}
        ids={ids ?? []}
        mode={mode}
      />
    );
  }

  function cycleFavorite() {
    if (favorite) {
      setFavorite(undefined);
    } else if (favorite === undefined) {
      setFavorite(false);
    } else {
      setFavorite(true);
    }
  }

  function render() {
    return (
      <Modal
        show
        icon="pencil-alt"
        header="Edit Performers"
        accept={{
          onClick: onSave,
          text: intl.formatMessage({ id: "actions.apply" }),
        }}
        cancel={{
          onClick: () => props.onClose(false),
          text: intl.formatMessage({ id: "actions.cancel" }),
          variant: "secondary",
        }}
        isRunning={isUpdating}
      >
        <Form.Group controlId="rating" as={Row}>
          {FormUtils.renderLabel({
            title: intl.formatMessage({ id: "rating" }),
          })}
          <Col xs={9}>
            <RatingStars
              value={rating}
              onSetRating={(value) => setRating(value)}
              disabled={isUpdating}
            />
          </Col>
        </Form.Group>
        <Form>
          <Form.Group controlId="tags">
            <Form.Label>
              <FormattedMessage id="tags" />
            </Form.Label>
            {renderMultiSelect("tags", tagIds)}
          </Form.Group>

          <Form.Group controlId="favorite">
            <Form.Check
              type="checkbox"
              label="Favorite"
              checked={favorite}
              ref={checkboxRef}
              onChange={() => cycleFavorite()}
            />
          </Form.Group>
        </Form>
      </Modal>
    );
  }

  return render();
};
