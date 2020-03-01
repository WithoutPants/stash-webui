import {
  Button,
  ButtonGroup,
  HTMLSelect,
  InputGroup,
  Menu,
  MenuItem,
  Popover,
  Tag,
  Tooltip,
  Slider,
} from "@blueprintjs/core";
import { debounce } from "lodash";
import React, { FunctionComponent, SyntheticEvent, useEffect, useState } from "react";
import { Criterion } from "../../models/list-filter/criteria/criterion";
import { ListFilterModel } from "../../models/list-filter/filter";
import { DisplayMode } from "../../models/list-filter/types";
import { AddFilter } from "./AddFilter";

interface IListFilterOperation {
  text: string;
  onClick: () => void;
}

interface IListFilterProps {
  onChangePageSize: (pageSize: number) => void;
  onChangeQuery: (query: string) => void;
  onChangeSortDirection: (sortDirection: "asc" | "desc") => void;
  onChangeSortBy: (sortBy: string) => void;
  onChangeDisplayMode: (displayMode: DisplayMode) => void;
  onAddCriterion: (criterion: Criterion, oldId?: string) => void;
  onRemoveCriterion: (criterion: Criterion) => void;
  zoomIndex?: number;
  onChangeZoom?: (zoomIndex: number) => void;
  onSelectAll?: () => void;
  onSelectNone?: () => void;
  otherOperations?: IListFilterOperation[];
  filter: ListFilterModel;
}

const PAGE_SIZE_OPTIONS = ["20", "40", "60", "120"];

export const ListFilter: FunctionComponent<IListFilterProps> = (props: IListFilterProps) => {
  let searchCallback: any;

  const [editingCriterion, setEditingCriterion] = useState<Criterion | undefined>(undefined);

  useEffect(() => {
    searchCallback = debounce((event: any) => {
      props.onChangeQuery(event.target.value);
    }, 500);
  });

  function onChangePageSize(event: SyntheticEvent<HTMLSelectElement>) {
    const val = event!.currentTarget!.value;
    props.onChangePageSize(parseInt(val, 10));
  }

  function onChangeQuery(event: SyntheticEvent<HTMLInputElement>) {
    event.persist();
    searchCallback(event);
  }

  function onChangeSortDirection(_: any) {
    if (props.filter.sortDirection === "asc") {
      props.onChangeSortDirection("desc");
    } else {
      props.onChangeSortDirection("asc");
    }
  }

  function onChangeSortBy(event: React.MouseEvent<any>) {
    props.onChangeSortBy(event.currentTarget.text);
  }

  function onChangeDisplayMode(displayMode: DisplayMode) {
    props.onChangeDisplayMode(displayMode);
  }

  function onAddCriterion(criterion: Criterion, oldId?: string) {
    props.onAddCriterion(criterion, oldId);
  }

  function onCancelAddCriterion() {
    setEditingCriterion(undefined);
  }

  let removedCriterionId = "";
  function onRemoveCriterionTag(criterion?: Criterion) {
    if (!criterion) { return; }
    setEditingCriterion(undefined);
    removedCriterionId = criterion.getId();
    props.onRemoveCriterion(criterion);
  }
  function onClickCriterionTag(criterion?: Criterion) {
    if (!criterion || removedCriterionId !== "") { return; }
    setEditingCriterion(criterion);
  }

  function renderSortByOptions() {
    return props.filter.sortByOptions.map((option) => (
      <MenuItem onClick={onChangeSortBy} text={option} key={option} />
    ));
  }

  function renderDisplayModeOptions() {
    function getIcon(option: DisplayMode) {
      switch (option) {
        case DisplayMode.Grid: return "grid-view";
        case DisplayMode.List: return "list";
        case DisplayMode.Wall: return "symbol-square";
      }
    }
    function getLabel(option: DisplayMode) {
      switch (option) {
        case DisplayMode.Grid: return "Grid";
        case DisplayMode.List: return "List";
        case DisplayMode.Wall: return "Wall";
      }
    }
    return props.filter.displayModeOptions.map((option) => (
      <Tooltip content={getLabel(option)} hoverOpenDelay={200}>
        <Button
          key={option}
          active={props.filter.displayMode === option}
          onClick={() => onChangeDisplayMode(option)}
          icon={getIcon(option)}
        />
      </Tooltip>
    ));
  }

  function renderFilterTags() {
    return props.filter.criteria.map((criterion) => (
      <Tag
        key={criterion.getId()}
        className="tag-item"
        itemID={criterion.getId()}
        interactive={true}
        onRemove={() => onRemoveCriterionTag(criterion)}
        onClick={() => onClickCriterionTag(criterion)}
      >
        {criterion.getLabel()}
      </Tag>
    ));
  }

  function onSelectAll() {
    if (props.onSelectAll) {
      props.onSelectAll();
    }
  }

  function onSelectNone() {
    if (props.onSelectNone) {
      props.onSelectNone();
    }
  }

  function renderSelectAll() {
    if (props.onSelectAll) {
      return <MenuItem onClick={() => onSelectAll()} text="Select All" />;
    }
  }

  function renderSelectNone() {
    if (props.onSelectNone) {
      return <MenuItem onClick={() => onSelectNone()} text="Select None" />;
    }
  }

  function renderMore() {
    let options = [];
    options.push(renderSelectAll());
    options.push(renderSelectNone());

    if (props.otherOperations) {
      props.otherOperations.forEach((o) => {
        options.push(<MenuItem onClick={o.onClick} text={o.text} />);
      });
    }

    options = options.filter((o) => !!o);

    let menuItems = options as JSX.Element[];

    function renderMoreOptions() {
      return (
        <>
        {menuItems}
        </>
      )
    }

    if (menuItems.length > 0) {
      return (
        <Popover position="bottom">
          <Button icon="more"/>
          <Menu>{renderMoreOptions()}</Menu>
        </Popover>
      );
    }
  }

  function onChangeZoom(v : number) {
    if (props.onChangeZoom) {
      props.onChangeZoom(v);
    }
  } 

  function maybeRenderZoom() {
    if (props.onChangeZoom) {
      return (
        <span className="zoom-slider">
          <Slider 
            min={0}
            value={props.zoomIndex}
            initialValue={props.zoomIndex}
            max={3}
            labelRenderer={false}
            onChange={(v) => onChangeZoom(v)}
          />
      </span>
      );
    }
  }

  function render() {
    return (
      <>
        <div className="filter-container">
          <InputGroup
            large={true}
            placeholder="Search..."
            defaultValue={props.filter.searchTerm}
            onChange={onChangeQuery}
            className="filter-item"
          />
          <HTMLSelect
            large={true}
            style={{flexBasis: "min-content"}}
            options={PAGE_SIZE_OPTIONS}
            onChange={onChangePageSize}
            value={props.filter.itemsPerPage}
            className="filter-item"
          />
          <ButtonGroup className="filter-item">
            <Popover position="bottom">
              <Button large={true}>{props.filter.sortBy}</Button>
              <Menu>{renderSortByOptions()}</Menu>
            </Popover>
            
            <Tooltip 
              content={props.filter.sortDirection === "asc" ? "Ascending" : "Descending"}
              hoverOpenDelay={200}
            >
              <Button
                rightIcon={props.filter.sortDirection === "asc" ? "caret-up" : "caret-down"}
                onClick={onChangeSortDirection}
              />
            </Tooltip>
            
          </ButtonGroup>

          <AddFilter
            filter={props.filter}
            onAddCriterion={onAddCriterion}
            onCancel={onCancelAddCriterion}
            editingCriterion={editingCriterion}
          />

          <ButtonGroup className="filter-item">
            {renderDisplayModeOptions()}
          </ButtonGroup>

          {maybeRenderZoom()}

          <ButtonGroup className="filter-item">
            {renderMore()}
          </ButtonGroup>
        </div>
        <div style={{display: "flex", justifyContent: "center", margin: "10px auto"}}>
          {renderFilterTags()}
        </div>
      </>
    );
  }

  return render();
};
