import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import Mousetrap from "mousetrap";
import { Icon, FilterSelect, DurationInput } from "src/components/Shared";
import { CriterionModifier } from "src/core/generated-graphql";
import {
  DurationCriterion,
  CriterionValue,
  Criterion,
} from "src/models/list-filter/criteria/criterion";
import { NoneCriterion } from "src/models/list-filter/criteria/none";
import { makeCriteria } from "src/models/list-filter/criteria/factory";
import { ListFilterOptions } from "src/models/list-filter/filter-options";
import { useIntl } from "react-intl";
import { CriterionType } from "src/models/list-filter/types";

interface IAddFilterProps {
  onAddCriterion: (
    criterion: Criterion<CriterionValue>,
    oldId?: string
  ) => void;
  onCancel: () => void;
  filterOptions: ListFilterOptions;
  editingCriterion?: Criterion<CriterionValue>;
}

export const AddFilter: React.FC<IAddFilterProps> = (
  props: IAddFilterProps
) => {
  const defaultValue = useRef<string | number | undefined>();

  const [isOpen, setIsOpen] = useState(false);
  const [criterion, setCriterion] = useState<Criterion<CriterionValue>>(
    new NoneCriterion()
  );

  const valueStage = useRef<CriterionValue>(criterion.value);

  const intl = useIntl();

  // configure keyboard shortcuts
  useEffect(() => {
    Mousetrap.bind("f", () => setIsOpen(true));

    return () => {
      Mousetrap.unbind("f");
    };
  });

  // Configure if we are editing an existing criterion
  useEffect(() => {
    if (!props.editingCriterion) {
      return;
    }
    setIsOpen(true);
    setCriterion(props.editingCriterion);
  }, [props.editingCriterion]);

  function onChangedCriteriaType(event: React.ChangeEvent<HTMLSelectElement>) {
    const newCriterionType = event.target.value as CriterionType;
    const newCriterion = makeCriteria(newCriterionType);
    setCriterion(newCriterion);
  }

  function onChangedModifierSelect(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const newCriterion = _.cloneDeep(criterion);
    newCriterion.modifier = event.target.value as CriterionModifier;
    setCriterion(newCriterion);
  }

  function onChangedSingleSelect(event: React.ChangeEvent<HTMLSelectElement>) {
    const newCriterion = _.cloneDeep(criterion);
    newCriterion.value = event.target.value;
    setCriterion(newCriterion);
  }

  function onChangedInput(event: React.ChangeEvent<HTMLInputElement>) {
    valueStage.current = event.target.value;
  }

  function onChangedDuration(valueAsNumber: number) {
    valueStage.current = valueAsNumber;
    onBlurInput();
  }

  function onBlurInput() {
    const newCriterion = _.cloneDeep(criterion);
    newCriterion.value = valueStage.current;
    setCriterion(newCriterion);
  }

  function onAddFilter() {
    if (!Array.isArray(criterion.value) && defaultValue.current !== undefined) {
      const value = defaultValue.current;
      if (
        criterion.options &&
        (value === undefined || value === "" || typeof value === "number")
      ) {
        criterion.value = criterion.options[0].toString();
      } else if (typeof value === "number" && value === undefined) {
        criterion.value = 0;
      } else if (value === undefined) {
        criterion.value = "";
      }
    }
    const oldId = props.editingCriterion
      ? props.editingCriterion.getId()
      : undefined;
    props.onAddCriterion(criterion, oldId);
    onToggle();
  }

  function onToggle() {
    if (isOpen) {
      props.onCancel();
    }
    setIsOpen(!isOpen);
    setCriterion(makeCriteria());
  }

  const maybeRenderFilterPopoverContents = () => {
    if (criterion.criterionOption.value === "none") {
      return;
    }

    function renderModifier() {
      if (criterion.modifierOptions.length === 0) {
        return;
      }
      return (
        <Form.Control
          as="select"
          onChange={onChangedModifierSelect}
          value={criterion.modifier}
          className="btn-secondary"
        >
          {criterion.modifierOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Form.Control>
      );
    }

    function renderSelect() {
      // Hide the value select if the modifier is "IsNull" or "NotNull"
      if (
        criterion.modifier === CriterionModifier.IsNull ||
        criterion.modifier === CriterionModifier.NotNull
      ) {
        return;
      }

      if (Array.isArray(criterion.value)) {
        if (
          criterion.criterionOption.value !== "performers" &&
          criterion.criterionOption.value !== "studios" &&
          criterion.criterionOption.value !== "parent_studios" &&
          criterion.criterionOption.value !== "tags" &&
          criterion.criterionOption.value !== "sceneTags" &&
          criterion.criterionOption.value !== "performerTags" &&
          criterion.criterionOption.value !== "movies"
        )
          return;

        return (
          <FilterSelect
            type={criterion.criterionOption.value}
            isMulti
            onSelect={(items) => {
              const newCriterion = _.cloneDeep(criterion);
              newCriterion.value = items.map((i) => ({
                id: i.id,
                label: i.name!,
              }));
              setCriterion(newCriterion);
            }}
            ids={criterion.value.map((labeled) => labeled.id)}
          />
        );
      }
      if (criterion.options) {
        defaultValue.current = criterion.value;
        return (
          <Form.Control
            as="select"
            onChange={onChangedSingleSelect}
            value={criterion.value.toString()}
            className="btn-secondary"
          >
            {criterion.options.map((c) => (
              <option key={c.toString()} value={c.toString()}>
                {c}
              </option>
            ))}
          </Form.Control>
        );
      }
      if (criterion instanceof DurationCriterion) {
        // render duration control
        return (
          <DurationInput
            numericValue={criterion.value ? criterion.value : 0}
            onValueChange={onChangedDuration}
          />
        );
      }
      return (
        <Form.Control
          className="btn-secondary"
          type={criterion.inputType}
          onChange={onChangedInput}
          onBlur={onBlurInput}
          defaultValue={criterion.value ? criterion.value.toString() : ""}
        />
      );
    }
    return (
      <>
        <Form.Group>{renderModifier()}</Form.Group>
        <Form.Group>{renderSelect()}</Form.Group>
      </>
    );
  };

  function maybeRenderFilterSelect() {
    if (props.editingCriterion) {
      return;
    }

    const options = props.filterOptions.criterionOptions
      .map((c) => {
        return {
          value: c.value,
          text: intl.formatMessage({ id: c.messageID }),
        };
      })
      .sort((a, b) => a.text.localeCompare(b.text));

    return (
      <Form.Group controlId="filter">
        <Form.Label>Filter</Form.Label>
        <Form.Control
          as="select"
          onChange={onChangedCriteriaType}
          value={criterion.criterionOption.value}
          className="btn-secondary"
        >
          {options.map((c) => (
            <option key={c.value} value={c.value}>
              {c.text}
            </option>
          ))}
        </Form.Control>
      </Form.Group>
    );
  }

  const title = !props.editingCriterion ? "Add Filter" : "Update Filter";
  return (
    <>
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="filter-tooltip">Filter</Tooltip>}
      >
        <Button variant="secondary" onClick={() => onToggle()} active={isOpen}>
          <Icon icon="filter" />
        </Button>
      </OverlayTrigger>

      <Modal show={isOpen} onHide={() => onToggle()}>
        <Modal.Header>{title}</Modal.Header>
        <Modal.Body>
          <div className="dialog-content">
            {maybeRenderFilterSelect()}
            {maybeRenderFilterPopoverContents()}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={onAddFilter}
            disabled={criterion.criterionOption.value === "none"}
          >
            {title}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
